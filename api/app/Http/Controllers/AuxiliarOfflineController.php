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

        $examen = Examen::with(['materia:id,nombre', 'aula:id,nombre'])->find($idExamen);
        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        $esDocente = ($user->id === $examen->id_docente);
        $esAuxiliarAsignado = DB::table('examen_auxiliar')
            ->where('id_examen', $idExamen)
            ->where('id_auxiliar', $user->id)
            ->where('estado', 'Activo')
            ->exists();

        if (!$esDocente && !$esAuxiliarAsignado) {
            return response()->json(['message' => 'No tiene permisos para este examen.'], 403);
        }

        $todosEstudiantes = DB::table('estudiante_examen as ee')
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
                'ee.motivo_estado',
                'ee.fecha_ingreso',
                'ee.id_auxiliar',
            ])
            ->orderBy('e.apellido_paterno', 'asc')
            ->orderBy('e.apellido_materno', 'asc')
            ->orderBy('e.nombre', 'asc')
            ->get();

        // 1. Docente descarga TODO el padrón completo
        if ($esDocente) {
            $estudiantesParaEscanear = $todosEstudiantes;
            $otrosModulosSis = [];
        } else {
            // 2. Auxiliar descarga solo SUS estudiantes asignados
            $estudiantesParaEscanear = $todosEstudiantes->filter(function ($item) use ($user) {
                return $item->id_auxiliar === $user->id;
            })->values();

            // Lista ligera de códigos SIS del resto del examen para detectar "NO_ASIGNADO" offline
            $otrosModulosSis = $todosEstudiantes->filter(function ($item) use ($user) {
                return $item->id_auxiliar !== $user->id;
            })->pluck('codigo_sis')->toArray();
        }

        // Expulsiones vigentes para validar offline igual que en el online
        $expulsiones = DB::table('expulsiones')
            ->where('id_examen', $idExamen)
            ->pluck('id_estudiante')
            ->toArray();

        // Prerrequisitos
        $prerrequisitos = DB::table('prerrequisitos_examen')
            ->where('id_examen', $idExamen)
            ->select(['id', 'id_examen', 'titulo as nombre', 'descripcion'])
            ->get();

        // Normas activas
        $normas = DB::table('examen_norma as en')
            ->join('normas as n', 'en.id_norma', '=', 'n.id')
            ->where('en.id_examen', $idExamen)
            ->where('n.estado', 'Activo')
            ->select(['n.id', 'n.titulo', 'n.descripcion', 'n.tipo'])
            ->get();

        return response()->json([
            'examen' => [
                'id'            => $examen->id,
                'id_examen'     => $examen->id,
                'nombre'        => $examen->nombre ?? 'Examen',
                'fecha'         => $examen->fecha ? substr((string)$examen->fecha, 0, 10) : null,
                'hora_ini'      => $examen->hora_ini,
                'hora_fin'      => $examen->hora_fin,
                'estado'        => $examen->estado ?? 'Activo',
                'materia'       => $examen->materia?->nombre,
                'aula'          => $examen->aula?->nombre,
                'descargado_el' => now('America/La_Paz')->toIso8601String(),
            ],
            'id_usuario_solicitante' => $user->id,
            'rol'                    => $esDocente ? 'docente' : 'auxiliar',
            'total_general_examen'   => $todosEstudiantes->count(),
            'total_asignados'        => $estudiantesParaEscanear->count(),
            'estudiantes'            => $estudiantesParaEscanear,
            'otros_modulos_sis'      => $otrosModulosSis,
            'expulsados_ids'         => $expulsiones,
            'prerrequisitos'         => $prerrequisitos,
            'normas'                 => $normas,
        ], 200);
    }

    public function sincronizarAsistencias(Request $request, $idExamen): JsonResponse
    {
        $request->validate([
            'asistencias'                 => 'required|array|min:1',
            'asistencias.*.codigo_sis'    => 'required|string',
            'asistencias.*.fecha_ingreso' => 'required|date',
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
            ->where('estado', 'Activo')
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

                $estudiante = null;
                if (!empty($item['id_estudiante']) && Str::isUuid($item['id_estudiante'])) {
                    $estudiante = Estudiante::find($item['id_estudiante']);
                }
                if (!$estudiante && $codigoSis !== 'DESCONOCIDO' && $codigoSis !== 'QR_INVALIDO') {
                    $estudiante = Estudiante::where('codigo_sis', $codigoSis)->first();
                }

                if ($item['resultado'] === 'PERMITIDO') {
                    if (!$estudiante) {
                        $errores[] = [
                            'codigo_sis' => $codigoSis,
                            'error'      => 'Estudiante no registrado en la base de datos.',
                        ];
                        continue;
                    }

                    $inscripcion = DB::table('estudiante_examen')
                        ->where('id_examen', $idExamen)
                        ->where('id_estudiante', $estudiante->id)
                        ->first();

                    // Control de Asignación Estricta
                    if (!$esDocente && isset($inscripcion->id_auxiliar) && $inscripcion->id_auxiliar !== $user->id) {
                        $errores[] = [
                            'codigo_sis' => $codigoSis,
                            'error'      => 'Estudiante no asignado al módulo de este auxiliar.',
                        ];

                        $this->registrarIntentoDirecto(
                            $idExamen,
                            $estudiante->id,
                            'NO_ASIGNADO',
                            $rolAuditor,
                            $user,
                            $codigoSis,
                            $fechaIngreso
                        );
                        continue;
                    }

                    if (!$inscripcion || strcasecmp($inscripcion->estado, 'Habilitado') !== 0
                        || \App\Models\Expulsion::where('id_examen', $idExamen)->where('id_estudiante', $estudiante->id)->exists()
                        || !\App\Services\AccesoExamen::enHorario($examen, \Carbon\CarbonImmutable::instance($fechaIngreso))
                        || $fechaIngreso->isFuture()) {
                        $errores[] = [
                            'codigo_sis' => $codigoSis,
                            'error'      => 'Ingreso no conciliable: inhabilitado, expulsado u horario inválido.'
                        ];
                        continue;
                    }

                    $ingresoPrevio = LogAsistencia::where('id_examen', $idExamen)
                        ->where('id_estudiante', $estudiante->id)
                        ->where('resultado', 'PERMITIDO')
                        ->first();

                    if ($ingresoPrevio) {
                        $fechaPrevio = Carbon::parse($ingresoPrevio->fecha_escaneo);

                        // Si el registro actual ocurrió ANTES que el existente en servidor
                        if ($fechaIngreso->lt($fechaPrevio)) {
                            // Degradar el previo a CONFLICTO
                            $ingresoPrevio->update([
                                'resultado' => 'RECHAZADO_YA_INGRESO',
                                'mensaje'   => 'Sustituido por ingreso offline cronológicamente anterior (R3).',
                            ]);

                            // Grabar el nuevo como el PERMITIDO válido
                            LogAsistencia::create([
                                'id_examen'            => $idExamen,
                                'id_estudiante'        => $estudiante->id,
                                'codigo_sis_escaneado' => substr($codigoSis, 0, 30),
                                'resultado'            => 'PERMITIDO',
                                'mensaje'              => 'Ingreso prioritario cronológico offline (R3).',
                                'payload_qr_recibido'  => ['modo' => 'OFFLINE_SYNC_R3_GANADOR'],
                                'fecha_escaneo'        => $fechaIngreso,
                            ]);

                            DB::table('estudiante_examen')
                                ->where('id_examen', $idExamen)
                                ->where('id_estudiante', $estudiante->id)
                                ->update([
                                    'fecha_ingreso' => $fechaIngreso,
                                    'updated_at'    => now('America/La_Paz'),
                                ]);
                        } else {
                            // El actual ocurrió DESPUÉS: se marca como CONFLICTO (R3)
                            $this->registrarIntentoDirecto(
                                $idExamen,
                                $estudiante->id,
                                'CONFLICTO_DUPLICADO_R3',
                                $rolAuditor,
                                $user,
                                $codigoSis,
                                $fechaIngreso
                            );

                            $errores[] = [
                                'codigo_sis' => $codigoSis,
                                'error'      => 'Conflicto (R3): Se conservó el primer ingreso y se marcó como conflicto para revisión.',
                            ];
                        }
                    } else {
                        // Ingreso normal único
                        LogAsistencia::create([
                            'id_examen'            => $idExamen,
                            'id_estudiante'        => $estudiante->id,
                            'codigo_sis_escaneado' => substr($codigoSis, 0, 30),
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
                                'updated_at'    => now('America/La_Paz'),
                            ]);
                    }

                    $procesados++;

                } else {
                    $tipoIntento = substr(trim($item['motivo'] ?? 'NO_INSCRITO'), 0, 30);

                    $resultadoLog = match ($tipoIntento) {
                        'INHABILITADO'        => 'RECHAZADO_INHABILITADO',
                        'REINGRESO_DUPLICADO' => 'RECHAZADO_YA_INGRESO',
                        'NO_ASIGNADO'         => 'RECHAZADO_NO_ASIGNADO',
                        'NO_REGISTRADO',
                        'QR_INVALIDO',
                        'HORARIO_EXPIRADO'    => 'ERROR_DATOS_INVALIDOS',
                        default               => 'RECHAZADO_NO_INSCRITO',
                    };

                    try {
                        LogAsistencia::create([
                            'id_examen'            => $idExamen,
                            'id_estudiante'        => $estudiante?->id,
                            'codigo_sis_escaneado' => substr($codigoSis, 0, 30),
                            'resultado'            => $resultadoLog,
                            'mensaje'              => "Intento no autorizado offline: {$tipoIntento}",
                            'payload_qr_recibido'  => ['modo' => 'OFFLINE_SYNC', 'tipo_intento' => $tipoIntento],
                            'fecha_escaneo'        => $fechaIngreso,
                        ]);
                    } catch (\Exception $e) {
                        \Log::warning("Error logs_asistencias en sincronización: " . $e->getMessage());
                    }

                    $this->registrarIntentoDirecto(
                        $idExamen,
                        $estudiante?->id,
                        $tipoIntento,
                        $rolAuditor,
                        $user,
                        $codigoSis,
                        $fechaIngreso
                    );

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

    private function registrarIntentoDirecto(
        string $idExamen,
        ?string $idEstudiante,
        string $tipoIntento,
        string $rolAuditor,
        $user,
        string $codigoSis,
        Carbon $fechaHora
    ): void {
        $idIntento = (string) Str::uuid();

        DB::table('intentos_no_autorizados')->insert([
            'id'                       => $idIntento,
            'id_examen'                => $idExamen,
            'id_estudiante'            => $idEstudiante,
            'tipo_intento'             => $tipoIntento,
            'registrado_por_user_type' => $rolAuditor,
            'registrado_por_user_id'   => $user->id,
            'fecha_hora'               => $fechaHora->toDateTimeString(),
            'created_at'               => now('America/La_Paz'),
            'updated_at'               => now('America/La_Paz'),
        ]);

        try {
            LogAuditoria::create([
                'user_type'         => get_class($user),
                'user_id'           => $user->id,
                'rol_en_el_momento' => $rolAuditor,
                'usuario_nombre'    => trim("{$user->nombre} {$user->apellido_paterno}"),
                'usuario_email'     => $user->email,
                'modulo'            => 'INTENTOS_NO_AUTORIZADOS',
                'accion'            => 'INTENTO_OFFLINE_SINCRONIZADO',
                'ip_origen'         => request()->ip() ?? '127.0.0.1',
                'user_agent'        => request()->userAgent() ?? 'App',
                'detalles'          => [
                    'intento_id'    => $idIntento,
                    'id_examen'     => $idExamen,
                    'id_estudiante' => $idEstudiante,
                    'tipo_intento'  => $tipoIntento,
                    'identificador' => $codigoSis,
                ],
                'created_at'        => now('America/La_Paz'),
            ]);
        } catch (\Exception $e) {
            \Log::warning("Error log_auditoria en sincronización: " . $e->getMessage());
        }
    }
}