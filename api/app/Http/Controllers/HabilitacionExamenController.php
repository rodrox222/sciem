<?php

namespace App\Http\Controllers;

use App\Http\Requests\CambiarHabilitacionRequest;
use App\Models\Examen;
use Illuminate\Http\JsonResponse;

class HabilitacionExamenController extends Controller
{
    /**
     * Listar todos los estudiantes asignados a un examen con su estado de habilitación.
     */
    public function index(string $examenId): JsonResponse
    {
        $examen = Examen::with(['estudiantes' => function ($query) {
            $query->select('estudiantes.id', 'codigo_sis', 'ci', 'ci_extension', 'nombre', 'apellido_paterno', 'apellido_materno', 'email_institucional');
        }])->findOrFail($examenId);

        $estudiantes = $examen->estudiantes->map(function ($estudiante) {
            return [
                'id'                    => $estudiante->id,
                'codigo_sis'            => $estudiante->codigo_sis,
                'ci'                    => $estudiante->ci,
                'ci_extension'          => $estudiante->ci_extension,
                'nombre_completo'       => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} " . ($estudiante->apellido_materno ?? '')),
                'email_institucional'   => $estudiante->email_institucional,
                'estado'                => $estudiante->pivot->estado,
                'motivo_inhabilitacion' => $estudiante->pivot->motivo_inhabilitacion,
            ];
        });

        return response()->json([
            'examen_id'   => $examen->id,
            'nombre'      => $examen->nombre,
            'estudiantes' => $estudiantes,
        ], 200);
    }

    /**
     * Habilitar o Inhabilitar a un estudiante específico en un examen.
     */
    public function update(CambiarHabilitacionRequest $request, string $examenId, string $estudianteId): JsonResponse
    {
        $examen = Examen::findOrFail($examenId);

        // Verificar si el estudiante está asignado a este examen
        $existe = $examen->estudiantes()->where('estudiantes.id', $estudianteId)->exists();
        if (!$existe) {
            return response()->json([
                'message' => 'El estudiante no se encuentra registrado en este examen.'
            ], 404);
        }

        $estado = $request->input('estado');
        $motivo = $estado === 'Inhabilitado' ? trim($request->input('motivo_inhabilitacion')) : null;

        // Actualizar la tabla pivote estudiante_examen
        $examen->estudiantes()->updateExistingPivot($estudianteId, [
            'estado'                => $estado,
            'motivo_inhabilitacion' => $motivo,
            'updated_at'            => now(),
        ]);

        return response()->json([
            'message' => "Estudiante {$estado} correctamente para el examen.",
            'data'    => [
                'examen_id'             => $examenId,
                'estudiante_id'         => $estudianteId,
                'estado'                => $estado,
                'motivo_inhabilitacion' => $motivo,
            ],
        ], 200);
    }
}
