<?php

namespace App\Http\Controllers;

use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\IntentoNoAutorizado;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EscanerController extends Controller
{
    /**
     * Endpoint para escanear QR y auditar intentos indebidos (HU-13)
     */
    public function escanear(Request $request, string $idExamen): JsonResponse
    {
        $request->validate([
            'qr_data' => 'required|string',
        ]);

        $rawQr = $request->input('qr_data');
        $idExamenToken = null;
        $expiraEn = null;
        $qrData = [];

        // 1. Detección robusta de formato (JSON directo de React o Token firmado Base64/JWT)
        $trimmedQr = trim($rawQr);
        if (str_starts_with($trimmedQr, '{') && str_ends_with($trimmedQr, '}')) {
            $qrData = json_decode($trimmedQr, true) ?? [];
        } elseif (str_contains($trimmedQr, '.')) {
            $partes = explode('.', $trimmedQr);
            $payloadJson = base64_decode($partes[0]);
            $qrData = json_decode($payloadJson, true) ?? [];
            $idExamenToken = $qrData['id_examen'] ?? null;
            $expiraEn = isset($qrData['expira_en']) ? Carbon::parse($qrData['expira_en']) : null;
        }

        $codigoSis = $qrData['sis'] ?? $qrData['codigo_sis'] ?? $trimmedQr;
        $examen = Examen::with('materia:id,nombre')->findOrFail($idExamen);

        // Capturar datos del usuario autenticado (docente o auxiliar)
        $usuario = $request->user();
        $rol = $usuario ? ($usuario->rol ?? class_basename($usuario)) : 'docente';
        $userId = $usuario?->id;

        // 2. Validar expiración si el QR incluye fecha límite
        if ($expiraEn && Carbon::now()->greaterThan($expiraEn)) {
            return response()->json([
                'success'   => false,
                'resultado' => 'RECHAZADO_QR_EXPIRADO',
                'message'   => 'El código QR ha expirado. El estudiante debe generar uno nuevo.',
            ], 403);
        }

        // 3. Validar correspondencia de examen si viene dentro del token
        if ($idExamenToken && $idExamenToken !== $examen->id) {
            IntentoNoAutorizado::create([
                'id_examen'                => $examen->id,
                'id_estudiante'            => null,
                'identificador_presentado' => $codigoSis,
                'tipo_intento'             => 'NO_INSCRITO',
                'motivo'                   => 'QR corresponde a otro examen o materia distinta',
                'registrado_por_user_type' => $rol,
                'registrado_por_user_id'   => $userId,
                'fecha_hora'               => Carbon::now('America/La_Paz'),
            ]);

            return response()->json([
                'success'   => false,
                'resultado' => 'RECHAZADO_EXAMEN_DISTINTO',
                'message'   => 'El código QR presentado corresponde a otra evaluación.',
            ], 403);
        }

        // 4. Validar materia si el QR la especifica
        $materiaQr = $qrData['materia'] ?? null;
        if ($materiaQr && $examen->materia && strcasecmp(trim($materiaQr), trim($examen->materia->nombre)) !== 0) {
            IntentoNoAutorizado::create([
                'id_examen'                => $examen->id,
                'id_estudiante'            => null,
                'identificador_presentado' => $codigoSis,
                'tipo_intento'             => 'NO_INSCRITO',
                'motivo'                   => "Materia no corresponde (Presentó: '{$materiaQr}', Examen: '{$examen->materia->nombre}')",
                'registrado_por_user_type' => $rol,
                'registrado_por_user_id'   => $userId,
                'fecha_hora'               => Carbon::now('America/La_Paz'),
            ]);

            return response()->json([
                'success'   => false,
                'resultado' => 'RECHAZADO_MATERIA_DISTINTA',
                'message'   => "Código QR incorrecto. Corresponde a la materia: {$materiaQr}.",
            ], 403);
        }

        // 5. Buscar estudiante en el sistema universitario
        $estudiante = Estudiante::where('codigo_sis', $codigoSis)->first();

        if (!$estudiante) {
            IntentoNoAutorizado::create([
                'id_examen'                => $examen->id,
                'id_estudiante'            => null,
                'identificador_presentado' => $codigoSis,
                'tipo_intento'             => 'NO_INSCRITO',
                'motivo'                   => 'Estudiante no registrado en el sistema universitario',
                'registrado_por_user_type' => $rol,
                'registrado_por_user_id'   => $userId,
                'fecha_hora'               => Carbon::now('America/La_Paz'),
            ]);

            return response()->json([
                'success'   => false,
                'resultado' => 'RECHAZADO_NO_REGISTRADO',
                'message'   => 'El estudiante no está registrado en el sistema.',
            ], 403);
        }

        // 6. CASO A: Verificar si está matriculado en este examen
        $inscripcion = DB::table('estudiante_examen')
            ->where('id_examen', $examen->id)
            ->where('id_estudiante', $estudiante->id)
            ->first();

        if (!$inscripcion) {
            IntentoNoAutorizado::create([
                'id_examen'                => $examen->id,
                'id_estudiante'            => $estudiante->id,
                'identificador_presentado' => $estudiante->codigo_sis,
                'tipo_intento'             => 'NO_INSCRITO',
                'motivo'                   => 'No matriculado en el examen',
                'registrado_por_user_type' => $rol,
                'registrado_por_user_id'   => $userId,
                'fecha_hora'               => Carbon::now('America/La_Paz'),
            ]);

            return response()->json([
                'success'   => false,
                'resultado' => 'RECHAZADO_NO_INSCRITO',
                'message'   => 'El estudiante no se encuentra inscrito en esta evaluación.',
                'estudiante' => [
                    'nombre' => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                    'sis'    => $estudiante->codigo_sis,
                ]
            ], 403);
        }

        // 7. CASO B: Verificar si está inhabilitado por prerrequisitos
        $estado = $inscripcion->estado ?? 'Inhabilitado';

        if ($estado !== 'Habilitado') {
            $motivoObs = $inscripcion->motivo_estado ?? 'No cumple con los prerrequisitos asignados.';

            IntentoNoAutorizado::create([
                'id_examen'                => $examen->id,
                'id_estudiante'            => $estudiante->id,
                'identificador_presentado' => $estudiante->codigo_sis,
                'tipo_intento'             => 'INHABILITADO',
                'motivo'                   => $motivoObs,
                'registrado_por_user_type' => $rol,
                'registrado_por_user_id'   => $userId,
                'fecha_hora'               => Carbon::now('America/La_Paz'),
            ]);

            return response()->json([
                'success'   => false,
                'resultado' => 'RECHAZADO_INHABILITADO',
                'message'   => 'Estudiante inhabilitado para rendir este examen.',
                'detalles'  => [
                    'motivo_inhabilitacion' => $motivoObs,
                ],
                'estudiante' => [
                    'nombre' => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                    'sis'    => $estudiante->codigo_sis,
                ]
            ], 403);
        }

        // 8. Si cumple todo, registrar ingreso en la tabla pivote
        DB::table('estudiante_examen')
            ->where('id_examen', $examen->id)
            ->where('id_estudiante', $estudiante->id)
            ->update([
                'fecha_ingreso' => Carbon::now('America/La_Paz'),
            ]);

        return response()->json([
            'success'   => true,
            'resultado' => 'PERMITIDO',
            'message'   => 'Ingreso autorizado.',
            'estudiante' => [
                'nombre' => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                'sis'    => $estudiante->codigo_sis,
            ]
        ], 200);
    }
}