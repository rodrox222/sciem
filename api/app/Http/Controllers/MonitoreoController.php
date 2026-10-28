<?php

namespace App\Http\Controllers;

use App\Models\Admin;
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

        if (
            !$usuario ||
            !in_array(get_class($usuario), [Admin::class, Docente::class], true)
        ) {
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

        if (
            $usuario instanceof Docente &&
            $examen->id_docente !== $usuario->id
        ) {
            return response()->json([
                'message' => 'No tienes permiso para consultar este examen.',
            ], 403);
        }

        $totalEstudiantes = DB::table('estudiante_examen')
            ->where('id_examen', $examen->id)
            ->count();

        $totalIngresados = DB::table('logs_asistencias')
            ->where('id_examen', $examen->id)
            ->where('resultado', 'PERMITIDO')
            ->whereNotNull('id_estudiante')
            ->distinct()
            ->count('id_estudiante');

        return response()->json([
            'examen' => [
                'id' => $examen->id,
                'nombre' => $examen->nombre,
                'fecha' => $examen->fecha?->format('Y-m-d'),
            ],
            'resumen' => [
                'total_estudiantes' => (int) $totalEstudiantes,
                'total_ingresados' => (int) $totalIngresados,
                'total_ausentes' => max(0, (int) $totalEstudiantes - (int) $totalIngresados),
            ],
        ]);
    }

    public function estudiantes(Request $request, string $idExamen): JsonResponse
    {
        $usuario = $request->user();

        if (
            !$usuario ||
            !in_array(get_class($usuario), [Admin::class, Docente::class], true)
        ) {
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

        if (
            $usuario instanceof Docente &&
            $examen->id_docente !== $usuario->id
        ) {
            return response()->json([
                'message' => 'No tienes permiso para consultar este examen.',
            ], 403);
        }

        $datos = $request->validate([
            'estado' => ['required', 'in:ingresados,ausentes'],
        ]);

        $ingresos = DB::table('logs_asistencias')
            ->select('id_estudiante')
            ->selectRaw('MIN(fecha_escaneo) AS fecha_ingreso')
            ->where('id_examen', $examen->id)
            ->where('resultado', 'PERMITIDO')
            ->whereNotNull('id_estudiante')
            ->groupBy('id_estudiante');

        $consulta = DB::table('estudiante_examen as ee')
            ->join('estudiantes as e', 'e.id', '=', 'ee.id_estudiante')
            ->leftJoinSub($ingresos, 'ingresos', function ($join) {
                $join->on('ingresos.id_estudiante', '=', 'ee.id_estudiante');
            })
            ->where('ee.id_examen', $examen->id)
            ->select([
                'e.id',
                'e.codigo_sis',
                'e.ci',
                'e.nombre',
                'e.apellido_paterno',
                'e.apellido_materno',
                'ingresos.fecha_ingreso',
            ]);

        if ($datos['estado'] === 'ingresados') {
            $consulta->whereNotNull('ingresos.fecha_ingreso');
        } else {
            $consulta->whereNull('ingresos.fecha_ingreso');
        }

        $estudiantes = $consulta
            ->orderBy('e.apellido_paterno')
            ->orderBy('e.apellido_materno')
            ->orderBy('e.nombre')
            ->get();

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
