<?php

namespace App\Http\Controllers;

use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\LogAsistencia;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;

class VerificacionController extends Controller
{
    /**
     * Valida el ingreso de un estudiante mediante escaneo de su código QR.
     *
     * Valida:
     * 1. Integridad del JSON del QR (debe contener 'sis').
     * 2. Correspondencia de materia (si el QR especifica 'materia').
     * 3. Existencia del estudiante en el sistema.
     * 4. Inscripción en el examen activo.
     * 5. Estado de habilitación ('Habilitado').
     * 6. Prevención de reingreso (no haber ingresado previamente al examen).
     */
    public function verificarIngreso(Request $request, string $idExamen): JsonResponse
    {
        $request->validate([
            'qr_data' => 'required|string',
        ]);

        $rawQr = $request->input('qr_data');
        $qrData = json_decode($rawQr, true);

        // 1. Validar formato JSON del QR
        if (!is_array($qrData) || empty($qrData['sis'])) {
            $this->registrarLog(
                $idExamen,
                null,
                null,
                'ERROR_DATOS_INVALIDOS',
                'El código QR escaneado no tiene una estructura JSON válida o carece del campo SIS.',
                ['raw_content' => $rawQr]
            );

            return response()->json([
                'resultado' => 'ERROR_DATOS_INVALIDOS',
                'message'   => 'El formato del código QR es inválido o no reconocido.',
            ], 400);
        }

        $codigoSis = trim((string) $qrData['sis']);
        $materiaQr = isset($qrData['materia']) ? trim((string) $qrData['materia']) : null;

        // Cargar examen con aula y materia
        $examen = Examen::with(['aula:id,nombre', 'materia:id,nombre'])->find($idExamen);

        if (!$examen) {
            return response()->json([
                'resultado' => 'EXAMEN_NO_ENCONTRADO',
                'message'   => 'La evaluación académica solicitada no existe.',
            ], 404);
        }

        // 2. Validar correspondencia de la materia si viene en el QR
        if ($materiaQr && $examen->materia) {
            if (strcasecmp($materiaQr, trim($examen->materia->nombre)) !== 0) {
                $this->registrarLog(
                    $examen->id,
                    null,
                    $codigoSis,
                    'RECHAZADO_MATERIA_INCORRECTA',
                    "El QR pertenece a la materia '{$materiaQr}' y el examen es de '{$examen->materia->nombre}'.",
                    $qrData
                );

                return response()->json([
                    'resultado' => 'RECHAZADO_MATERIA_INCORRECTA',
                    'message'   => "Código QR incorrecto. Corresponde a la materia: {$materiaQr}.",
                ], 403);
            }
        }

        // 3. Buscar estudiante en el padrón
        $estudiante = Estudiante::where('codigo_sis', $codigoSis)->first();

        if (!$estudiante) {
            $this->registrarLog(
                $examen->id,
                null,
                $codigoSis,
                'RECHAZADO_NO_INSCRITO',
                "El código SIS {$codigoSis} no pertenece a ningún estudiante registrado en el sistema.",
                $qrData
            );

            return response()->json([
                'resultado' => 'RECHAZADO_NO_INSCRITO',
                'message'   => 'Estudiante no registrado en el sistema.',
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

            return response()->json([
                'resultado' => 'RECHAZADO_NO_INSCRITO',
                'message'   => 'El estudiante no se encuentra inscrito en esta evaluación.',
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

            return response()->json([
                'resultado' => 'RECHAZADO_INHABILITADO',
                'message'   => 'Estudiante inhabilitado para rendir este examen.',
                'detalles'  => [
                    'motivo_inhabilitacion' => $motivo,
                ],
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
                'resultado' => 'RECHAZADO_YA_INGRESO',
                'message'   => 'El estudiante ya registró su ingreso a esta evaluación.',
                'detalles'  => [
                    'primer_ingreso' => Carbon::parse($ingresoPrevio->fecha_escaneo)->format('d/m/Y H:i:s'),
                ],
            ], 409);
        }

        // 7. Acceso Autorizado
        $examen->estudiantes()->updateExistingPivot(
            $estudiante->id,
            [
                'fecha_ingreso' => now('America/La_Paz'),
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

        $this->registrarLog(
            $examen->id,
            $estudiante->id,
            $codigoSis,
            'RECHAZADO_YA_INGRESO',
            'El estudiante ya registró un ingreso exitoso previamente.',
            $qrData
        );

        return response()->json([
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
            'resultado' => 'PERMITIDO',
            'message'   => 'Ingreso autorizado.',
            'estudiante' => [
                'id'              => $estudiante->id,
                'nombre_completo' => $nombreCompleto !== '' ? $nombreCompleto : $estudiante->nombre,
                'codigo_sis'      => $estudiante->codigo_sis,
                'ci'              => trim("{$estudiante->ci} " . ($estudiante->ci_extension ?? '')),
            ],
            'detalles' => [
                'materia'      => $examen->materia?->nombre ?? 'Sin asignar',
                'aula'         => $examen->aula?->nombre ?? 'Aula general',
                'hora_ingreso' => Carbon::now('America/La_Paz')->format('H:i:s'),
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

        // Validar inscripción
        $inscripcion = $examen->estudiantes()->where('estudiantes.id', $idEstudiante)->first();
        if (!$inscripcion) {
            return response()->json(['message' => 'El estudiante no está inscrito en este examen.'], 403);
        }

        // Validar habilitación
        if (($inscripcion->pivot->estado ?? '') !== 'Habilitado') {
            return response()->json([
                'message' => 'El estudiante figura inhabilitado para rendir esta prueba.',
                'detalles' => ['motivo' => $inscripcion->pivot->motivo_estado],
            ], 403);
        }

        // Prevenir duplicado
        $ingresoPrevio = LogAsistencia::where('id_examen', $examen->id)
            ->where('id_estudiante', $estudiante->id)
            ->where('resultado', 'PERMITIDO')
            ->first();

        if ($ingresoPrevio) {
            return response()->json([
                'message' => 'El estudiante ya registró su entrada previamente.',
                'detalles' => [
                    'primer_ingreso' => Carbon::parse($ingresoPrevio->fecha_escaneo)->format('H:i:s'),
                ],
            ], 409);
        }

        // Registrar asistencia manual
        $this->registrarLog(
            $examen->id,
            $estudiante->id,
            $estudiante->codigo_sis,
            'PERMITIDO',
            "Ingreso manual autorizado. Motivo: {$motivo}",
            ['tipo_ingreso' => 'MANUAL', 'motivo' => $motivo]
        );

        $nombreCompleto = trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}");

        return response()->json([
            'message' => 'Ingreso manual autorizado exitosamente.',
            'estudiante' => [
                'id'              => $estudiante->id,
                'nombre_completo' => $nombreCompleto !== '' ? $nombreCompleto : $estudiante->nombre,
                'codigo_sis'      => $estudiante->codigo_sis,
                'ci'              => $estudiante->ci,
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
        $asistencias = LogAsistencia::with('estudiante:id,nombre,apellido_paterno,apellido_materno,codigo_sis,ci,ci_extension')
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
                    'hora_ingreso'    => Carbon::parse($log->fecha_escaneo)->format('H:i:s'),
                    'fecha_ingreso'   => Carbon::parse($log->fecha_escaneo)->format('d/m/Y'),
                    'metodo'          => $esManual ? 'MANUAL' : 'QR',
                ];
            });

        return response()->json([
            'total_ingresados' => $asistencias->count(),
            'asistencias'      => $asistencias,
        ]);
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
        LogAsistencia::create([
            'id_examen'             => $idExamen,
            'id_estudiante'         => $idEstudiante,
            'codigo_sis_escaneado'  => $codigoSis,
            'resultado'             => $resultado,
            'mensaje'               => $mensaje,
            'payload_qr_recibido'   => $payload,
            'fecha_escaneo'         => Carbon::now('America/La_Paz'),
        ]);
    }
}