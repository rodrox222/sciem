<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePrerrequisitoRequest;
use App\Http\Requests\ToggleCumplimientoRequest;
use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\LogAuditoria;
use App\Models\PrerrequisitoExamen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PrerrequisitoController extends Controller
{
    public function index(string $examenId): JsonResponse
    {
        $examen = Examen::with('prerrequisitos')->findOrFail($examenId);
        return response()->json($examen->prerrequisitos);
    }

    public function store(StorePrerrequisitoRequest $request, string $examenId): JsonResponse
    {
        $examen = Examen::findOrFail($examenId);

        $prerrequisito = DB::transaction(function () use ($request, $examen) {
            $nuevo = $examen->prerrequisitos()->create($request->validated());

            // Regla: si se agrega un nuevo prerrequisito, los estudiantes sin ajuste manual pasan a Inhabilitado
            DB::table('estudiante_examen')
                ->where('id_examen', $examen->id)
                ->whereRaw('ajuste_manual is false')
                ->update([
                    'estado'     => 'Inhabilitado',
                    'updated_at' => now(),
                ]);

            return $nuevo;
        });

        $this->registrarAuditoria($request, 'PRERREQUISITO_CREADO', [
            'target_type' => 'prerrequisitos_examen',
            'target_id'   => $prerrequisito->id,
            'id_examen'   => $examen->id,
            'titulo'      => $prerrequisito->titulo,
        ]);

        return response()->json([
            'message'       => 'Prerrequisito creado. Se ha actualizado el estado de los alumnos.',
            'prerrequisito' => $prerrequisito,
        ], 201);
    }

    public function toggleCumplimiento(ToggleCumplimientoRequest $request, string $prerrequisitoId, string $estudianteId): JsonResponse
    {
        $prerrequisito = PrerrequisitoExamen::findOrFail($prerrequisitoId);
        
        $user = $request->user();
        $docenteId = null;
        if ($user) {
            if ($user instanceof Docente) {
                $docenteId = $user->id;
            } elseif (Docente::where('id', $user->id)->exists()) {
                $docenteId = $user->id;
            }
        }

        $cumplido = (bool) $request->input('cumplido');

        // Snapshot del estado previo del prerrequisito para la auditoría de reversión
        $registroPrevio = DB::table('estudiante_prerrequisito')
            ->where('id_prerrequisito', $prerrequisitoId)
            ->where('id_estudiante', $estudianteId)
            ->first();

        $cumplidoAnterior = $registroPrevio 
            ? filter_var($registroPrevio->cumplido, FILTER_VALIDATE_BOOLEAN)
            : false;

        DB::transaction(function () use ($prerrequisito, $estudianteId, $cumplido, $docenteId, $cumplidoAnterior, $request) {
            $prerrequisito->estudiantes()->syncWithoutDetaching([
                $estudianteId => [
                    'cumplido'                => $cumplido ? DB::raw('true') : DB::raw('false'),
                    'fecha_cumplimiento'      => $cumplido ? now() : null,
                    'revisado_por_docente_id' => $docenteId,
                    'updated_at'              => now(),
                ],
            ]);

            // Comprobar si el estudiante ya cumplió TODOS los prerrequisitos de este examen
            $totalReqs = PrerrequisitoExamen::where('id_examen', $prerrequisito->id_examen)->count();
            
            $cumplidosCount = DB::table('estudiante_prerrequisito')
                ->join('prerrequisitos_examen', 'estudiante_prerrequisito.id_prerrequisito', '=', 'prerrequisitos_examen.id')
                ->where('prerrequisitos_examen.id_examen', $prerrequisito->id_examen)
                ->where('estudiante_prerrequisito.id_estudiante', $estudianteId)
                ->whereRaw('estudiante_prerrequisito.cumplido is true')
                ->count();

            // Si no fue modificado manualmente, recalcular habilitación
            $pivot = DB::table('estudiante_examen')
                ->where('id_examen', $prerrequisito->id_examen)
                ->where('id_estudiante', $estudianteId)
                ->first();

            if ($pivot && !filter_var($pivot->ajuste_manual, FILTER_VALIDATE_BOOLEAN)) {
                $nuevoEstado = ($cumplidosCount === $totalReqs) ? 'Habilitado' : 'Inhabilitado';
                DB::table('estudiante_examen')
                    ->where('id_examen', $prerrequisito->id_examen)
                    ->where('id_estudiante', $estudianteId)
                    ->update([
                        'estado'     => $nuevoEstado,
                        'updated_at' => now(),
                    ]);
            }

            // Registro en logs_auditoria listo para reversión compensatoria
            $this->registrarAuditoria($request, 'PRERREQUISITO_CUMPLIMIENTO_ACTUALIZADO', [
                'target_type'        => 'estudiante_prerrequisito',
                'target_id'          => $estudianteId,
                'id_prerrequisito'   => $prerrequisito->id,
                'id_estudiante'      => $estudianteId,
                'id_examen'          => $prerrequisito->id_examen,
                'valores_anteriores' => [
                    'cumplido'           => $cumplidoAnterior,
                    'fecha_cumplimiento' => $registroPrevio?->fecha_cumplimiento,
                ],
                'valores_nuevos'     => [
                    'cumplido'           => $cumplido,
                    'fecha_cumplimiento' => $cumplido ? now()->toDateTimeString() : null,
                ],
            ]);
        });

        return response()->json(['message' => 'Cumplimiento actualizado exitosamente.']);
    }

    /**
     * GET /api/examenes/{examenId}/estudiantes/{estudianteId}/prerrequisitos
     */
    public function prerrequisitosPorEstudiante(string $examenId, string $estudianteId): JsonResponse
    {
        $examen = Examen::find($examenId);
        if (!$examen) {
            return response()->json([
                'message'    => 'El examen especificado no existe.',
                'error_type' => 'EXAMEN_NO_ENCONTRADO'
            ], 404);
        }

        $inscrito = DB::table('estudiante_examen')
            ->where('id_examen', $examenId)
            ->where('id_estudiante', $estudianteId)
            ->exists();

        if (!$inscrito) {
            return response()->json([
                'message'    => 'El estudiante no se encuentra registrado en este examen.',
                'error_type' => 'ESTUDIANTE_NO_INSCRITO'
            ], 404);
        }

        $prerrequisitos = DB::table('prerrequisitos_examen as pe')
            ->leftJoin('estudiante_prerrequisito as ep', function ($join) use ($estudianteId) {
                $join->on('pe.id', '=', 'ep.id_prerrequisito')
                    ->where('ep.id_estudiante', '=', $estudianteId);
            })
            ->where('pe.id_examen', $examenId)
            ->select(
                'pe.id',
                'pe.titulo',
                'pe.descripcion',
                DB::raw('COALESCE(ep.cumplido, false) as cumplido')
            )
            ->orderBy('pe.created_at', 'asc')
            ->get()
            ->map(function ($item) {
                return [
                    'id'          => $item->id,
                    'titulo'      => $item->titulo,
                    'descripcion' => $item->descripcion,
                    'cumplido'    => filter_var($item->cumplido, FILTER_VALIDATE_BOOLEAN),
                ];
            });

        return response()->json($prerrequisitos, 200);
    }

    private function registrarAuditoria(Request $request, string $accion, array $detalles = []): void
    {
        $user = $request->user();
        if (!$user) return;

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
            'modulo'            => 'PRERREQUISITOS',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}