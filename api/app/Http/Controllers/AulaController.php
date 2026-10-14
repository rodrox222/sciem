<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAulaRequest;
use App\Http\Requests\UpdateAulaRequest;
use App\Models\Admin;
use App\Models\Aula;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\LogAuditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AulaController extends Controller
{
    /**
     * Listar aulas con filtros opcionales (búsqueda, estado) y paginación.
     */
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $estado = $request->query('estado');
        $perPage = (int) $request->query('per_page', 10);

        // Cachear catálogo de selector (disponibles en lote)
        if ($estado === 'Disponible' && $perPage >= 50 && !$search) {
            $aulas = Cache::remember('catalogo_aulas_disponibles', 300, function () use ($perPage) {
                return Aula::where('estado', 'Disponible')->orderBy('nombre', 'asc')->paginate($perPage);
            });
            return response()->json($aulas);
        }

        $query = Aula::query();
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'ilike', "%{$search}%")
                  ->orWhere('ubicacion', 'ilike', "%{$search}%");
            });
        }
        if ($estado) {
            $query->where('estado', $estado);
        }

        return response()->json($query->orderBy('nombre', 'asc')->paginate($perPage));
    }

    /**
     * Registrar una nueva aula.
     */
    public function store(StoreAulaRequest $request): JsonResponse
    {
        $data = $request->validated();
        $aula = Aula::create($data);

        $this->registrarAuditoria($request, 'AULA_CREADA', [
            'aula_id'   => $aula->id,
            'nombre'    => $aula->nombre,
            'capacidad' => $aula->capacidad,
        ]);

        return response()->json([
            'message' => 'Aula creada exitosamente.',
            'aula'    => $aula,
        ], 201);
    }

    /**
     * Obtener el detalle de un aula por UUID.
     */
    public function show(string $id): JsonResponse
    {
        $aula = Aula::find($id);

        if (!$aula) {
            return response()->json(['message' => 'Aula no encontrada.'], 404);
        }

        return response()->json($aula);
    }

    /**
     * Actualizar los datos de un aula.
     */
    public function update(UpdateAulaRequest $request, string $id): JsonResponse
    {
        $aula = Aula::find($id);

        if (!$aula) {
            return response()->json(['message' => 'Aula no encontrada.'], 404);
        }

        $data = $request->validated();
        $aula->update($data);

        $this->registrarAuditoria($request, 'AULA_ACTUALIZADA', [
            'aula_id'             => $aula->id,
            'campos_actualizados' => array_keys($data),
        ]);

        return response()->json([
            'message' => 'Aula actualizada exitosamente.',
            'aula'    => $aula,
        ]);
    }

    /**
     * Eliminar un aula.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $aula = Aula::find($id);

        if (!$aula) {
            return response()->json(['message' => 'Aula no encontrada.'], 404);
        }

        $detalles = [
            'aula_id' => $aula->id,
            'nombre'  => $aula->nombre,
        ];

        $aula->delete();

        $this->registrarAuditoria($request, 'AULA_ELIMINADA', $detalles);

        return response()->json(['message' => 'Aula eliminada exitosamente.']);
    }

    /**
     * Registra el evento en logs_auditoria con todos los campos requeridos por el modelo.
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
            'user_type'          => get_class($user),
            'user_id'            => $user->id,
            'rol_en_el_momento'  => $rol,
            'usuario_nombre'     => $nombreCompleto !== '' ? $nombreCompleto : $user->nombre,
            'usuario_email'      => $user->email ?? null,
            'modulo'             => 'AULAS',
            'accion'             => $accion,
            'ip_origen'          => $request->ip() ?? '127.0.0.1',
            'user_agent'         => $request->userAgent(),
            'detalles'           => $detalles,
        ]);
    }
}