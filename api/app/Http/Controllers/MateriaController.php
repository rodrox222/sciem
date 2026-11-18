<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMateriaRequest;
use App\Http\Requests\UpdateMateriaRequest;
use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Examen;
use App\Models\LogAuditoria;
use App\Models\Materia;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MateriaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $incluirInactivas = $request->boolean('incluir_inactivas');
        $activoParam = $request->query('activo');
        $user = $request->user();

        // Si se solicitan materias del docente autenticado
        if ($request->boolean('mis_materias') || ($request->boolean('para_examen') && $user instanceof Docente)) {
            if ($user instanceof Docente) {
                $queryDocente = $user->materias()->orderBy('nombre', 'asc');
                if (!$incluirInactivas) {
                    $queryDocente->whereRaw('materias.activo is true');
                }
                if ($search) {
                    $queryDocente->where('materias.nombre', 'ilike', "%{$search}%");
                }
                return response()->json($queryDocente->get());
            }
        }

        if ($request->boolean('all') && empty($search)) {
            $cacheKey = $incluirInactivas ? 'catalogo_materias_todas' : 'catalogo_materias_all';
            $materias = Cache::remember($cacheKey, 600, function () use ($incluirInactivas) {
                $q = Materia::orderBy('nombre', 'asc');
                if (!$incluirInactivas) {
                    $q->whereRaw('activo is true');
                }
                return $q->get();
            });
            return response()->json($materias);
        }

        $query = Materia::query();

        if ($activoParam !== null && $activoParam !== '') {
            $activoVal = filter_var($activoParam, FILTER_VALIDATE_BOOLEAN);
            $query->where('activo', $activoVal);
        } elseif (!$incluirInactivas) {
            $query->whereRaw('activo is true');
        }

        if ($search) {
            $query->where('nombre', 'ilike', "%{$search}%");
        }

        if ($request->boolean('all')) {
            return response()->json($query->orderBy('nombre', 'asc')->get());
        }

        $perPage = (int) $request->query('per_page', 10);

        return response()->json($query->orderBy('nombre', 'asc')->paginate($perPage));
    }

    public function store(StoreMateriaRequest $request): JsonResponse
    {
        $data = $request->validated();
        $materia = Materia::create($data);

        Cache::forget('catalogo_materias_all');

        $this->registrarAuditoria($request, 'MATERIA_CREADA', [
            'target_type' => 'materia',
            'target_id'   => $materia->id,
            'nombre'      => $materia->nombre,
        ]);

        return response()->json([
            'message' => 'Materia creada exitosamente.',
            'materia' => $materia,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $materia = Materia::withCount('examenes')->find($id);

        if (!$materia) {
            return response()->json(['message' => 'Materia no encontrada.'], 404);
        }

        return response()->json($materia);
    }

    public function update(UpdateMateriaRequest $request, string $id): JsonResponse
    {
        $materia = Materia::find($id);

        if (!$materia) {
            return response()->json(['message' => 'Materia no encontrada.'], 404);
        }

        $data = $request->validated();
        $camposAfectados = array_keys($data);
        $valoresAnteriores = $materia->only($camposAfectados);

        $materia->update($data);

        Cache::forget('catalogo_materias_all');

        $this->registrarAuditoria($request, 'MATERIA_ACTUALIZADA', [
            'target_type'         => 'materia',
            'target_id'           => $materia->id,
            'campos_actualizados' => $camposAfectados,
            'valores_anteriores'  => $valoresAnteriores,
            'valores_nuevos'      => $data,
        ]);

        return response()->json([
            'message' => 'Materia actualizada exitosamente.',
            'materia' => $materia,
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $materia = Materia::find($id);

        if (!$materia) {
            return response()->json(['message' => 'Materia no encontrada.'], 404);
        }

        $ahora = Carbon::now('America/La_Paz');
        $tieneExamenesPendientes = Examen::where('id_materia', $materia->id)
            ->whereIn('estado', ['Programado', 'En proceso'])
            ->where(function ($q) use ($ahora) {
                $q->where('fecha', '>', $ahora->toDateString())
                  ->orWhere(function ($sub) use ($ahora) {
                      $sub->where('fecha', $ahora->toDateString())
                          ->where('hora_fin', '>=', $ahora->toTimeString());
                  });
            })
            ->exists();

        if ($tieneExamenesPendientes) {
            return response()->json([
                'message' => 'No se puede desactivar la materia porque tiene exámenes programados pendientes o en curso.',
            ], 422);
        }

        $detalles = [
            'target_type' => 'materia',
            'target_id'   => $materia->id,
            'nombre'      => $materia->nombre,
            'valores_anteriores' => ['activo' => filter_var($materia->activo, FILTER_VALIDATE_BOOLEAN)],
            'valores_nuevos'     => ['activo' => false],
        ];

        // Borrado lógico: desactivar
        $materia->update(['activo' => false]);

        Cache::forget('catalogo_materias_all');
        Cache::forget('catalogo_materias_todas');

        $this->registrarAuditoria($request, 'MATERIA_DESACTIVADA', $detalles);

        return response()->json(['message' => 'Materia desactivada exitosamente.']);
    }

    /**
     * Reactivar una materia desactivada.
     */
    public function reactivar(Request $request, string $id): JsonResponse
    {
        $materia = Materia::find($id);

        if (!$materia) {
            return response()->json(['message' => 'Materia no encontrada.'], 404);
        }

        $materia->update(['activo' => true]);

        Cache::forget('catalogo_materias_all');
        Cache::forget('catalogo_materias_todas');

        $this->registrarAuditoria($request, 'MATERIA_REACTIVADA', [
            'target_type' => 'materia',
            'target_id'   => $materia->id,
            'nombre'      => $materia->nombre,
        ]);

        return response()->json([
            'message' => 'Materia reactivada exitosamente.',
            'materia' => $materia,
        ]);
    }

    /**
     * Eliminación permanente física de una materia (únicamente si no tiene exámenes asociados).
     */
    public function forceDelete(Request $request, string $id): JsonResponse
    {
        $materia = Materia::find($id);

        if (!$materia) {
            return response()->json(['message' => 'Materia no encontrada.'], 404);
        }

        $tieneExamenes = Examen::where('id_materia', $materia->id)->exists();
        if ($tieneExamenes) {
            return response()->json([
                'message' => 'No se puede eliminar permanentemente la materia porque cuenta con historial de exámenes asociados. Solo puede mantenerse desactivada.',
            ], 422);
        }

        $detalles = [
            'target_type' => 'materia',
            'target_id'   => $materia->id,
            'nombre'      => $materia->nombre,
        ];

        $materia->delete();

        Cache::forget('catalogo_materias_all');
        Cache::forget('catalogo_materias_todas');

        $this->registrarAuditoria($request, 'MATERIA_ELIMINADA_DEFINITIVAMENTE', $detalles);

        return response()->json(['message' => 'Materia eliminada permanentemente del sistema.']);
    }

    private function registrarAuditoria(Request $request, string $accion, array $detalles = []): void
    {
        $user = $request->user();

        $rol = match ($user ? get_class($user) : null) {
            Admin::class    => 'admin',
            Docente::class  => 'docente',
            Auxiliar::class => 'auxiliar',
            default         => 'desconocido',
        };

        $nombreCompleto = $user ? trim("{$user->nombre} {$user->apellido_paterno} {$user->apellido_materno}") : 'Sistema';

        LogAuditoria::create([
            'user_type'         => $user ? get_class($user) : null,
            'user_id'           => $user?->id,
            'rol_en_el_momento' => $rol,
            'usuario_nombre'    => $nombreCompleto !== '' ? $nombreCompleto : ($user?->nombre ?? 'Sistema'),
            'usuario_email'     => $user?->email ?? null,
            'modulo'            => 'MATERIAS',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}