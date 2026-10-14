<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMateriaRequest;
use App\Http\Requests\UpdateMateriaRequest;
use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\LogAuditoria;
use App\Models\Materia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MateriaController extends Controller
{
    /**
     * Listar materias con búsqueda y paginación opcional
     */
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');

        // Cachear cuando piden el catálogo completo (?all=1 o ?all=true) sin búsqueda
        if ($request->boolean('all') && empty($search)) {
            $materias = Cache::remember('catalogo_materias_all', 600, function () {
                return Materia::orderBy('nombre', 'asc')->get();
            });
            return response()->json($materias);
        }

        $query = Materia::query();

        if ($search) {
            $query->where('nombre', 'ilike', "%{$search}%");
        }

        if ($request->boolean('all')) {
            return response()->json($query->orderBy('nombre', 'asc')->get());
        }

        $perPage = (int) $request->query('per_page', 10);

        return response()->json($query->orderBy('nombre', 'asc')->paginate($perPage));
    }

    /**
     * Crear una materia (Admin y Docente)
     */
    public function store(StoreMateriaRequest $request): JsonResponse
    {
        $data = $request->validated();
        $materia = Materia::create($data);

        Cache::forget('catalogo_materias_all');

        $this->registrarAuditoria($request, 'MATERIA_CREADA', [
            'materia_id' => $materia->id,
            'nombre'     => $materia->nombre,
        ]);

        return response()->json([
            'message' => 'Materia creada exitosamente.',
            'materia' => $materia,
        ], 201);
    }

    /**
     * Ver detalle de una materia con la cantidad de exámenes relacionados
     */
    public function show(string $id): JsonResponse
    {
        $materia = Materia::withCount('examenes')->find($id);

        if (!$materia) {
            return response()->json(['message' => 'Materia no encontrada.'], 404);
        }

        return response()->json($materia);
    }

    /**
     * Actualizar una materia
     */
    public function update(UpdateMateriaRequest $request, string $id): JsonResponse
    {
        $materia = Materia::find($id);

        if (!$materia) {
            return response()->json(['message' => 'Materia no encontrada.'], 404);
        }

        $data = $request->validated();
        $materia->update($data);

        Cache::forget('catalogo_materias_all');

        $this->registrarAuditoria($request, 'MATERIA_ACTUALIZADA', [
            'materia_id'          => $materia->id,
            'campos_actualizados' => array_keys($data),
        ]);

        return response()->json([
            'message' => 'Materia actualizada exitosamente.',
            'materia' => $materia,
        ]);
    }

    /**
     * Eliminar materia evitando romper integridad referencial
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $materia = Materia::withCount('examenes')->find($id);

        if (!$materia) {
            return response()->json(['message' => 'Materia no encontrada.'], 404);
        }

        if ($materia->examenes_count > 0) {
            return response()->json([
                'message' => 'No se puede eliminar la materia porque tiene exámenes asociados.',
            ], 422);
        }

        $detalles = [
            'materia_id' => $materia->id,
            'nombre'     => $materia->nombre,
        ];

        $materia->delete();

        Cache::forget('catalogo_materias_all');

        $this->registrarAuditoria($request, 'MATERIA_ELIMINADA', $detalles);

        return response()->json(['message' => 'Materia eliminada exitosamente.']);
    }

    /**
     * Registra el evento en logs_auditoria con el esquema centralizado.
     */
    private function registrarAuditoria(Request $request, string $accion, array $detalles = []): void
    {
        $user = $request->user();

        $rol = match (get_class($user)) {
            Admin::class    => 'admin',
            Docente::class  => 'docente',
            Auxiliar::class => 'auxiliar',
            default         => 'desconocido',
        };

        $nombreCompleto = trim("{$user->nombre} {$user->apellido_paterno} {$user->apellido_materno}");

        LogAuditoria::create([
            'user_type'         => get_class($user),
            'user_id'           => $user->id,
            'rol_en_el_momento' => $rol,
            'usuario_nombre'    => $nombreCompleto !== '' ? $nombreCompleto : $user->nombre,
            'usuario_email'     => $user->email ?? null,
            'modulo'            => 'MATERIAS',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}