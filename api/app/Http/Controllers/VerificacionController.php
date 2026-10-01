<?php

namespace App\Http\Controllers;

use App\Models\Estudiante;
use App\Models\Examen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class VerificacionController extends Controller
{
    public function verificarIngreso(Request $request, $examenId)
    {
        //front envia qr
        $request->validate([
            'qr_data' => 'required|string'
        ]);

        $qrData = $request->input('qr_data');

        //decoficar qr
        $datosDecodificados = json_decode($qrData, true);

        if (json_last_error() !== JSON_ERROR_NONE || !isset($datosDecodificados['sis'])) {
            return response()->json([
                'success' => false,
                'message' => 'Formato de QR inválido o dañado.',
            ], 400);
        }

        $codigoSis = $datosDecodificados['sis'];
        //buscar estudiante
        $estudiante = Estudiante::where('codigo_sis', $codigoSis)->first();

        if (!$estudiante) {
            return response()->json([
                'success' => false,
                'message' => 'Estudiante no encontrado en el sistema.',
            ], 404);
        }

        $inscripcion = $estudiante->examenes()->where('id_examen', $examenId)->first();
        //buscar los datos generales del examen para mostrar el aula y materia
        $examen = Examen::with(['materia', 'aula'])->find($examenId);

        if (!$inscripcion) {
            //existe pero no esta inscrito en este examen
            return response()->json([
                'success' => false,
                'message' => 'Estudiante no inscrito en este examen.',
                'student' => [
                    'nombre_completo' => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                    'codigo_sis' => $estudiante->codigo_sis,
                    'ci' => $estudiante->ci . ($estudiante->ci_extension ? '-' . $estudiante->ci_extension : '')
                ],
                'exam_info' => [
                    'estado_inscripcion' => 'No Inscrito',
                    'asignatura' => $examen->materia->nombre ?? 'N/A',
                    'aula_asignada' => $examen->aula->nombre ?? 'N/A'
                ]
            ], 403);
        }

        //estudiante inscrito se devuelve la info
        return response()->json([
            'success' => true,
            'message' => 'Estudiante verificado correctamente.',
            'student' => [
                'id' => $estudiante->id,
                'nombre_completo' => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                'codigo_sis' => $estudiante->codigo_sis,
                'ci' => $estudiante->ci . ($estudiante->ci_extension ? '-' . $estudiante->ci_extension : ''),
                //si se incluteyla foto 
                // 'foto_url' => $estudiante->foto ? asset('storage/fotos/' . $estudiante->foto) : null,
            ],
            'exam_info' => [
                'estado_inscripcion' => $inscripcion->pivot->estado,
                'motivo' => $inscripcion->pivot->motivo_inhabilitacion,
                'asignatura' => $examen->materia->nombre ?? 'N/A',
                'aula_asignada' => $examen->aula->nombre ?? 'N/A'
            ]
        ], 200);
    }
}