<?php

namespace App\Http\Controllers;

use App\Http\Requests\CambiarHabilitacionRequest;
use App\Models\Examen;
use App\Models\Estudiante;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

            public function validarIngreso(Request $request, string $examenId): JsonResponse
    {
        $request->validate([
            'codigo_sis' => ['required', 'string'],
            'id_aula' => ['required', 'string'],
        ]);

        $examen = Examen::with([
            'materia:id,nombre',
            'aula:id,nombre',
            'normas:id,titulo,tipo',
        ])->find($examenId);

        if (!$examen) {
            return response()->json([
                'autorizado' => false,
                'codigo' => 'EXAMEN_NO_ENCONTRADO',
                'message' => 'Examen no encontrado.',
            ], 404);
        }

        $estudiante = Estudiante::where('codigo_sis', $request->codigo_sis)->first();

        if (!$estudiante) {
            return response()->json([
                'autorizado' => false,
                'codigo' => 'ESTUDIANTE_NO_ENCONTRADO',
                'message' => 'Estudiante no encontrado.',
            ], 404);
        }

        $registro = $examen->estudiantes()
            ->where('estudiantes.id', $estudiante->id)
            ->first();

        if (!$registro) {
            return response()->json([
                'autorizado' => false,
                'codigo' => 'ESTUDIANTE_NO_HABILITADO',
                'message' => 'El estudiante no está habilitado para este examen.',
            ], 403);
        }

        if ($registro->pivot->estado === 'Inhabilitado') {
            return response()->json([
                'autorizado' => false,
                'codigo' => 'ESTUDIANTE_INHABILITADO',
                'message' => 'El estudiante está inhabilitado para este examen.',
                'motivo_inhabilitacion' => $registro->pivot->motivo_inhabilitacion,
            ], 403);
        }

        if ($examen->id_aula !== $request->id_aula) {
            return response()->json([
                'autorizado' => false,
                'codigo' => 'AULA_INCORRECTA',
                'message' => 'El estudiante debe ingresar al aula asignada para este examen.',
                'aula_correcta' => $examen->aula?->nombre,
            ], 403);
        }

        return response()->json([
            'autorizado' => true,
            'codigo' => 'VALIDACION_EXITOSA',
            'message' => 'Estudiante habilitado para ingresar al examen.',
            'estudiante' => [
                'id' => $estudiante->id,
                'codigo_sis' => $estudiante->codigo_sis,
                'nombre_completo' => trim(
                    "{$estudiante->nombre} {$estudiante->apellido_paterno} " .
                    ($estudiante->apellido_materno ?? '')
                ),
            ],
            'examen' => [
                'id' => $examen->id,
                'nombre' => $examen->nombre,
                'materia' => $examen->materia?->nombre,
                'aula' => $examen->aula?->nombre,
                'fecha' => $examen->fecha?->format('Y-m-d'),
                'hora_inicio' => $examen->hora_ini,
                'hora_fin' => $examen->hora_fin,
                'normas' => $examen->normas,
            ],
        ], 200);
    }
}
