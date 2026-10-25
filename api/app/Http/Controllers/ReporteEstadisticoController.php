<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Docente;
use App\Models\Examen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReporteEstadisticoController extends Controller
{
    public function resumen(Request $request, string $idExamen): JsonResponse
    {
        $usuario = $request->user();

        // Solo administradores y docentes pueden consultar reportes.
        if (!$usuario || !in_array(get_class($usuario), [
            Admin::class,
            Docente::class,
        ], true)) {
            return response()->json([
                'message' => 'No tienes permiso para consultar reportes estadísticos.',
            ], 403);
        }

        $examen = Examen::find($idExamen);

        if (!$examen) {
            return response()->json([
                'message' => 'El examen no existe.',
            ], 404);
        }

        // Un docente solo puede consultar sus propios exámenes.
        if (
            $usuario instanceof Docente
            && (string) $examen->id_docente !== (string) $usuario->id
        ) {
            return response()->json([
                'message' => 'No tienes permiso para generar el reporte de este examen.',
            ], 403);
        }

        // Asistencia y ausencia se calculan desde la nómina del examen.
        $asistencia = DB::table('estudiante_examen')
            ->where('id_examen', $examen->id)
            ->selectRaw('COUNT(*) AS total_inscritos')
            ->selectRaw('COUNT(fecha_ingreso) AS total_asistentes')
            ->selectRaw('COUNT(*) - COUNT(fecha_ingreso) AS total_ausentes')
            ->first();

        // Los intentos se cuentan desde sus registros de auditoría.
        $intentos = DB::table('logs_asistencias')
            ->where('id_examen', $examen->id)
            ->selectRaw(
                "COUNT(*) FILTER (WHERE resultado = ?) AS intentos_inhabilitados",
                ['RECHAZADO_INHABILITADO']
            )
            ->selectRaw(
                "COUNT(*) FILTER (WHERE resultado = ?) AS intentos_no_inscritos",
                ['RECHAZADO_NO_INSCRITO']
            )
            ->selectRaw(
                "COUNT(*) FILTER (WHERE resultado = ?) AS ingresos_duplicados_bloqueados",
                ['RECHAZADO_YA_INGRESO']
            )
            ->first();

        return response()->json([
            'examen' => [
                'id' => $examen->id,
                'nombre' => $examen->nombre,
                'fecha' => $examen->fecha?->format('Y-m-d'),
            ],
            'resumen' => [
                'total_inscritos' => (int) $asistencia->total_inscritos,
                'total_asistentes' => (int) $asistencia->total_asistentes,
                'total_ausentes' => (int) $asistencia->total_ausentes,
                'intentos_inhabilitados' => (int) $intentos->intentos_inhabilitados,
                'intentos_no_inscritos' => (int) $intentos->intentos_no_inscritos,
                'ingresos_duplicados_bloqueados' => (int) $intentos->ingresos_duplicados_bloqueados,
            ],
        ]);
    }
}