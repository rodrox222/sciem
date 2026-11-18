<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAulaRequest;
use App\Http\Requests\UpdateAulaRequest;
use App\Models\Admin;
use App\Models\Aula;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Examen;
use App\Models\LogAuditoria;
use Carbon\Carbon;
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
        if ($estado === 'Inactiva' || $estado === 'Desactivado' || $estado === 'Desactivada') {
            $query->where(function ($q) {
                $q->where('estado', 'Inactiva')->orWhereRaw('activo is false');
            });
        } elseif ($estado) {
            $query->where('estado', $estado)->whereRaw('activo is true');
        } elseif (!$request->boolean('incluir_inactivas')) {
            $query->where('estado', '!=', 'Inactiva')->whereRaw('activo is true');
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

        Cache::forget('catalogo_aulas_disponibles');

        $this->registrarAuditoria($request, 'AULA_CREADA', [
            'target_type' => 'aula',
            'target_id'   => $aula->id,
            'nombre'      => $aula->nombre,
            'capacidad'   => $aula->capacidad,
            'ubicacion'   => $aula->ubicacion,
            'estado'      => $aula->estado,
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
     * Actualizar los datos de un aula con snapshot para soporte de reversión.
     */
    public function update(UpdateAulaRequest $request, string $id): JsonResponse
    {
        $aula = Aula::find($id);

        if (!$aula) {
            return response()->json(['message' => 'Aula no encontrada.'], 404);
        }

        $data = $request->validated();

        // Extraer únicamente los campos modificados para el snapshot anterior
        $camposAfectados = array_keys($data);
        $valoresAnteriores = $aula->only($camposAfectados);

        $aula->update($data);

        Cache::forget('catalogo_aulas_disponibles');

        $this->registrarAuditoria($request, 'AULA_ACTUALIZADA', [
            'target_type'         => 'aula',
            'target_id'           => $aula->id,
            'campos_actualizados' => $camposAfectados,
            'valores_anteriores'  => $valoresAnteriores,
            'valores_nuevos'      => $data,
        ]);

        return response()->json([
            'message' => 'Aula actualizada exitosamente.',
            'aula'    => $aula,
        ]);
    }

    /**
     * Desactivar un aula (borrado lógico).
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $aula = Aula::find($id);

        if (!$aula) {
            return response()->json(['message' => 'Aula no encontrada.'], 404);
        }

        $ahora = Carbon::now('America/La_Paz');
        $tieneExamenesPendientes = Examen::where('id_aula', $aula->id)
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
                'message' => 'No se puede desactivar el ambiente porque tiene exámenes programados pendientes o en curso.',
            ], 422);
        }

        $detalles = [
            'target_type'        => 'aula',
            'target_id'          => $aula->id,
            'nombre'             => $aula->nombre,
            'ubicacion'          => $aula->ubicacion,
            'capacidad'          => $aula->capacidad,
            'valores_anteriores' => ['estado' => $aula->estado],
            'valores_nuevos'     => ['estado' => 'Inactiva'],
        ];

        $aula->update([
            'estado' => 'Inactiva',
            'activo' => false,
        ]);

        Cache::forget('catalogo_aulas_disponibles');

        $this->registrarAuditoria($request, 'AULA_DESACTIVADA', $detalles);

        return response()->json(['message' => 'Ambiente desactivado exitosamente.']);
    }

    /**
     * Reactivar un aula desactivada.
     */
    public function reactivar(Request $request, string $id): JsonResponse
    {
        $aula = Aula::find($id);

        if (!$aula) {
            return response()->json(['message' => 'Ambiente no encontrado.'], 404);
        }

        $aula->update([
            'estado' => 'Disponible',
            'activo' => true,
        ]);

        Cache::forget('catalogo_aulas_disponibles');

        $this->registrarAuditoria($request, 'AULA_REACTIVADA', [
            'target_type' => 'aula',
            'target_id'   => $aula->id,
            'nombre'      => $aula->nombre,
        ]);

        return response()->json([
            'message' => 'Ambiente reactivado exitosamente.',
            'aula'    => $aula,
        ]);
    }

    /**
     * Eliminación permanente física de un aula (únicamente si no tiene historial).
     */
    public function forceDelete(Request $request, string $id): JsonResponse
    {
        $aula = Aula::find($id);

        if (!$aula) {
            return response()->json(['message' => 'Ambiente no encontrado.'], 404);
        }

        // Verificar si tiene exámenes históricos o dependencias asociadas
        $tieneExamenes = Examen::where('id_aula', $aula->id)->exists();
        if ($tieneExamenes) {
            return response()->json([
                'message' => 'No se puede eliminar permanentemente el ambiente porque cuenta con historial de evaluaciones asociadas. Solo puede mantenerse desactivado.',
            ], 422);
        }

        $detalles = [
            'target_type' => 'aula',
            'target_id'   => $aula->id,
            'nombre'      => $aula->nombre,
            'ubicacion'   => $aula->ubicacion,
            'capacidad'   => $aula->capacidad,
        ];

        $aula->delete();

        Cache::forget('catalogo_aulas_disponibles');

        $this->registrarAuditoria($request, 'AULA_ELIMINADA_DEFINITIVAMENTE', $detalles);

        return response()->json(['message' => 'Ambiente eliminado permanentemente del sistema.']);
    }

    /**
     * Registra el evento en logs_auditoria con todos los campos requeridos por el modelo.
     */
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
            'modulo'            => 'AULAS',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}