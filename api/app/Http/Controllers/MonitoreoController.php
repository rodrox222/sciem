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
    public function estudiantes(Request $request, string $idExamen): JsonResponse
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

        $datos = $request->validate([
            'estado' => ['required', 'in:ingresados,ausentes'],
        ]);

        $consulta = $examen->estudiantes()
            ->select([
                'estudiantes.id',
                'estudiantes.codigo_sis',
                'estudiantes.ci',
                'estudiantes.nombre',
                'estudiantes.apellido_paterno',
                'estudiantes.apellido_materno',
            ]);

        if ($datos['estado'] === 'ingresados') {
            $consulta->wherePivotNotNull('fecha_ingreso');
        } else {
            $consulta->wherePivotNull('fecha_ingreso');
        }

        $estudiantes = $consulta
            ->orderBy('estudiantes.apellido_paterno')
            ->orderBy('estudiantes.apellido_materno')
            ->orderBy('estudiantes.nombre')
            ->get()
            ->map(function ($estudiante) {
                return [
                    'id' => $estudiante->id,
                    'codigo_sis' => $estudiante->codigo_sis,
                    'ci' => $estudiante->ci,
                    'nombre' => $estudiante->nombre,
                    'apellido_paterno' => $estudiante->apellido_paterno,
                    'apellido_materno' => $estudiante->apellido_materno,
                    'fecha_ingreso' => $estudiante->pivot->fecha_ingreso,
                ];
            });

        return response()->json([
            'examen' => [
                'id' => $examen->id,
                'nombre' => $examen->nombre,
            ],
            'estado' => $datos['estado'],
            'total' => $estudiantes->count(),
            'estudiantes' => $estudiantes,
        ]);
    }
}
