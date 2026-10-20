<?php

namespace App\Http\Controllers;

use App\Models\Examen;
use App\Models\IntentoNoAutorizado;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class IntentoNoAutorizadoController extends Controller
{
    /**
     * HU13: Listar los intentos indebidos registrados automáticamente por el escáner
     * GET /api/examenes/{id_examen}/intentos-no-autorizados
     */
    public function index(Request $request, string $idExamen): JsonResponse
    {
        if (!Str::isUuid($idExamen)) {
            return response()->json([
                'success'    => false,
                'message'    => 'El identificador del examen no es válido.',
                'error_type' => 'EXAMEN_INVALIDO',
            ], 404);
        }

        // Cargamos el examen con su materia y aula una sola vez para la cabecera
        $examen = Examen::with(['materia:id,nombre', 'aula:id,nombre'])->find($idExamen);
        if (!$examen) {
            return response()->json([
                'success'    => false,
                'message'    => 'Examen no encontrado.',
                'error_type' => 'EXAMEN_NO_ENCONTRADO',
            ], 404);
        }

        $perPage = min($request->integer('per_page', 15), 100);

        $intentos = IntentoNoAutorizado::where('id_examen', $examen->id)
            ->with([
                'estudiante:id,codigo_sis,ci,ci_extension,foto_perfil_url,nombre,apellido_paterno,apellido_materno'
            ])
            ->orderBy('fecha_hora', 'desc')
            ->paginate($perPage)
            ->through(function ($intento) {
                $estudiante = $intento->estudiante;

                return [
                    'id'                       => $intento->id,
                    'identificador_presentado' => $intento->identificador_presentado,
                    'tipo_intento'             => $intento->tipo_intento,
                    'motivo'                   => $intento->motivo,
                    'fecha_hora'               => $intento->fecha_hora,
                    'codigo_sis'               => $estudiante?->codigo_sis ?? $intento->identificador_presentado,

                    // Datos del estudiante si fue identificado
                    'estudiante'               => $estudiante ? [
                        'id'              => $estudiante->id,
                        'codigo_sis'      => $estudiante->codigo_sis,
                        'ci'              => $estudiante->ci,
                        'ci_extension'    => $estudiante->ci_extension,
                        'nombre_completo' => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                        'foto_url'        => $estudiante->foto_perfil_url,
                    ] : null,
                ];
            });

        return response()->json([
            'success' => true,
            'examen'  => [
                'id'      => $examen->id,
                'nombre'  => $examen->nombre,
                'materia' => $examen->materia?->nombre,
                'aula'    => $examen->aula?->nombre ?? $examen->aula,
            ],
            'data'    => $intentos,
        ], 200);
    }
}