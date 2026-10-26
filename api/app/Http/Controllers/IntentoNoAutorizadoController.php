<?php

namespace App\Http\Controllers;

use App\Models\Examen;
use App\Models\IntentoNoAutorizado;
use App\Models\LogAuditoria;
use Carbon\Carbon;
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

                // Si el estudiante no existe en BD, rescatar el identificador guardado en auditoría
                $identificador = $estudiante?->codigo_sis;
                if (!$identificador) {
                    $auditoria = LogAuditoria::where('modulo', 'INTENTOS_NO_AUTORIZADOS')
                        ->where('detalles->intento_id', $intento->id)
                        ->first();
                    
                    $detalles = $auditoria?->detalles;
                    $identificador = is_array($detalles) ? ($detalles['identificador'] ?? null) : null;
                    if ($identificador === 'DESCONOCIDO' || $identificador === 'QR_INVALIDO') {
                        $identificador = null;
                    }
                }

                $fechaBolivia = Carbon::parse($intento->fecha_hora)
                    ->setTimezone('America/La_Paz')
                    ->toIso8601String();

                return [
                    'id'                       => $intento->id,
                    'tipo_intento'             => $intento->tipo_intento,
                    'fecha_hora'               => $fechaBolivia,
                    'codigo_sis'               => $identificador,
                    'identificador_presentado' => $identificador,

                    'estudiante' => $estudiante ? [
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