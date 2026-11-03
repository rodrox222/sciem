<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Aula;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\LogAuditoria;
use App\Models\Materia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AuditoriaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = LogAuditoria::query()
            ->orderBy('created_at', 'desc');

        if ($request->filled('usuario_id')) {
            $query->where('user_id', $request->usuario_id);
        }

        if ($request->filled('rol')) {
            $query->where('rol_en_el_momento', strtolower($request->rol));
        }

        if ($request->filled('accion')) {
            $query->where('accion', $request->accion);
        }

        if ($request->filled('modulo')) {
            $query->where('modulo', $request->modulo);
        }

        if ($request->filled('fecha_desde')) {
            $query->whereDate('created_at', '>=', $request->fecha_desde);
        }

        if ($request->filled('fecha_hasta')) {
            $query->whereDate('created_at', '<=', $request->fecha_hasta);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('usuario_nombre', 'ilike', "%{$search}%")
                  ->orWhere('usuario_email', 'ilike', "%{$search}%")
                  ->orWhere('ip_origen', 'ilike', "%{$search}%");
            });
        }

        $perPage = (int) $request->input('per_page', 20);

        return response()->json($query->paginate($perPage));
    }

    /**
     * POST /api/auditoria/{id}/revertir
     * Revierte de forma compensatoria el cambio registrado en el log.
     */
    public function revertir(Request $request, int $id): JsonResponse
    {
        $logOriginal = LogAuditoria::findOrFail($id);
        $detalles = $logOriginal->detalles ?? [];

        // 1. Validar que el log contenga la información requerida para revertir
        if (empty($detalles['valores_anteriores']) || empty($detalles['target_type'])) {
            return response()->json([
                'message' => 'Esta acción no admite reversión o no contiene un estado anterior registrado.'
            ], 422);
        }

        // 2. Evitar revertir una reversión previa en bucle
        if ($logOriginal->accion === 'REVERSION_EJECUTADA') {
            return response()->json([
                'message' => 'No se puede revertir una operación de reversión.'
            ], 422);
        }

        $targetType = $detalles['target_type'];
        $targetId   = $detalles['target_id'] ?? null;
        $valoresAnteriores = $detalles['valores_anteriores'];

        // Sanitizar booleanos para compatibilidad con PostgreSQL / Pooler
        foreach ($valoresAnteriores as $campo => $valor) {
            if (is_bool($valor)) {
                $valoresAnteriores[$campo] = $valor ? DB::raw('true') : DB::raw('false');
            }
        }

        DB::beginTransaction();
        try {
            // 3. Ejecutar la acción compensatoria según la entidad objetivo
            $this->aplicarReversion($targetType, $targetId, $valoresAnteriores, $detalles);

            // 4. Registrar el nuevo evento compensatorio en la auditoría
            $actor = $request->user();
            $nombreActor = $actor ? trim("{$actor->nombre} {$actor->apellido_paterno}") : 'Sistema';
            $rolActor = $actor ? strtolower(class_basename($actor)) : 'admin';

            LogAuditoria::create([
                'user_type'         => $actor ? get_class($actor) : null,
                'user_id'           => $actor?->id,
                'rol_en_el_momento' => $rolActor,
                'usuario_nombre'    => $nombreActor,
                'usuario_email'     => $actor?->email ?? ($actor ? $actor->ci : null),
                'modulo'            => $logOriginal->modulo ?? 'Auditoría',
                'accion'            => 'REVERSION_EJECUTADA',
                'ip_origen'         => $request->ip(),
                'user_agent'        => $request->userAgent(),
                'detalles'          => [
                    'log_revertido_id'    => $logOriginal->id,
                    'accion_revertida'    => $logOriginal->accion,
                    'target_type'         => $targetType,
                    'target_id'           => $targetId,
                    'valores_restaurados' => $detalles['valores_anteriores'],
                ],
            ]);

            DB::commit();

            return response()->json([
                'message' => 'La acción ha sido revertida exitosamente al estado anterior.',
                'log_id'  => $logOriginal->id,
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("Error al revertir log #{$id}: " . $e->getMessage());

            return response()->json([
                'message' => 'No se pudo aplicar la reversión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Aplica los valores anteriores a la tabla correspondiente.
     */
    private function aplicarReversion(string $targetType, $targetId, array $valores, array $contexto): void
    {
        switch ($targetType) {
            case 'estudiante_examen':
                $idExamen = $contexto['id_examen'] ?? null;
                $idEstudiante = $contexto['id_estudiante'] ?? $targetId;

                $query = DB::table('estudiante_examen');
                if ($idExamen) {
                    $query->where('id_examen', $idExamen);
                }
                $query->where('id_estudiante', $idEstudiante)
                      ->update(array_merge($valores, ['updated_at' => now()]));
                break;

            case 'estudiante_prerrequisito':
                $idPrerrequisito = $contexto['id_prerrequisito'] ?? null;
                $idEstudiante = $contexto['id_estudiante'] ?? $targetId;

                DB::table('estudiante_prerrequisito')
                    ->where('id_prerrequisito', $idPrerrequisito)
                    ->where('id_estudiante', $idEstudiante)
                    ->update(array_merge($valores, ['updated_at' => now()]));
                break;

            case 'docente':
                Docente::where('id', $targetId)->update($valores);
                break;

            case 'auxiliar':
                Auxiliar::where('id', $targetId)->update($valores);
                break;

            case 'admin':
                Admin::where('id', $targetId)->update($valores);
                break;

            case 'examen':
                Examen::where('id', $targetId)->update($valores);
                break;

            case 'aula':
                Aula::where('id', $targetId)->update($valores);
                break;

            case 'materia':
                Materia::where('id', $targetId)->update($valores);
                break;

            default:
                throw new \InvalidArgumentException("La entidad '{$targetType}' no tiene configurado un mecanismo de reversión.");
        }
    }
}