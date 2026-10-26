<?php

namespace App\Http\Controllers;

use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\IntentoNoAutorizado;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EscanerController extends Controller
{
    /**
     * Endpoint para escanear QR y auditar intentos indebidos (HU-13)
     * POST /api/examenes/{id_examen}/escanear-ingreso
     */
    public function escanear(Request $request, string $idExamen): JsonResponse
    {
        $request->validate([
            'qr_data' => 'required|string',
        ]);

        $rawQr = $request->input('qr_data');
        $idExamenToken = null;
        $idEstudianteToken = null;
        $codigoSis = null;
        $materiaQr = null;
        $qrData = [];

        $trimmedQr = trim($rawQr);

        // Detección de formato (JSON crudo o Token Base64 con HMAC)
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
            $codigoSis = $trimmedQr;
        }

        $examen = Examen::with('materia:id,nombre')->findOrFail($idExamen);

        // Capturar datos del usuario auditor (docente o auxiliar)
        $usuario = $request->user();
        $rol = $usuario ? ($usuario->rol ?? class_basename($usuario)) : 'docente';
        $userId = $usuario?->id;

        // Identificar al estudiante en el sistema antes de evaluar las reglas
        $estudiante = null;
        if ($idEstudianteToken && Str::isUuid($idEstudianteToken)) {
            $estudiante = Estudiante::find($idEstudianteToken);
        }
        if (!$estudiante && $codigoSis) {
            $estudiante = Estudiante::where('codigo_sis', $codigoSis)->first();
        }

        // QR DE OTRO EXAMEN O MATERIA DISTINTA
        $esExamenDistinto = ($idExamenToken && $idExamenToken !== $examen->id);
        $esMateriaDistinta = ($materiaQr && $examen->materia && strcasecmp(trim($materiaQr), trim($examen->materia->nombre)) !== 0);

        if ($esExamenDistinto || $esMateriaDistinta) {
            IntentoNoAutorizado::create([
                'id_examen'                => $examen->id,
                'id_estudiante'            => $estudiante?->id, // Asocia al estudiante si existe en el sistema
                'tipo_intento'             => 'EXAMEN_DISTINTO',
                'registrado_por_user_type' => $rol,
                'registrado_por_user_id'   => $userId,
                'fecha_hora'               => Carbon::now('America/La_Paz'),
            ]);

            return response()->json([
                'success'   => false,
                'resultado' => 'RECHAZADO_EXAMEN_DISTINTO',
                'message'   => 'El código QR presentado corresponde a otra evaluación o materia.',
            ], 403);
        }

        // USUARIO NO REGISTRADO EN EL SISTEMA
        if (!$estudiante) {
            IntentoNoAutorizado::create([
                'id_examen'                => $examen->id,
                'id_estudiante'            => null,
                'tipo_intento'             => 'NO_REGISTRADO',
                'registrado_por_user_type' => $rol,
                'registrado_por_user_id'   => $userId,
                'fecha_hora'               => Carbon::now('America/La_Paz'),
            ]);

            return response()->json([
                'success'   => false,
                'resultado' => 'RECHAZADO_NO_REGISTRADO',
                'message'   => 'El estudiante no está registrado en el sistema universitario.',
            ], 403);
        }

        // ESTUDIANTE NO INSCRITO A ESTE EXAMEN
        $inscripcion = DB::table('estudiante_examen')
            ->where('id_examen', $examen->id)
            ->where('id_estudiante', $estudiante->id)
            ->first();

        if (!$inscripcion) {
            IntentoNoAutorizado::create([
                'id_examen'                => $examen->id,
                'id_estudiante'            => $estudiante->id,
                'tipo_intento'             => 'NO_INSCRITO',
                'registrado_por_user_type' => $rol,
                'registrado_por_user_id'   => $userId,
                'fecha_hora'               => Carbon::now('America/La_Paz'),
            ]);

            return response()->json([
                'success'    => false,
                'resultado'  => 'RECHAZADO_NO_INSCRITO',
                'message'    => 'El estudiante no se encuentra inscrito en este examen.',
                'estudiante' => [
                    'nombre' => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                    'sis'    => $estudiante->codigo_sis,
                ]
            ], 403);
        }

        // ESTUDIANTE QUE NO CUMPLE REQUERIMIENTOS (INHABILITADO)
        $estado = $inscripcion->estado ?? 'Inhabilitado';

        if ($estado !== 'Habilitado') {
            IntentoNoAutorizado::create([
                'id_examen'                => $examen->id,
                'id_estudiante'            => $estudiante->id,
                'tipo_intento'             => 'INHABILITADO',
                'registrado_por_user_type' => $rol,
                'registrado_por_user_id'   => $userId,
                'fecha_hora'               => Carbon::now('America/La_Paz'),
            ]);

            return response()->json([
                'success'    => false,
                'resultado'  => 'RECHAZADO_INHABILITADO',
                'message'    => 'Estudiante inhabilitado para rendir este examen.',
                'estudiante' => [
                    'nombre'   => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                    'sis'      => $estudiante->codigo_sis,
                    'ci'       => $estudiante->ci,
                    'foto_url' => $estudiante->foto_perfil_url,
                ]
            ], 403);
        }

        // INGRESO AUTORIZADO
        DB::table('estudiante_examen')
            ->where('id_examen', $examen->id)
            ->where('id_estudiante', $estudiante->id)
            ->update([
                'fecha_ingreso' => Carbon::now('America/La_Paz'),
            ]);

        return response()->json([
            'success'    => true,
            'resultado'  => 'PERMITIDO',
            'message'    => 'Ingreso autorizado.',
            'estudiante' => [
                'nombre'   => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                'sis'      => $estudiante->codigo_sis,
                'ci'       => $estudiante->ci,
                'foto_url' => $estudiante->foto_perfil_url,
            ]
        ], 200);
    }
}