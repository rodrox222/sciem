<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePrerrequisitoRequest;
use App\Http\Requests\ToggleCumplimientoRequest;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
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
                ->where('ajuste_manual', false)
                ->update([
                    'estado' => 'Inhabilitado',
                    'updated_at' => now(),
                ]);

            return $nuevo;
        });

        return response()->json([
            'message' => 'Prerrequisito creado. Se ha actualizado el estado de los alumnos.',
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

        DB::transaction(function () use ($prerrequisito, $estudianteId, $cumplido, $docenteId) {
            $prerrequisito->estudiantes()->syncWithoutDetaching([
                $estudianteId => [
                    'cumplido'                => $cumplido,
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
                ->where('estudiante_prerrequisito.cumplido', true)
                ->count();

            // Si no fue modificado manualmente, recalcular habilitación
            $pivot = DB::table('estudiante_examen')
                ->where('id_examen', $prerrequisito->id_examen)
                ->where('id_estudiante', $estudianteId)
                ->first();

            if ($pivot && !$pivot->ajuste_manual) {
                $nuevoEstado = ($cumplidosCount === $totalReqs) ? 'Habilitado' : 'Inhabilitado';
                DB::table('estudiante_examen')
                    ->where('id_examen', $prerrequisito->id_examen)
                    ->where('id_estudiante', $estudianteId)
                    ->update([
                        'estado'     => $nuevoEstado,
                        'updated_at' => now(),
                    ]);
            }
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
                    'cumplido'    => (bool) $item->cumplido,
                ];
            });

        return response()->json($prerrequisitos, 200);
    }
}