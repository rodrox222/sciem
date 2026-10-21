<?php

namespace App\Http\Controllers;

use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\LogAsistencia;
use App\Models\IntentoNoAutorizado;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class VerificacionController extends Controller
{
    /**
     * Valida el ingreso de un estudiante mediante escaneo de su código QR (HU-13 / HU-19).
     *
     * Valida:
     * 0. Permiso del auditor si es auxiliar (HU-19: asignación Aceptada obligatoria).
     * 1. Decodificación dual: JSON crudo o Token Base64 con HMAC.
     * 2. Correspondencia de materia o examen.
     * 3. Existencia del estudiante en el sistema universitario.
     * 4. Inscripción en el examen activo.
     * 5. Estado de habilitación ('Habilitado').
     * 6. Prevención de reingreso duplicado.
     */
    public function verificarIngreso(Request $request, string $idExamen): JsonResponse
    {
        $request->validate([
            'qr_data' => 'required|string',
        ]);

        $rawQr = $request->input('qr_data');
        $trimmedQr = trim($rawQr);

        $idExamenToken = null;
        $idEstudianteToken = null;
        $codigoSis = null;
        $materiaQr = null;
        $qrData = [];

        // 1. Detección robusta de formato (JSON directo o Token Base64/HMAC)
        if (str_starts_with($trimmedQr, '{') && str_ends_with($trimmedQr, '}')) {
            $qrData = json_decode($trimmedQr, true) ?? [];
            $codigoSis = $qrData['sis'] ?? $qrData['codigo_sis'] ?? null;
            $materiaQr = $qrData['materia'] ?? null;
            $idExamenToken = $qrData['id_examen'] ?? null;
        } elseif (str_contains($trimmedQr, '.')) {
            $partes = explode('.', $trimmedQr);
            $payloadJson = base64_decode($partes[0]);
            $qrData = json_decode($payloadJson, true) ?? [];

            $idExamenToken     = $qrData['id_examen'] ?? null;
            $idEstudianteToken = $qrData['id_estudiante'] ?? null;
            $codigoSis         = $qrData['codigo_sis'] ?? $qrData['sis'] ?? null;
        } else {
            // Solo se toma como código SIS si es numérico y de longitud válida (UMSS: 7 a 10 dígitos)
            if (ctype_digit($trimmedQr) && strlen($trimmedQr) <= 15) {
                $codigoSis = $trimmedQr;
            } else {
                $codigoSis = null; 
            }
        }

        // Cargar examen con aula y materia
        $examen = Examen::with(['aula:id,nombre', 'materia:id,nombre'])->find($idExamen);

        if (!$examen) {
            return response()->json([
                'resultado' => 'EXAMEN_NO_ENCONTRADO',
                'message'   => 'La evaluación académica solicitada no existe.',
            ], 404);
        }

        // Capturar datos del usuario que opera el escáner (docente o auxiliar)
        $usuario = $request->user();
        $rol = $usuario ? ($usuario->rol ?? class_basename($usuario)) : 'docente';
        $userId = $usuario?->id;

        // HU-19 (Criterio 10): Si quien escanea es un auxiliar, verificar que su asignación esté 'Aceptada'
        if ($usuario instanceof Auxiliar) {
            $asignacion = DB::table('examen_auxiliar')
                ->where('id_examen', $examen->id)
                ->where('id_auxiliar', $usuario->id)
                ->value('estado');

            if ($asignacion !== 'Aceptada') {
                return response()->json([
                    'success'    => false,
                    'resultado'  => 'AUXILIAR_NO_ASIGNADO',
                    'message'    => 'Acceso denegado: no cuenta con una asignación aceptada para controlar este examen.',
                    'error_type' => 'AUXILIAR_NO_ASIGNADO',
                ], 403);
            }
        }

        // Validar formato del QR
        if (empty($codigoSis) && empty($idEstudianteToken)) {
            $this->registrarLog(
                $examen->id,
                null,
                'DESCONOCIDO',
                'ERROR_DATOS_INVALIDOS',
                'El código QR escaneado no tiene una estructura JSON válida o carece del campo SIS.',
                ['raw_content' => substr($rawQr, 0, 500)]
            );

            // Se registra el intento en la tabla de auditoría 
            $this->registrarIntentoNoAutorizado(
                $examen->id,
                null,
                'NO_REGISTRADO',
                $rol,
                $userId
            );

            return response()->json([
                'success'   => false,
                'resultado' => 'ERROR_DATOS_INVALIDOS',
                'message'   => 'El formato del código QR es inválido o no reconocido.',
            ], 400);
        }

        // Buscar estudiante en el padrón institucional
        $estudiante = null;
        if ($idEstudianteToken && Str::isUuid($idEstudianteToken)) {
            $estudiante = Estudiante::find($idEstudianteToken);
        }
        if (!$estudiante && $codigoSis) {
            $estudiante = Estudiante::where('codigo_sis', $codigoSis)->first();
        }

        // 2. Validar correspondencia de examen o materia
        $esExamenDistinto = ($idExamenToken && $idExamenToken !== $examen->id);
        $esMateriaDistinta = ($materiaQr && $examen->materia && strcasecmp(trim($materiaQr), trim($examen->materia->nombre)) !== 0);

        if ($esExamenDistinto || $esMateriaDistinta) {
            $this->registrarLog(
                $examen->id,
                $estudiante?->id,
                $codigoSis,
                'RECHAZADO_NO_INSCRITO',
                "El QR presentado no corresponde a esta evaluación.",
                $qrData
            );

            $this->registrarIntentoNoAutorizado(
                $examen->id,
                $estudiante?->id,
                'EXAMEN_DISTINTO', 
                $rol,
                $userId
            );

            return response()->json([
                'success'   => false,
                'resultado' => 'RECHAZADO_EXAMEN_DISTINTO',
                'message'   => 'El código QR presentado corresponde a otra evaluación o materia.',
            ], 403);
        }

        // 3. Estudiante no registrado en el sistema universitario
        if (!$estudiante) {
            $this->registrarLog(
                $examen->id,
                null,
                $codigoSis,
                'RECHAZADO_NO_REGISTRADO',
                "El código SIS {$codigoSis} no pertenece a ningún estudiante registrado en el sistema.",
                $qrData
            );

            $this->registrarIntentoNoAutorizado(
                $examen->id,
                null,
                'NO_REGISTRADO',
                $rol,
                $userId
            );

            return response()->json([
                'success'   => false,
                'resultado' => 'RECHAZADO_NO_REGISTRADO',
                'message'   => 'El estudiante no está registrado en el sistema universitario.',
            ], 403);
        }

        // 4. Verificar relación e inscripción en el examen
        $inscripcion = $examen->estudiantes()
            ->where('estudiantes.id', $estudiante->id)
            ->first();

        if (!$inscripcion) {
            $this->registrarLog(
                $examen->id,
                $estudiante->id,
                $codigoSis,
                'RECHAZADO_NO_INSCRITO',
                'El estudiante está registrado pero no forma parte de la nómina de este examen.',
                $qrData
            );

            $this->registrarIntentoNoAutorizado(
                $examen->id,
                $estudiante->id,
                'NO_INSCRITO',
                $rol,
                $userId
            );

            return response()->json([
                'success'    => false,
                'resultado'  => 'RECHAZADO_NO_INSCRITO',
                'message'    => 'El estudiante no se encuentra inscrito en esta evaluación.',
                'estudiante' => [
                    'nombre' => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                    'sis'    => $estudiante->codigo_sis,
                ]
            ], 403);
        }

        // 5. Verificar estado de habilitación
        $estado = $inscripcion->pivot->estado ?? 'Inhabilitado';

        if ($estado !== 'Habilitado') {
            $motivo = $inscripcion->pivot->motivo_estado ?? 'No cumple con los prerrequisitos asignados.';

            $this->registrarLog(
                $examen->id,
                $estudiante->id,
                $codigoSis,
                'RECHAZADO_INHABILITADO',
                "Ingreso denegado por inhabilitación. Motivo: {$motivo}",
                $qrData
            );

            $this->registrarIntentoNoAutorizado(
                $examen->id,
                $estudiante->id,
                'INHABILITADO',
                $rol,
                $userId
            );

            return response()->json([
                'success'    => false,
                'resultado'  => 'RECHAZADO_INHABILITADO',
                'message'    => 'Estudiante inhabilitado para rendir este examen.',
                'detalles'   => [
                    'motivo_inhabilitacion' => $motivo,
                ],
                'estudiante' => [
                    'nombre'   => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                    'sis'      => $estudiante->codigo_sis,
                    'ci'       => $estudiante->ci,
                    'foto_url' => $estudiante->foto_perfil_url,
                ]
            ], 403);
        }

        // 6. Prevenir reingresos duplicados
        $ingresoPrevio = LogAsistencia::where('id_examen', $examen->id)
            ->where('id_estudiante', $estudiante->id)
            ->where('resultado', 'PERMITIDO')
            ->first();

        if ($ingresoPrevio) {
            $this->registrarLog(
                $examen->id,
                $estudiante->id,
                $codigoSis,
                'RECHAZADO_YA_INGRESO',
                'El estudiante ya registró un ingreso exitoso previamente.',
                $qrData
            );

            return response()->json([
                'success'   => false,
                'resultado' => 'RECHAZADO_YA_INGRESO',
                'message'   => 'El estudiante ya registró su ingreso a esta evaluación.',
                'detalles'  => [
                    'primer_ingreso' => Carbon::parse($ingresoPrevio->fecha_escaneo)->format('d/m/Y H:i:s'),
                ],
            ], 409);
        }

        // 7. Acceso Autorizado (Actualizar pivote y crear log)
        $examen->estudiantes()->updateExistingPivot(
            $estudiante->id,
            [
                'fecha_ingreso' => Carbon::now('America/La_Paz'),
            ]
        );

        try {
            $this->registrarLog(
                $examen->id,
                $estudiante->id,
                $codigoSis,
                'PERMITIDO',
                'Ingreso validado y autorizado exitosamente.',
                $qrData
            );
        } catch (QueryException $e) {
            if ($e->getCode() === '23505') {
                $ingresoPrevio = LogAsistencia::where('id_examen', $examen->id)
                    ->where('id_estudiante', $estudiante->id)
                    ->where('resultado', 'PERMITIDO')
                    ->first();

                return response()->json([
                    'success'   => false,
                    'resultado' => 'RECHAZADO_YA_INGRESO',
                    'message'   => 'El estudiante ya registró su ingreso a esta evaluación.',
                    'detalles'  => [
                        'primer_ingreso' => $ingresoPrevio
                            ? Carbon::parse($ingresoPrevio->fecha_escaneo)->format('d/m/Y H:i:s')
                            : null,
                    ],
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
                'hora_ingreso'  => Carbon::now('America/La_Paz')->format('H:i:s'),
                'fecha_ingreso' => Carbon::now('America/La_Paz')->format('d/m/Y'),
            ],
        ], 200);
    }

    /**
     * Registra el ingreso manual de un estudiante al examen sin usar código QR.
     */
    public function registrarIngresoManual(Request $request, string $idExamen): JsonResponse
    {
        $request->validate([
            'id_estudiante' => 'required|uuid',
            'motivo'        => 'nullable|string|max:255',
        ]);

        $idEstudiante = $request->input('id_estudiante');
        $motivo = $request->input('motivo', 'Ingreso manual autorizado por docente/auxiliar');

        $examen = Examen::with(['aula:id,nombre', 'materia:id,nombre'])->find($idExamen);
        if (!$examen) {
            return response()->json(['message' => 'La evaluación no existe.'], 404);
        }

        $estudiante = Estudiante::find($idEstudiante);
        if (!$estudiante) {
            return response()->json(['message' => 'Estudiante no encontrado.'], 404);
        }

        $inscripcion = $examen->estudiantes()->where('estudiantes.id', $idEstudiante)->first();
        if (!$inscripcion) {
            return response()->json(['message' => 'El estudiante no está inscrito en este examen.'], 403);
        }

        if (($inscripcion->pivot->estado ?? '') !== 'Habilitado') {
            return response()->json([
                'message'  => 'El estudiante figura inhabilitado para rendir esta prueba.',
                'detalles' => ['motivo' => $inscripcion->pivot->motivo_estado],
            ], 403);
        }

        $ingresoPrevio = LogAsistencia::where('id_examen', $examen->id)
            ->where('id_estudiante', $estudiante->id)
            ->where('resultado', 'PERMITIDO')
            ->first();

        if ($ingresoPrevio) {
            return response()->json([
                'message'  => 'El estudiante ya registró su entrada previamente.',
                'detalles' => [
                    'primer_ingreso' => Carbon::parse($ingresoPrevio->fecha_escaneo)->format('H:i:s'),
                ],
            ], 409);
        }

        $this->registrarLog(
            $examen->id,
            $estudiante->id,
            $estudiante->codigo_sis,
            'PERMITIDO',
            "Ingreso manual autorizado. Motivo: {$motivo}",
            ['tipo_ingreso' => 'MANUAL', 'motivo' => $motivo]
        );

        $examen->estudiantes()->updateExistingPivot(
            $estudiante->id,
            [
                'fecha_ingreso' => Carbon::now('America/La_Paz'),
            ]
        );

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
                'hora_ingreso' => Carbon::now('America/La_Paz')->format('H:i:s'),
                'tipo_ingreso' => 'MANUAL',
            ],
        ], 200);
    }

    /**
     * Lista los estudiantes que ya ingresaron a la evaluación.
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
     * Guarda el registro de intento/éxito en la tabla logs_asistencias.
     */
    private function registrarLog(
        string $idExamen,
        ?string $idEstudiante,
        ?string $codigoSis,
        string $resultado,
        string $mensaje,
        ?array $payload = null
    ): void {
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
    }

    /**
     * Guarda el intento no autorizado en la tabla intentos_no_autorizados (HU-13)
     */
    private function registrarIntentoNoAutorizado(
        string $idExamen,
        ?string $idEstudiante,
        string $tipoIntento,
        ?string $rolAuditor = null,
        ?string $userIdAuditor = null
    ): void {
        IntentoNoAutorizado::create([
            'id_examen'                => $idExamen,
            'id_estudiante'            => $idEstudiante,
            'tipo_intento'             => $tipoIntento,
            'registrado_por_user_type' => $rolAuditor ? strtolower($rolAuditor) : null,
            'registrado_por_user_id'   => $userIdAuditor,
            'fecha_hora'               => Carbon::now('America/La_Paz'),
        ]);
    }
}