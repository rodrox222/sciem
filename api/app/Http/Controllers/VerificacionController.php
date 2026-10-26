<?php

namespace App\Http\Controllers;

use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\LogAsistencia;
use App\Models\IntentoNoAutorizado;
use App\Models\LogAuditoria;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class VerificacionController extends Controller
{
    /**
     * Valida el ingreso de un estudiante mediante escaneo de su código QR.
     */
    public function verificarIngreso(Request $request, string $idExamen): JsonResponse
    {
        $request->validate([
            'qr_data' => 'required|string',
        ]);

        $rawQr = $request->input('qr_data');
        $trimmedQr = trim($rawQr);

        // Cargar evaluación con aula y materia
        $examen = Examen::with(['aula:id,nombre', 'materia:id,nombre'])->find($idExamen);

        if (!$examen) {
            return response()->json([
                'resultado' => 'EXAMEN_NO_ENCONTRADO',
                'message'   => 'La evaluación académica solicitada no existe.',
            ], 404);
        }

        $usuario = $request->user();
        $rol = $usuario ? ($usuario->rol ?? class_basename($usuario)) : 'docente';
        $userId = $usuario?->id;

        // Validar permisos del verificador (Docente o Auxiliar)
        if ($usuario && method_exists($usuario, 'tokenCan')) {
            if ($usuario->tokenCan('role:auxiliar')) {
                $asignacion = DB::table('examen_auxiliar')
                    ->where('id_examen', $examen->id)
                    ->where('id_auxiliar', $usuario->id)
                    ->where('estado', 'Aceptada')
                    ->exists();

                if (!$asignacion) {
                    return response()->json([
                        'success'    => false,
                        'resultado'  => 'AUXILIAR_NO_ASIGNADO',
                        'message'    => 'Acceso denegado: no cuenta con asignación aceptada para este examen.',
                    ], 403);
                }
            } elseif ($usuario->tokenCan('role:docente')) {
                if ($examen->id_docente !== $usuario->id) {
                    return response()->json([
                        'success'    => false,
                        'resultado'  => 'DOCENTE_NO_AUTORIZADO',
                        'message'    => 'Acceso denegado: no puede gestionar el escáner de un examen ajeno.',
                    ], 403);
                }
            }
        }

        // EXTRACCIÓN Y PARSEO DEL QR

        $idExamenToken = null;
        $idEstudianteToken = null;
        $codigoSis = null;
        $materiaQr = null;
        $expiraAt = null;
        $qrData = [];
        $esFormatoValido = false;

        if (str_starts_with($trimmedQr, '{') && str_ends_with($trimmedQr, '}')) {
            $qrData = json_decode($trimmedQr, true);
            if (is_array($qrData)) {
                $codigoSis = $qrData['sis'] ?? $qrData['codigo_sis'] ?? null;
                $materiaQr = $qrData['materia'] ?? null;
                $idExamenToken = $qrData['id_examen'] ?? null;
                $idEstudianteToken = $qrData['id_estudiante'] ?? null;
                $expiraAt = $qrData['expira_at'] ?? null;
                $esFormatoValido = !empty($codigoSis) || !empty($idEstudianteToken);
            }
        } elseif (str_contains($trimmedQr, '.')) {
            $partes = explode('.', $trimmedQr);
            $payloadJson = base64_decode($partes[0], true);
            if ($payloadJson) {
                $qrData = json_decode($payloadJson, true);
                if (is_array($qrData)) {
                    $idExamenToken = $qrData['id_examen'] ?? null;
                    $idEstudianteToken = $qrData['id_estudiante'] ?? null;
                    $codigoSis = $qrData['codigo_sis'] ?? $qrData['sis'] ?? null;
                    $materiaQr = $qrData['materia'] ?? null;
                    $expiraAt = $qrData['expira_at'] ?? null;
                    $esFormatoValido = !empty($codigoSis) || !empty($idEstudianteToken);
                }
            }
        } elseif (ctype_digit($trimmedQr) && strlen($trimmedQr) >= 5 && strlen($trimmedQr) <= 15) {
            $codigoSis = $trimmedQr;
            $esFormatoValido = true;
        }

        // QR DE OTRO TIPO (Bancario, URL, Cadena arbitraria)

        if (!$esFormatoValido) {
            $identificadorSeguro = substr(preg_replace('/[^a-zA-Z0-9_-]/', '', $trimmedQr), 0, 20);
            if (empty($identificadorSeguro)) {
                $identificadorSeguro = 'QR_INVALIDO';
            }

            $this->registrarIntentoYAuditoria(
                $request,
                $examen->id,
                null,
                'QR_INVALIDO',
                $rol,
                $userId,
                $identificadorSeguro
            );

            $this->registrarLog(
                $examen->id,
                null,
                $identificadorSeguro,
                'ERROR_DATOS_INVALIDOS',
                'El código QR no pertenece al sistema universitario (formato no reconocido o externo).',
                ['raw_preview' => substr($rawQr, 0, 100)]
            );

            return response()->json([
                'success'    => false,
                'resultado'  => 'ERROR_DATOS_INVALIDOS',
                'message'    => 'Código QR inválido o ajeno al sistema institucional.',
                'error_type' => 'QR_INVALIDO',
            ], 400);
        }

        // BUSCAR AL ESTUDIANTE EN LA BASE DE DATOS

        $estudiante = null;
        if ($idEstudianteToken && Str::isUuid($idEstudianteToken)) {
            $estudiante = Estudiante::find($idEstudianteToken);
        }
        if (!$estudiante && $codigoSis) {
            $estudiante = Estudiante::where('codigo_sis', trim($codigoSis))->first();
        }

        // EXAMEN QUE YA ACABÓ

        $ahora = Carbon::now('America/La_Paz');
        $estadoExamen = strtolower(trim($examen->estado ?? ''));
        $esEstadoConcluido = in_array($estadoExamen, ['terminado', 'finalizado', 'concluido']);
        
        $horaFinExamen = null;
        if (!empty($examen->fecha) && !empty($examen->hora_fin)) {
            $soloFecha = substr(trim((string) $examen->fecha), 0, 10);
            $soloHora = trim((string) $examen->hora_fin);

            try {
                $horaFinExamen = Carbon::parse("{$soloFecha} {$soloHora}", 'America/La_Paz');
            } catch (\Exception $e) {
                $horaFinExamen = null;
            }
        }

        if ($esEstadoConcluido || ($horaFinExamen && $ahora->greaterThan($horaFinExamen))) {
            $this->registrarIntentoYAuditoria(
                $request,
                $examen->id,
                $estudiante?->id,
                'EXAMEN_FINALIZADO',
                $rol,
                $userId,
                $codigoSis ?? 'DESCONOCIDO'
            );

            $this->registrarLog(
                $examen->id,
                $estudiante?->id,
                $codigoSis ?? 'DESCONOCIDO',
                'RECHAZADO_NO_INSCRITO',
                'El examen ya ha finalizado. No se permiten más accesos.',
                ['raw_content' => substr($rawQr, 0, 100)]
            );

            return response()->json([
                'success'    => false,
                'resultado'  => 'RECHAZADO_EXAMEN_CONCLUIDO',
                'message'    => 'La evaluación ha finalizado. El período de ingreso concluyó.',
                'error_type' => 'EXAMEN_FINALIZADO',
            ], 403);
        }

        // NO ESTÁ EN EL SISTEMA EN LA BASE DE DATOS

        if (!$estudiante) {
            $this->registrarIntentoYAuditoria(
                $request,
                $examen->id,
                null,
                'NO_REGISTRADO',
                $rol,
                $userId,
                $codigoSis ?? 'DESCONOCIDO'
            );

            $this->registrarLog(
                $examen->id,
                null,
                $codigoSis ?? 'DESCONOCIDO',
                'ERROR_DATOS_INVALIDOS',
                "El código SIS {$codigoSis} no pertenece a ningún estudiante registrado en el sistema.",
                $qrData
            );

            return response()->json([
                'success'    => false,
                'resultado'  => 'RECHAZADO_NO_REGISTRADO',
                'message'    => 'El estudiante no se encuentra registrado en el sistema universitario.',
                'error_type' => 'NO_REGISTRADO',
            ], 403);
        }

        // ESTUDIANTE QUE YA INGRESÓ (REINGRESO DUPLICADO)

        $ingresoPrevio = LogAsistencia::where('id_examen', $examen->id)
            ->where('id_estudiante', $estudiante->id)
            ->where('resultado', 'PERMITIDO')
            ->first();

        if (!$ingresoPrevio) {
            $ingresoPrevioPivote = DB::table('estudiante_examen')
                ->where('id_examen', $examen->id)
                ->where('id_estudiante', $estudiante->id)
                ->whereNotNull('fecha_ingreso')
                ->first();
        }

        if ($ingresoPrevio || !empty($ingresoPrevioPivote)) {
            $fechaPrimerIngreso = $ingresoPrevio
                ? Carbon::parse($ingresoPrevio->fecha_escaneo)->format('d/m/Y H:i:s')
                : Carbon::parse($ingresoPrevioPivote->fecha_ingreso)->format('d/m/Y H:i:s');

            $this->registrarIntentoYAuditoria(
                $request,
                $examen->id,
                $estudiante->id,
                'REINGRESO_DUPLICADO',
                $rol,
                $userId,
                $estudiante->codigo_sis
            );

            $this->registrarLog(
                $examen->id,
                $estudiante->id,
                $estudiante->codigo_sis,
                'RECHAZADO_YA_INGRESO',
                'Intento de reingreso: el estudiante ya tiene un ingreso autorizado registrado.',
                $qrData
            );

            return response()->json([
                'success'    => false,
                'resultado'  => 'RECHAZADO_YA_INGRESO',
                'message'    => 'El estudiante ya registró su ingreso a esta evaluación.',
                'error_type' => 'REINGRESO_DUPLICADO',
                'detalles'   => [
                    'primer_ingreso' => $fechaPrimerIngreso,
                ],
            ], 409);
        }

        // ESTÁ EN EL SISTEMA, PERO NO ESTÁ EN LA MATERIA/EXAMEN (NO INSCRITO)

        $inscripcion = DB::table('estudiante_examen')
            ->where('id_examen', $examen->id)
            ->where('id_estudiante', $estudiante->id)
            ->first();

        if (!$inscripcion) {
            $this->registrarIntentoYAuditoria(
                $request,
                $examen->id,
                $estudiante->id,
                'NO_INSCRITO',
                $rol,
                $userId,
                $estudiante->codigo_sis
            );

            $this->registrarLog(
                $examen->id,
                $estudiante->id,
                $estudiante->codigo_sis,
                'RECHAZADO_NO_INSCRITO',
                'El estudiante está registrado en el sistema pero no pertenece a la nómina de este examen.',
                $qrData
            );

            return response()->json([
                'success'    => false,
                'resultado'  => 'RECHAZADO_NO_INSCRITO',
                'message'    => 'El estudiante no se encuentra inscrito en esta evaluación.',
                'error_type' => 'NO_INSCRITO',
                'estudiante' => [
                    'nombre' => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                    'sis'    => $estudiante->codigo_sis,
                ]
            ], 403);
        }

        // ESTÁ EN LA NÓMINA, PERO SU QR TRAE OTRO EXAMEN O MATERIA

        $esExamenDistinto = ($idExamenToken && $idExamenToken !== $examen->id);
        $esMateriaDistinta = ($materiaQr && $examen->materia && strcasecmp(trim($materiaQr), trim($examen->materia->nombre)) !== 0);

        if ($esExamenDistinto || $esMateriaDistinta) {
            $this->registrarIntentoYAuditoria(
                $request,
                $examen->id,
                $estudiante->id,
                'EXAMEN_DISTINTO',
                $rol,
                $userId,
                $estudiante->codigo_sis
            );

            $this->registrarLog(
                $examen->id,
                $estudiante->id,
                $estudiante->codigo_sis,
                'RECHAZADO_NO_INSCRITO',
                'El estudiante presentó un QR generado para otro examen o materia.',
                $qrData
            );

            return response()->json([
                'success'    => false,
                'resultado'  => 'RECHAZADO_EXAMEN_DISTINTO',
                'message'    => 'El código QR presentado corresponde a otra evaluación o materia.',
                'error_type' => 'EXAMEN_DISTINTO',
            ], 403);
        }

        // ESTÁ EN EL EXAMEN, PERO NO ESTÁ HABILITADO

        $estadoHabilitacion = trim($inscripcion->estado ?? 'Inhabilitado');

        if (strcasecmp($estadoHabilitacion, 'Habilitado') !== 0) {
            $motivoInhabilitacion = $inscripcion->motivo_estado ?? 'No cumple con los prerrequisitos asignados.';

            $this->registrarIntentoYAuditoria(
                $request,
                $examen->id,
                $estudiante->id,
                'INHABILITADO',
                $rol,
                $userId,
                $estudiante->codigo_sis
            );

            $this->registrarLog(
                $examen->id,
                $estudiante->id,
                $estudiante->codigo_sis,
                'RECHAZADO_INHABILITADO',
                "Ingreso denegado por inhabilitación. Motivo: {$motivoInhabilitacion}",
                $qrData
            );

            return response()->json([
                'success'    => false,
                'resultado'  => 'RECHAZADO_INHABILITADO',
                'message'    => 'Estudiante inhabilitado para rendir este examen.',
                'error_type' => 'INHABILITADO',
                'detalles'   => [
                    'motivo_inhabilitacion' => $motivoInhabilitacion,
                ],
                'estudiante' => [
                    'nombre'   => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                    'sis'      => $estudiante->codigo_sis,
                    'ci'       => $estudiante->ci,
                    'foto_url' => $estudiante->foto_perfil_url,
                ]
            ], 403);
        }

        // INGRESO AUTORIZADO (PERMITIDO)

        $ahoraIngreso = Carbon::now('America/La_Paz');

        DB::table('estudiante_examen')
            ->where('id_examen', $examen->id)
            ->where('id_estudiante', $estudiante->id)
            ->update([
                'fecha_ingreso' => $ahoraIngreso,
                'updated_at'    => now(),
            ]);

        try {
            $this->registrarLog(
                $examen->id,
                $estudiante->id,
                $estudiante->codigo_sis,
                'PERMITIDO',
                'Ingreso autorizado exitosamente.',
                $qrData
            );
        } catch (QueryException $e) {
            if ($e->getCode() === '23505') {
                $this->registrarIntentoYAuditoria(
                    $request,
                    $examen->id,
                    $estudiante->id,
                    'REINGRESO_DUPLICADO',
                    $rol,
                    $userId,
                    $estudiante->codigo_sis
                );

                return response()->json([
                    'success'    => false,
                    'resultado'  => 'RECHAZADO_YA_INGRESO',
                    'message'    => 'El estudiante ya registró su ingreso a esta evaluación.',
                    'error_type' => 'REINGRESO_DUPLICADO',
                ], 409);
            }
            throw $e;
        }

        $nombreCompleto = trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}");

        return response()->json([
            'success'   => true,
            'resultado' => 'PERMITIDO',
            'message'   => 'Ingreso autorizado.',
            'estudiante' => [
                'id'              => $estudiante->id,
                'nombre_completo' => $nombreCompleto !== '' ? $nombreCompleto : $estudiante->nombre,
                'codigo_sis'      => $estudiante->codigo_sis,
                'ci'              => trim("{$estudiante->ci} " . ($estudiante->ci_extension ?? '')),
                'foto_url'        => $estudiante->foto_perfil_url,
            ],
            'detalles' => [
                'materia'       => $examen->materia?->nombre ?? 'Sin asignar',
                'aula'          => $examen->aula?->nombre ?? 'Aula general',
                'hora_ingreso'  => $ahoraIngreso->format('H:i:s'),
                'fecha_ingreso' => $ahoraIngreso->format('d/m/Y'),
            ],
        ], 200);
    }

    /**
     * Registra un ingreso manual solicitado desde el panel.
     */
    public function registrarIngresoManual(Request $request, string $idExamen): JsonResponse
    {
        $request->validate([
            'id_estudiante' => 'required|uuid',
            'motivo'        => 'nullable|string|max:255',
        ]);

        $idEstudiante = $request->input('id_estudiante');
        $motivo = $request->input('motivo', 'Ingreso manual autorizado');

        $examen = Examen::with(['aula:id,nombre', 'materia:id,nombre'])->find($idExamen);
        if (!$examen) {
            return response()->json(['message' => 'La evaluación no existe.'], 404);
        }

        $usuario = $request->user();
        $rol = $usuario ? ($usuario->rol ?? class_basename($usuario)) : 'docente';

        $estudiante = Estudiante::find($idEstudiante);
        if (!$estudiante) {
            return response()->json(['message' => 'Estudiante no encontrado.'], 404);
        }

        $ingresoPrevio = LogAsistencia::where('id_examen', $examen->id)
            ->where('id_estudiante', $estudiante->id)
            ->where('resultado', 'PERMITIDO')
            ->first();

        if ($ingresoPrevio) {
            $this->registrarIntentoYAuditoria(
                $request,
                $examen->id,
                $estudiante->id,
                'REINGRESO_DUPLICADO_MANUAL',
                $rol,
                $usuario?->id,
                $estudiante->codigo_sis
            );

            return response()->json([
                'message'  => 'El estudiante ya registró su entrada previamente.',
                'detalles' => [
                    'primer_ingreso' => Carbon::parse($ingresoPrevio->fecha_escaneo)->format('H:i:s'),
                ],
            ], 409);
        }

        $inscripcion = DB::table('estudiante_examen')
            ->where('id_examen', $examen->id)
            ->where('id_estudiante', $idEstudiante)
            ->first();

        if (!$inscripcion) {
            $this->registrarIntentoYAuditoria(
                $request,
                $examen->id,
                $estudiante->id,
                'NO_INSCRITO',
                $rol,
                $usuario?->id,
                $estudiante->codigo_sis
            );

            return response()->json(['message' => 'El estudiante no está inscrito en este examen.'], 403);
        }

        if (strcasecmp(trim($inscripcion->estado ?? ''), 'Habilitado') !== 0) {
            $this->registrarIntentoYAuditoria(
                $request,
                $examen->id,
                $estudiante->id,
                'INHABILITADO',
                $rol,
                $usuario?->id,
                $estudiante->codigo_sis
            );

            return response()->json([
                'message'  => 'El estudiante figura inhabilitado para rendir esta prueba.',
                'detalles' => ['motivo' => $inscripcion->motivo_estado],
            ], 403);
        }

        $ahoraIngreso = Carbon::now('America/La_Paz');

        // Registrar ingreso autorizado y asistencia de forma atomica,
        // preservando las validaciones de inscripcion y habilitacion de Develop.
        DB::transaction(function () use ($examen, $estudiante, $motivo, $ahoraIngreso) {
            $this->registrarLog(
                $examen->id,
                $estudiante->id,
                $estudiante->codigo_sis,
                'PERMITIDO',
                "Ingreso manual autorizado. Motivo: {$motivo}",
                ['tipo_ingreso' => 'MANUAL', 'motivo' => $motivo]
            );

            DB::table('estudiante_examen')
                ->where('id_examen', $examen->id)
                ->where('id_estudiante', $estudiante->id)
                ->update([
                    'fecha_ingreso' => $ahoraIngreso,
                    'updated_at'    => now(),
                ]);
        });


        $nombreCompleto = trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}");

        return response()->json([
            'success'    => true,
            'message'    => 'Ingreso manual autorizado exitosamente.',
            'estudiante' => [
                'id'              => $estudiante->id,
                'nombre_completo' => $nombreCompleto !== '' ? $nombreCompleto : $estudiante->nombre,
                'codigo_sis'      => $estudiante->codigo_sis,
                'ci'              => $estudiante->ci,
                'foto_url'        => $estudiante->foto_perfil_url,
            ],
            'detalles' => [
                'hora_ingreso' => $ahoraIngreso->format('H:i:s'),
                'tipo_ingreso' => 'MANUAL',
            ],
        ], 200);
    }

    /**
     * Lista las asistencias registradas del examen.
     */
    public function listarAsistencias(string $idExamen): JsonResponse
    {
        $asistencias = LogAsistencia::with('estudiante:id,nombre,apellido_paterno,apellido_materno,codigo_sis,ci,ci_extension,foto_perfil_url')
            ->where('id_examen', $idExamen)
            ->where('resultado', 'PERMITIDO')
            ->orderBy('fecha_escaneo', 'desc')
            ->get()
            ->map(function ($log) {
                $payload = is_array($log->payload_qr_recibido) ? $log->payload_qr_recibido : [];
                $esManual = ($payload['tipo_ingreso'] ?? '') === 'MANUAL';

                $est = $log->estudiante;
                $nombre = $est ? trim("{$est->nombre} {$est->apellido_paterno} {$est->apellido_materno}") : 'Estudiante';

                return [
                    'id'              => $log->id,
                    'estudiante_id'   => $log->id_estudiante,
                    'nombre_completo' => $nombre,
                    'codigo_sis'      => $est?->codigo_sis ?? $log->codigo_sis_escaneado,
                    'ci'              => $est ? trim("{$est->ci} " . ($est->ci_extension ?? '')) : null,
                    'foto_url'        => $est?->foto_perfil_url,
                    'hora_ingreso'    => Carbon::parse($log->fecha_escaneo)->format('H:i:s'),
                    'fecha_ingreso'   => Carbon::parse($log->fecha_escaneo)->format('d/m/Y'),
                    'metodo'          => $esManual ? 'MANUAL' : 'QR',
                ];
            });

        return response()->json([
            'success'          => true,
            'total_ingresados' => $asistencias->count(),
            'asistencias'      => $asistencias,
        ], 200);
    }

    /**
     * Registra en log_asistencias asegurando que no aborte por check constraints.
     */
    private function registrarLog(
        string $idExamen,
        ?string $idEstudiante,
        ?string $codigoSis,
        string $resultado,
        string $mensaje,
        ?array $payload = null
    ): void {
        try {
            $sisLimpio = !empty($codigoSis) ? substr(trim($codigoSis), 0, 20) : 'DESCONOCIDO';

            LogAsistencia::create([
                'id_examen'            => $idExamen,
                'id_estudiante'        => $idEstudiante,
                'codigo_sis_escaneado' => $sisLimpio,
                'resultado'            => $resultado,
                'mensaje'              => $mensaje,
                'payload_qr_recibido'  => $payload,
                'fecha_escaneo'        => Carbon::now('America/La_Paz'),
            ]);
        } catch (\Exception $e) {
            \Log::warning("No se pudo registrar log_asistencia: " . $e->getMessage());
        }
    }

    /**
     * Registra en intentos_no_autorizados y en log_auditorias.
     */
    private function registrarIntentoYAuditoria(
        Request $request,
        string $idExamen,
        ?string $idEstudiante,
        string $tipoIntento,
        ?string $rolAuditor = null,
        ?string $userIdAuditor = null,
        ?string $identificador = null
    ): void {
        $tipoIntentoLimpio = substr(trim($tipoIntento), 0, 30);
        $idIntento = (string) Str::uuid();
        $horaBolivia = Carbon::now('America/La_Paz');

        if (!$idEstudiante && !empty($identificador) && $identificador !== 'DESCONOCIDO' && $identificador !== 'QR_INVALIDO') {
            $estudianteEncontrado = Estudiante::where('codigo_sis', trim($identificador))->first();
            if ($estudianteEncontrado) {
                $idEstudiante = $estudianteEncontrado->id;
            }
        }

        $usuarioActual = $request->user();
        $userIdFinal = $userIdAuditor ?? $usuarioActual?->id;
        $rolFinal = $rolAuditor ? strtolower($rolAuditor) : ($usuarioActual?->rol ? strtolower($usuarioActual->rol) : 'docente');

        // Inserción directa en intentos_no_autorizados
        DB::table('intentos_no_autorizados')->insert([
            'id'                       => $idIntento,
            'id_examen'                => $idExamen,
            'id_estudiante'            => $idEstudiante,
            'tipo_intento'             => $tipoIntentoLimpio,
            'registrado_por_user_type' => $rolFinal,
            'registrado_por_user_id'   => $userIdFinal,
            'fecha_hora'               => $horaBolivia->toDateTimeString(),
            'created_at'               => $horaBolivia,
            'updated_at'               => $horaBolivia,
        ]);

        // Registro en log_auditorias (sin updated_at)
        try {
            $nombreCompleto = $usuarioActual
                ? trim("{$usuarioActual->nombre} {$usuarioActual->apellido_paterno} {$usuarioActual->apellido_materno}")
                : 'Sistema / Auditor';

            LogAuditoria::create([
                'user_type'         => $usuarioActual ? get_class($usuarioActual) : 'Sistema',
                'user_id'           => $userIdFinal,
                'rol_en_el_momento' => $rolFinal,
                'usuario_nombre'    => $nombreCompleto !== '' ? $nombreCompleto : 'Auditor',
                'usuario_email'     => $usuarioActual?->email ?? 'sistema@sciem.edu.bo',
                'modulo'            => 'INTENTOS_NO_AUTORIZADOS',
                'accion'            => 'INTENTO_NO_AUTORIZADO_REGISTRADO',
                'ip_origen'         => $request->ip() ?? '127.0.0.1',
                'user_agent'        => $request->userAgent() ?? 'App',
                'detalles'          => [
                    'intento_id'    => $idIntento,
                    'id_examen'     => $idExamen,
                    'id_estudiante' => $idEstudiante,
                    'tipo_intento'  => $tipoIntentoLimpio,
                    'identificador' => substr($identificador ?? 'DESCONOCIDO', 0, 30),
                ],
                'created_at'        => $horaBolivia,
            ]);
        } catch (\Exception $e) {
            \Log::warning("No se pudo registrar log_auditoria: " . $e->getMessage());
        }
    }
}