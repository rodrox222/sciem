<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Docente;
use App\Models\Examen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

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
        $filtros = $this->validarFiltrosFecha($request);

$fechaExamen = $examen->fecha?->format('Y-m-d');

$examenDentroDelRango =
    (!isset($filtros['fecha_desde']) || $fechaExamen >= $filtros['fecha_desde'])
    && (!isset($filtros['fecha_hasta']) || $fechaExamen <= $filtros['fecha_hasta']);

        // Asistencia y ausencia se calculan desde la nómina del examen.
        $asistencia = DB::table('estudiante_examen')
            ->where('id_examen', $examen->id)
            ->when(!$examenDentroDelRango, fn ($query) => $query->whereRaw('1 = 0'))
            ->selectRaw('COUNT(*) AS total_inscritos')
            ->selectRaw('COUNT(fecha_ingreso) AS total_asistentes')
            ->selectRaw('COUNT(*) - COUNT(fecha_ingreso) AS total_ausentes')
            ->first();

        // Los intentos se cuentan desde sus registros de auditoría.
        $intentos = DB::table('logs_asistencias')
            ->where('id_examen', $examen->id)
            ->when(!$examenDentroDelRango, fn ($query) => $query->whereRaw('1 = 0'))
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

    private function validarFiltrosFecha(Request $request): array
    {
        $validator = Validator::make(
    $request->query(),
    [
        'fecha_desde' => ['sometimes', 'required', 'date_format:Y-m-d'],
        'fecha_hasta' => ['sometimes', 'required', 'date_format:Y-m-d'],
    ],
    [
        'fecha_desde.required' => 'La fecha inicial es obligatoria.',
        'fecha_desde.date_format' => 'La fecha inicial debe tener el formato AAAA-MM-DD.',
        'fecha_hasta.required' => 'La fecha final es obligatoria.',
        'fecha_hasta.date_format' => 'La fecha final debe tener el formato AAAA-MM-DD.',
    ]
);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $filtros = $validator->validated();

        if (
            isset($filtros['fecha_desde'], $filtros['fecha_hasta'])
            && $filtros['fecha_hasta'] < $filtros['fecha_desde']
        ) {
            throw ValidationException::withMessages([
                'fecha_hasta' => [
                    'La fecha final no puede ser anterior a la fecha inicial.',
                ],
            ]);
        }

        return $filtros;
    }


    public function franjasHorarias(Request $request, string $idExamen): JsonResponse
    {
        $usuario = $request->user();

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

        if (
            $usuario instanceof Docente
            && (string) $examen->id_docente !== (string) $usuario->id
        ) {
            return response()->json([
                'message' => 'No tienes permiso para generar el reporte de este examen.',
            ], 403);
        }

                $filtros = $this->validarFiltrosFecha($request);

        $fechaExamen = $examen->fecha?->format('Y-m-d');

        $examenDentroDelRango =
            (!isset($filtros['fecha_desde']) || $fechaExamen >= $filtros['fecha_desde'])
            && (!isset($filtros['fecha_hasta']) || $fechaExamen <= $filtros['fecha_hasta']);

        // Agrupar los ingresos efectivos por hora local de Bolivia.
        $resultados = DB::table('estudiante_examen')
            ->where('id_examen', $examen->id)
            ->when(!$examenDentroDelRango, fn ($query) => $query->whereRaw('1 = 0'))
            ->whereNotNull('fecha_ingreso')
            ->selectRaw(
                "EXTRACT(HOUR FROM fecha_ingreso)::int AS hora"
            )
            ->selectRaw('COUNT(*) AS total_ingresos')
            ->groupByRaw('EXTRACT(HOUR FROM fecha_ingreso)')
            ->orderBy('hora')
            ->get()
            ->keyBy('hora');

        $franjas = [];

        for ($hora = 0; $hora < 24; $hora++) {
            $franjas[] = [
                'inicio' => sprintf('%02d:00', $hora),
                'fin' => sprintf('%02d:00', ($hora + 1) % 24),
                'total_ingresos' => (int) ($resultados->get($hora)->total_ingresos ?? 0),
            ];
        }

        return response()->json([
            'examen' => [
                'id' => $examen->id,
                'nombre' => $examen->nombre,
                'fecha' => $examen->fecha?->format('Y-m-d'),
            ],
            'zona_horaria' => 'America/La_Paz',
            'unidad' => 'hora',
            'franjas' => $franjas,
        ]);
    }
}
