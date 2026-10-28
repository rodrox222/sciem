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
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Barryvdh\DomPDF\Facade\Pdf;

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
    public function descargar(Request $request, string $idExamen)
{
    $usuario = $request->user();

    // Solo administradores y docentes pueden descargar reportes.
    if (!$usuario || !in_array(get_class($usuario), [
        Admin::class,
        Docente::class,
    ], true)) {
        return response()->json([
            'message' => 'No tienes permiso para descargar reportes estadísticos.',
        ], 403);
    }

    $examen = Examen::find($idExamen);

    if (!$examen) {
        return response()->json([
            'message' => 'El examen no existe.',
        ], 404);
    }

    // El docente solo puede descargar reportes de sus propios exámenes.
    if (
        $usuario instanceof Docente
        && (string) $examen->id_docente !== (string) $usuario->id
    ) {
        return response()->json([
            'message' => 'No tienes permiso para generar el reporte de este examen.',
        ], 403);
    }

    $filtros = $this->validarFiltrosFecha($request);
    $formato = $request->query('formato', 'xlsx');

if (!in_array($formato, ['xlsx', 'pdf'], true)) {
    return response()->json([
        'message' => 'El formato debe ser xlsx o pdf.',
    ], 422);
}
    $fechaExamen = $examen->fecha?->format('Y-m-d');

    $examenDentroDelRango =
        (!isset($filtros['fecha_desde']) || $fechaExamen >= $filtros['fecha_desde'])
        && (!isset($filtros['fecha_hasta']) || $fechaExamen <= $filtros['fecha_hasta']);

    // Resumen de asistencia.
    $asistencia = DB::table('estudiante_examen')
        ->where('id_examen', $examen->id)
        ->when(!$examenDentroDelRango, fn ($query) => $query->whereRaw('1 = 0'))
        ->selectRaw('COUNT(*) AS total_inscritos')
        ->selectRaw('COUNT(fecha_ingreso) AS total_asistentes')
        ->selectRaw('COUNT(*) - COUNT(fecha_ingreso) AS total_ausentes')
        ->first();

    // Resumen de intentos rechazados.
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

    // Detalle de estudiantes inscritos y su asistencia.
    $estudiantes = DB::table('estudiante_examen as ee')
        ->join('estudiantes as e', 'e.id', '=', 'ee.id_estudiante')
        ->where('ee.id_examen', $examen->id)
        ->when(!$examenDentroDelRango, fn ($query) => $query->whereRaw('1 = 0'))
        ->select([
            'e.codigo_sis',
            'e.ci',
            'e.nombre',
            'e.apellido_paterno',
            'e.apellido_materno',
            'ee.estado',
            'ee.fecha_ingreso',
        ])
        ->orderBy('e.apellido_paterno')
        ->orderBy('e.apellido_materno')
        ->orderBy('e.nombre')
        ->get();

    // Detalle de los tres tipos de intentos rechazados del reporte.
    $registrosIntentos = DB::table('logs_asistencias as l')
        ->leftJoin('estudiantes as e', 'e.id', '=', 'l.id_estudiante')
        ->where('l.id_examen', $examen->id)
        ->whereIn('l.resultado', [
            'RECHAZADO_INHABILITADO',
            'RECHAZADO_NO_INSCRITO',
            'RECHAZADO_YA_INGRESO',
        ])
        ->when(!$examenDentroDelRango, fn ($query) => $query->whereRaw('1 = 0'))
        ->select([
            'l.resultado',
            'l.codigo_sis_escaneado',
            'l.mensaje',
            'l.fecha_escaneo',
            'e.nombre',
            'e.apellido_paterno',
            'e.apellido_materno',
        ])
        ->orderBy('l.fecha_escaneo')
        ->get();

    // Agrupar los ingresos por hora y completar las 24 franjas.
    $resultadosFranjas = DB::table('estudiante_examen')
        ->where('id_examen', $examen->id)
        ->whereNotNull('fecha_ingreso')
        ->when(!$examenDentroDelRango, fn ($query) => $query->whereRaw('1 = 0'))
        ->selectRaw('EXTRACT(HOUR FROM fecha_ingreso)::int AS hora')
        ->selectRaw('COUNT(*) AS total_ingresos')
        ->groupByRaw('EXTRACT(HOUR FROM fecha_ingreso)')
        ->orderBy('hora')
        ->get()
        ->keyBy('hora');

        // Generar PDF si se solicita ese formato.
    if ($formato === 'pdf') {
        $escape = static fn ($valor) => htmlspecialchars(
            (string) ($valor ?? '—'),
            ENT_QUOTES | ENT_SUBSTITUTE,
            'UTF-8'
        );

        $filasResumen = [
            ['Total inscritos', (int) $asistencia->total_inscritos],
            ['Total asistentes', (int) $asistencia->total_asistentes],
            ['Total ausentes', (int) $asistencia->total_ausentes],
            ['Intentos de estudiantes inhabilitados', (int) $intentos->intentos_inhabilitados],
            ['Intentos de personas no inscritas', (int) $intentos->intentos_no_inscritos],
            ['Ingresos duplicados bloqueados', (int) $intentos->ingresos_duplicados_bloqueados],
        ];

        $htmlResumen = '';

        foreach ($filasResumen as [$indicador, $cantidad]) {
            $htmlResumen .= '<tr><td>' . $escape($indicador)
                . '</td><td>' . $cantidad . '</td></tr>';
        }

        $htmlEstudiantes = '';

        foreach ($estudiantes as $estudiante) {
            $nombre = trim(
                ($estudiante->nombre ?? '') . ' '
                . ($estudiante->apellido_paterno ?? '') . ' '
                . ($estudiante->apellido_materno ?? '')
            );

            $htmlEstudiantes .= '<tr>'
                . '<td>' . $escape($estudiante->codigo_sis) . '</td>'
                . '<td>' . $escape($estudiante->ci) . '</td>'
                . '<td>' . $escape($nombre) . '</td>'
                . '<td>' . $escape($estudiante->estado) . '</td>'
                . '<td>' . ($estudiante->fecha_ingreso !== null ? 'Asistente' : 'Ausente') . '</td>'
                . '<td>' . $escape($estudiante->fecha_ingreso) . '</td>'
                . '</tr>';
        }

        $htmlIntentos = '';

        foreach ($registrosIntentos as $intento) {
            $nombre = trim(
                ($intento->nombre ?? '') . ' '
                . ($intento->apellido_paterno ?? '') . ' '
                . ($intento->apellido_materno ?? '')
            );

            $htmlIntentos .= '<tr>'
                . '<td>' . $escape($intento->resultado) . '</td>'
                . '<td>' . $escape($intento->codigo_sis_escaneado) . '</td>'
                . '<td>' . $escape($nombre) . '</td>'
                . '<td>' . $escape($intento->mensaje) . '</td>'
                . '<td>' . $escape($intento->fecha_escaneo) . '</td>'
                . '</tr>';
        }

        $htmlFranjas = '';

        for ($hora = 0; $hora < 24; $hora++) {
            $htmlFranjas .= '<tr>'
                . '<td>' . sprintf('%02d:00', $hora) . '</td>'
                . '<td>' . sprintf('%02d:00', ($hora + 1) % 24) . '</td>'
                . '<td>' . (int) ($resultadosFranjas->get($hora)->total_ingresos ?? 0) . '</td>'
                . '</tr>';
        }

        $html = '<!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            
<style>
    @page {
        margin: 28px 30px 35px 30px;
    }

    body {
        font-family: DejaVu Sans, sans-serif;
        font-size: 9px;
        line-height: 1.4;
        color: #222;
        background: #fff;
    }

    h1 {
        font-size: 18px;
        font-weight: normal;
        text-align: center;
        padding-bottom: 10px;
        margin-bottom: 14px;
        border-bottom: 1px solid #777;
    }

    h2 {
        font-size: 12px;
        font-weight: bold;
        margin-top: 20px;
        margin-bottom: 6px;
        padding-bottom: 4px;
        border-bottom: 0.5px solid #aaa;
    }

    p {
        margin: 4px 0;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 7px;
        margin-bottom: 12px;
    }

    thead {
        display: table-header-group;
    }

    th {
        font-weight: bold;
        text-align: left;
        padding: 5px 4px;
        border-top: 0.7px solid #777;
        border-bottom: 0.7px solid #777;
        background: #fff;
    }

    td {
        text-align: left;
        padding: 4px;
        border: none;
        border-bottom: 0.4px solid #ccc;
        vertical-align: top;
    }

    tr {
        page-break-inside: avoid;
    }

    .pie {
        margin-top: 22px;
        padding-top: 6px;
        border-top: 0.7px solid #777;
        text-align: center;
        font-size: 8px;
        color: #555;
    }
</style>

        </head>
        <body>
            <h1>Reporte estadístico del examen</h1>
            <p><strong>Examen:</strong> ' . $escape($examen->nombre) . '</p>
            <p><strong>Fecha:</strong> ' . $escape($fechaExamen) . '</p>
            <p><strong>Zona horaria:</strong> America/La_Paz</p>
            <p><strong>Fecha desde:</strong> ' . $escape($filtros['fecha_desde'] ?? 'Sin límite') . '</p>
            <p><strong>Fecha hasta:</strong> ' . $escape($filtros['fecha_hasta'] ?? 'Sin límite') . '</p>

            <h2>Resumen</h2>
            <table>
                <thead><tr><th>Indicador</th><th>Cantidad</th></tr></thead>
                <tbody>' . $htmlResumen . '</tbody>
            </table>

            <h2>Detalle de asistencia</h2>
            <table>
                <thead><tr>
                    <th>Código SIS</th><th>CI</th><th>Estudiante</th>
                    <th>Estado</th><th>Asistencia</th><th>Fecha de ingreso</th>
                </tr></thead>
                <tbody>' . $htmlEstudiantes . '</tbody>
            </table>

            <h2>Intentos rechazados</h2>
            <table>
                <thead><tr>
                    <th>Resultado</th><th>Código SIS</th><th>Estudiante</th>
                    <th>Mensaje</th><th>Fecha del intento</th>
                </tr></thead>
                <tbody>' . $htmlIntentos . '</tbody>
            </table>

            <h2>Ingresos por franja horaria</h2>
            <table>
                <thead><tr><th>Desde</th><th>Hasta</th><th>Total de ingresos</th></tr></thead>
                <tbody>' . $htmlFranjas . '</tbody>
            </table>
                    <div class="pie">
                Reporte estadístico del examen · Zona horaria: America/La_Paz
            </div>
        </body>
        </html>';

        return Pdf::loadHTML($html)
            ->setPaper('a4', 'landscape')
            ->download('reporte_estadistico_' . $examen->id . '.pdf');
    }

    // Crear el libro Excel.
    $spreadsheet = new Spreadsheet();

    // Hoja 1: Resumen.
    $hoja = $spreadsheet->getActiveSheet();
    $hoja->setTitle('Resumen');

    $hoja->fromArray([
        ['REPORTE ESTADÍSTICO DEL EXAMEN'],
        ['Examen', $examen->nombre],
        ['Fecha del examen', $fechaExamen],
        ['Zona horaria', 'America/La_Paz'],
        ['Fecha desde', $filtros['fecha_desde'] ?? 'Sin límite'],
        ['Fecha hasta', $filtros['fecha_hasta'] ?? 'Sin límite'],
        [],
        ['Indicador', 'Cantidad'],
        ['Total inscritos', (int) $asistencia->total_inscritos],
        ['Total asistentes', (int) $asistencia->total_asistentes],
        ['Total ausentes', (int) $asistencia->total_ausentes],
        ['Intentos de estudiantes inhabilitados', (int) $intentos->intentos_inhabilitados],
        ['Intentos de personas no inscritas', (int) $intentos->intentos_no_inscritos],
        ['Ingresos duplicados bloqueados', (int) $intentos->ingresos_duplicados_bloqueados],
    ], null, 'A1', true);

    // Hoja 2: Asistencia.
    $hojaAsistencia = $spreadsheet->createSheet();
    $hojaAsistencia->setTitle('Asistencia');

    $hojaAsistencia->fromArray([
        [
            'Código SIS',
            'CI',
            'Nombre',
            'Apellido paterno',
            'Apellido materno',
            'Estado de habilitación',
            'Asistencia',
            'Fecha y hora de ingreso',
        ],
    ], null, 'A1');

    $fila = 2;

    foreach ($estudiantes as $estudiante) {
        $hojaAsistencia->fromArray([[
            $estudiante->codigo_sis ?? '',
            $estudiante->ci ?? '',
            $estudiante->nombre ?? '',
            $estudiante->apellido_paterno ?? '',
            $estudiante->apellido_materno ?? '',
            $estudiante->estado ?? '',
            $estudiante->fecha_ingreso !== null ? 'Asistente' : 'Ausente',
            $estudiante->fecha_ingreso ?? '',
        ]], null, 'A' . $fila);

        $fila++;
    }

    // Hoja 3: Intentos rechazados.
    $hojaIntentos = $spreadsheet->createSheet();
    $hojaIntentos->setTitle('Intentos');

    $hojaIntentos->fromArray([
        [
            'Tipo de rechazo',
            'Código SIS escaneado',
            'Nombre',
            'Apellido paterno',
            'Apellido materno',
            'Mensaje',
            'Fecha y hora del intento',
        ],
    ], null, 'A1');

    $fila = 2;

    foreach ($registrosIntentos as $intento) {
        $hojaIntentos->fromArray([[
            $intento->resultado ?? '',
            $intento->codigo_sis_escaneado ?? '',
            $intento->nombre ?? '',
            $intento->apellido_paterno ?? '',
            $intento->apellido_materno ?? '',
            $intento->mensaje ?? '',
            $intento->fecha_escaneo ?? '',
        ]], null, 'A' . $fila);

        $fila++;
    }

    // Hoja 4: Franjas horarias.
    $hojaFranjas = $spreadsheet->createSheet();
    $hojaFranjas->setTitle('Franjas horarias');

    $hojaFranjas->fromArray([
        ['Hora de inicio', 'Hora de fin', 'Total de ingresos'],
    ], null, 'A1');

    for ($hora = 0; $hora < 24; $hora++) {
        $hojaFranjas->fromArray([[
            sprintf('%02d:00', $hora),
            sprintf('%02d:00', ($hora + 1) % 24),
            (int) ($resultadosFranjas->get($hora)->total_ingresos ?? 0),
        ]], null, 'A' . ($hora + 2), true);
    }

    // Ajustar el ancho de las columnas para facilitar la lectura.
    foreach ($spreadsheet->getAllSheets() as $hojaActual) {
        foreach (range('A', $hojaActual->getHighestDataColumn()) as $columna) {
            $hojaActual->getColumnDimension($columna)->setAutoSize(true);
        }
    }

    $nombreArchivo = 'reporte_estadistico_' . $examen->id . '.xlsx';

    return response()->streamDownload(
        function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
        },
        $nombreArchivo,
        [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]
    );
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
