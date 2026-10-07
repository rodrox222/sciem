<?php

namespace App\Http\Controllers;

use App\Http\Requests\CambiarHabilitacionRequest;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HabilitacionExamenController extends Controller
{
    public function index(string $examenId): JsonResponse
    {
        $examen = Examen::with(['estudiantes' => function ($query) {
            $query->select('estudiantes.id', 'codigo_sis', 'ci', 'ci_extension', 'nombre', 'apellido_paterno', 'apellido_materno', 'email_institucional');
        }])->findOrFail($examenId);

        $estudiantes = $examen->estudiantes->map(function ($estudiante) {
            return [
                'id'                  => $estudiante->id,
                'codigo_sis'          => $estudiante->codigo_sis,
                'ci'                  => $estudiante->ci,
                'ci_extension'        => $estudiante->ci_extension,
                'nombre_completo'     => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} " . ($estudiante->apellido_materno ?? '')),
                'email_institucional' => $estudiante->email_institucional,
                'estado'              => $estudiante->pivot->estado,
                'motivo_estado'       => $estudiante->pivot->motivo_estado,
                'ajuste_manual'       => (bool) $estudiante->pivot->ajuste_manual,
                'fecha_ajuste_manual' => $estudiante->pivot->fecha_ajuste_manual,
            ];
        });

        return response()->json([
            'examen_id'   => $examen->id,
            'nombre'      => $examen->nombre,
            'estudiantes' => $estudiantes,
        ], 200);
    }

    public function update(CambiarHabilitacionRequest $request, string $examenId, string $estudianteId): JsonResponse
    {
        $examen = Examen::findOrFail($examenId);

        $existe = $examen->estudiantes()->where('estudiantes.id', $estudianteId)->exists();
        if (!$existe) {
            return response()->json(['message' => 'El estudiante no se encuentra registrado en este examen.'], 404);
        }

        $estado = $request->input('estado');
        $motivo = trim($request->input('motivo_estado'));
        $docenteId = $request->user()?->id;

        $examen->estudiantes()->updateExistingPivot($estudianteId, [
            'estado'                    => $estado,
            'motivo_estado'             => $motivo,
            'ajuste_manual'             => true,
            'modificado_por_docente_id' => $docenteId,
            'fecha_ajuste_manual'       => now(),
            'updated_at'                => now(),
        ]);

        return response()->json([
            'message' => "Estudiante {$estado} manualmente.",
            'data'    => [
                'examen_id'     => $examenId,
                'estudiante_id' => $estudianteId,
                'estado'        => $estado,
                'motivo_estado' => $motivo,
                'ajuste_manual' => true,
            ],
        ], 200);
    }

    public function motivoInhabilitacion(string $examenId, string $estudianteId): JsonResponse
    {
        $registro = DB::table('estudiante_examen')
            ->where('id_examen', $examenId)
            ->where('id_estudiante', $estudianteId)
            ->select('estado', 'motivo_estado')
            ->first();

        if (!$registro) {
            return response()->json([
                'message' => 'El estudiante no se encuentra registrado en este examen.'
            ], 404);
        }

        return response()->json([
            'estado'        => $registro->estado,
            'motivo_estado' => $registro->motivo_estado,
        ], 200);
    }
}