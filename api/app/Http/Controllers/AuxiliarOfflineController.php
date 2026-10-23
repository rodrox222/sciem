<?php

namespace App\Http\Controllers;

use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\LogAsistencia;
use App\Models\LogAuditoria;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuxiliarOfflineController extends Controller
{
    public function descargarPadron(Request $request, $idExamen): JsonResponse
    {
        $user = $request->user();

        $examen = Examen::find($idExamen);
        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        $esDocente = ($user->id === $examen->id_docente);
        $esAuxiliarAsignado = DB::table('examen_auxiliar')
            ->where('id_examen', $idExamen)
            ->where('id_auxiliar', $user->id)
            ->where('estado', 'Aceptada')
            ->exists();

        if (!$esDocente && !$esAuxiliarAsignado) {
            return response()->json(['message' => 'No tiene permisos para este examen.'], 403);
        }

        $estudiantes = DB::table('estudiante_examen as ee')
            ->join('estudiantes as e', 'ee.id_estudiante', '=', 'e.id')
            ->where('ee.id_examen', $idExamen)
            ->select([
                'e.id as id_estudiante',
                'e.codigo_sis',
                'e.ci',
                'e.ci_extension',
                'e.nombre',
                'e.apellido_paterno',
                'e.apellido_materno',
                'e.foto_perfil_url',
                'ee.estado as estado_habilitacion',
                'ee.fecha_ingreso',
            ])
            ->get();

        return response()->json([
            'examen' => [
                'id'            => $examen->id,
                'nombre'        => $examen->nombre ?? 'Examen',
                'fecha_hora'    => $examen->fecha_hora ?? null,
                'descargado_el' => now()->toIso8601String(),
            ],
            'total_estudiantes' => $estudiantes->count(),
            'estudiantes'       => $estudiantes,
        ], 200);
    }

    public function sincronizarAsistencias(Request $request, $idExamen): JsonResponse
    {
        $request->validate([
            'asistencias'                 => 'required|array|min:1',
            'asistencias.*.codigo_sis'    => 'required|string',
            'asistencias.*.fecha_ingreso' => 'required',
            'asistencias.*.resultado'     => 'required|in:PERMITIDO,DENEGADO',
            'asistencias.*.motivo'        => 'nullable|string',
        ]);

        $user = $request->user();

        $examen = Examen::find($idExamen);
        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        $esDocente = ($user->id === $examen->id_docente);
        $esAuxiliarAsignado = DB::table('examen_auxiliar')
            ->where('id_examen', $idExamen)
            ->where('id_auxiliar', $user->id)
            ->where('estado', 'Aceptada')
            ->exists();

        if (!$esDocente && !$esAuxiliarAsignado) {
            return response()->json(['message' => 'No autorizado para sincronizar este examen.'], 403);
        }

        $rolAuditor = $esDocente ? 'docente' : 'auxiliar';
        $procesados = 0;
        $errores    = [];

        DB::beginTransaction();
        try {
            foreach ($request->asistencias as $item) {
                $codigoSis = trim($item['codigo_sis']);
                $fechaIngreso = Carbon::parse($item['fecha_ingreso'])->setTimezone('America/La_Paz');

                $estudiante = ($codigoSis !== 'DESCONOCIDO')
                    ? Estudiante::where('codigo_sis', $codigoSis)->first()
                    : null;

                if ($item['resultado'] === 'PERMITIDO') {
                    if (!$estudiante) {
                        $errores[] = [
                            'codigo_sis' => $codigoSis,
                            'error'      => 'Estudiante no registrado en la base de datos.',
                        ];
                        continue;
                    }

                    $yaIngreso = LogAsistencia::where('id_examen', $idExamen)
                        ->where('id_estudiante', $estudiante->id)
                        ->where('resultado', 'PERMITIDO')
                        ->exists();

                    if (!$yaIngreso) {
                        LogAsistencia::create([
                            'id_examen'            => $idExamen,
                            'id_estudiante'        => $estudiante->id,
                            'codigo_sis_escaneado' => $codigoSis,
                            'resultado'            => 'PERMITIDO',
                            'mensaje'              => $item['motivo'] ?? 'Ingreso offline autorizado.',
                            'payload_qr_recibido'  => ['modo' => 'OFFLINE_SYNC'],
                            'fecha_escaneo'        => $fechaIngreso,
                        ]);

                        DB::table('estudiante_examen')
                            ->where('id_examen', $idExamen)
                            ->where('id_estudiante', $estudiante->id)
                            ->update([
                                'fecha_ingreso' => $fechaIngreso,
                                'updated_at'    => now(),
                            ]);
                    }

                    $procesados++;

                } else {
                    // Mapeo exacto compatible con logs_asistencias_resultado_check
                    $tipoIntento = substr(trim($item['motivo'] ?? 'NO_INSCRITO'), 0, 30);

                    $resultadoLog = match ($tipoIntento) {
                        'INHABILITADO'        => 'RECHAZADO_INHABILITADO',
                        'REINGRESO_DUPLICADO' => 'RECHAZADO_YA_INGRESO',
                        'EXAMEN_DISTINTO'     => 'RECHAZADO_NO_INSCRITO',
                        'NO_REGISTRADO'       => 'ERROR_DATOS_INVALIDOS',
                        'HORARIO_EXPIRADO'    => 'RECHAZADO_QR_EXPIRADO',
                        default               => 'RECHAZADO_NO_INSCRITO',
                    };

                    // 1. Log con el valor permitido por el check constraint
                    LogAsistencia::create([
                        'id_examen'            => $idExamen,
                        'id_estudiante'        => $estudiante?->id,
                        'codigo_sis_escaneado' => $codigoSis,
                        'resultado'            => $resultadoLog,
                        'mensaje'              => "Intento no autorizado offline: {$tipoIntento}",
                        'payload_qr_recibido'  => ['modo' => 'OFFLINE_SYNC', 'tipo_intento' => $tipoIntento],
                        'fecha_escaneo'        => $fechaIngreso,
                    ]);

                    // 2. Registro formal en intentos_no_autorizados
                    $idIntento = (string) Str::uuid();
                    DB::table('intentos_no_autorizados')->insert([
                        'id'                       => $idIntento,
                        'id_examen'                => $idExamen,
                        'id_estudiante'            => $estudiante?->id,
                        'tipo_intento'             => $tipoIntento,
                        'registrado_por_user_type' => $rolAuditor,
                        'registrado_por_user_id'   => $user->id,
                        'fecha_hora'               => $fechaIngreso,
                        'created_at'               => now(),
                        'updated_at'               => now(),
                    ]);

                    // 3. Auditoría en log_auditorias
                    LogAuditoria::create([
                        'user_type'         => get_class($user),
                        'user_id'           => $user->id,
                        'rol_en_el_momento' => $rolAuditor,
                        'usuario_nombre'    => trim("{$user->nombre} {$user->apellido_paterno}"),
                        'usuario_email'     => $user->email,
                        'modulo'            => 'INTENTOS_NO_AUTORIZADOS',
                        'accion'            => 'INTENTO_OFFLINE_SINCRONIZADO',
                        'ip_origen'         => $request->ip() ?? '127.0.0.1',
                        'user_agent'        => $request->userAgent() ?? 'CapacitorApp',
                        'detalles'          => [
                            'intento_id'    => $idIntento,
                            'id_examen'     => $idExamen,
                            'id_estudiante' => $estudiante?->id,
                            'tipo_intento'  => $tipoIntento,
                            'identificador' => $codigoSis,
                        ],
                    ]);

                    $procesados++;
                }
            }

            DB::commit();

            return response()->json([
                'success'          => true,
                'message'          => 'Sincronización completada exitosamente.',
                'total_enviados'   => count($request->asistencias),
                'total_procesados' => $procesados,
                'detalles_errores' => $errores,
            ], 200);

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al procesar el lote de sincronización: ' . $e->getMessage(),
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}