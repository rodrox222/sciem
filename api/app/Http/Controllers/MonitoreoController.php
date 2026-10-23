<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Examen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MonitoreoController extends Controller
{
    public function resumen(Request $request, string $idExamen): JsonResponse
    {
        $usuario = $request->user();

        if (!$usuario || !in_array(get_class($usuario), [
            Admin::class,
            Docente::class,
            Auxiliar::class,
        ], true)) {
            return response()->json([
                'message' => 'No tienes permiso para consultar el monitoreo.',
            ], 403);
        }

        $examen = Examen::find($idExamen);

        if (!$examen) {
            return response()->json([
                'message' => 'El examen no existe.',
            ], 404);
        }

        if ($usuario instanceof Docente && $examen->id_docente !== $usuario->id) {
            return response()->json([
                'message' => 'No tienes permiso para consultar este examen.',
            ], 403);
        }

        $totales = DB::table('estudiante_examen')
            ->where('id_examen', $examen->id)
            ->selectRaw('COUNT(*) AS total_estudiantes')
            ->selectRaw('COUNT(fecha_ingreso) AS total_ingresados')
            ->selectRaw('COUNT(*) - COUNT(fecha_ingreso) AS total_ausentes')
            ->first();

        return response()->json([
            'examen' => [
                'id' => $examen->id,
                'nombre' => $examen->nombre,
                'fecha' => $examen->fecha?->format('Y-m-d'),
            ],
            'resumen' => [
                'total_estudiantes' => (int) $totales->total_estudiantes,
                'total_ingresados' => (int) $totales->total_ingresados,
                'total_ausentes' => (int) $totales->total_ausentes,
            ],
        ]);
    }
}
