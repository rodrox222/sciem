<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Docente;
use App\Models\Examen;
use App\Models\Expulsion;
use App\Models\Estudiante;
use App\Models\IntentoNoAutorizado;
use App\Models\LogAsistencia;
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

        $examen = \App\Services\AccesoExamen::buscar($idExamen);

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
        $asistencia = \App\Services\AsistenciaExamen::nomina($examen->id)
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

    $examen = \App\Services\AccesoExamen::buscar($idExamen);

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
    $asistencia = \App\Services\AsistenciaExamen::nomina($examen->id)
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
    $estudiantes = \App\Services\AsistenciaExamen::nomina($examen->id)
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
    $resultadosFranjas = \App\Services\AsistenciaExamen::nomina($examen->id)
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

public function descargarAuditoriaPuerta(Request $request, string $idExamen)
{
    $usuario = $request->user();

    if (!$usuario || !in_array(get_class($usuario), [
        Admin::class,
        Docente::class,
    ], true)) {
        return response()->json([
            'message' => 'No tienes permiso para descargar la auditoría de puerta.',
        ], 403);
    }

    $examen = \App\Services\AccesoExamen::buscar($idExamen);

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
            'message' => 'No tienes permiso para generar la auditoría de este examen.',
        ], 403);
    }

    $filtros = $this->validarFiltrosFecha($request);
    $formato = $request->query('formato', 'pdf');

    if (!in_array($formato, ['pdf', 'xlsx'], true)) {
        return response()->json([
            'message' => 'El formato debe ser pdf o xlsx.',
        ], 422);
    }

    // Intentos no autorizados registrados durante la verificación.
    $intentos = DB::table('intentos_no_autorizados as i')
        ->leftJoin('estudiantes as e', 'e.id', '=', 'i.id_estudiante')
        ->where('i.id_examen', $examen->id)
        ->when(
            isset($filtros['fecha_desde']),
            fn ($q) => $q->whereDate('i.fecha_hora', '>=', $filtros['fecha_desde'])
        )
        ->when(
            isset($filtros['fecha_hasta']),
            fn ($q) => $q->whereDate('i.fecha_hora', '<=', $filtros['fecha_hasta'])
        )
        ->select([
            'i.fecha_hora',
            'i.tipo_intento',
            'i.identificador_presentado',
            'i.motivo',
            'i.registrado_por_user_type',
            'i.registrado_por_user_id',
            'e.codigo_sis',
            'e.ci',
            'e.nombre',
            'e.apellido_paterno',
            'e.apellido_materno',
        ])
        ->orderBy('i.fecha_hora')
        ->get();

    // Intentos rechazados registrados durante el escaneo.
    $rechazos = DB::table('logs_asistencias as l')
        ->leftJoin('estudiantes as e', 'e.id', '=', 'l.id_estudiante')
        ->where('l.id_examen', $examen->id)
        ->whereIn('l.resultado', [
            'RECHAZADO_INHABILITADO',
            'RECHAZADO_NO_INSCRITO',
            'RECHAZADO_YA_INGRESO',
        ])
        ->when(
            isset($filtros['fecha_desde']),
            fn ($q) => $q->whereDate('l.fecha_escaneo', '>=', $filtros['fecha_desde'])
        )
        ->when(
            isset($filtros['fecha_hasta']),
            fn ($q) => $q->whereDate('l.fecha_escaneo', '<=', $filtros['fecha_hasta'])
        )
        ->select([
            'l.fecha_escaneo',
            'l.resultado',
            'l.codigo_sis_escaneado',
            'l.mensaje',
            'e.ci',
            'e.nombre',
            'e.apellido_paterno',
            'e.apellido_materno',
        ])
        ->orderBy('l.fecha_escaneo')
        ->get();

    $registros = collect();

    foreach ($intentos as $intento) {
        $registros->push([
            'fecha' => $intento->fecha_hora,
            'tipo' => $intento->tipo_intento,
            'identificador' => $intento->identificador_presentado
                ?: ($intento->codigo_sis ?? ''),
            'ci' => $intento->ci ?? '',
            'estudiante' => trim(implode(' ', array_filter([
                $intento->nombre,
                $intento->apellido_paterno,
                $intento->apellido_materno,
            ]))),
            'motivo' => $intento->motivo ?? '',
            'responsable' => $intento->registrado_por_user_type ?? '',
            'id_responsable' => $intento->registrado_por_user_id ?? '',
            'fuente' => 'Intento no autorizado',
        ]);
    }

    foreach ($rechazos as $rechazo) {
        $registros->push([
            'fecha' => $rechazo->fecha_escaneo,
            'tipo' => $rechazo->resultado,
            'identificador' => $rechazo->codigo_sis_escaneado ?? '',
            'ci' => $rechazo->ci ?? '',
            'estudiante' => trim(implode(' ', array_filter([
                $rechazo->nombre,
                $rechazo->apellido_paterno,
                $rechazo->apellido_materno,
            ]))),
            'motivo' => $rechazo->mensaje ?? '',
            'responsable' => '',
            'id_responsable' => '',
            'fuente' => 'Registro de escaneo',
        ]);
    }

    $registros = $registros->sortBy('fecha')->values();

    if ($formato === 'xlsx') {
        $spreadsheet = new Spreadsheet();
        $hoja = $spreadsheet->getActiveSheet();
        $hoja->setTitle('Auditoría de puerta');

        $hoja->fromArray([
            ['AUDITORÍA DE INTENTOS DE ANOMALÍAS Y FRAUDE EN PUERTA'],
            ['Examen', $examen->nombre],
            ['Fecha del examen', $examen->fecha?->format('d/m/Y') ?? ''],
            ['Zona horaria', 'America/La_Paz'],
            ['Fecha desde', $filtros['fecha_desde'] ?? 'Sin límite'],
            ['Fecha hasta', $filtros['fecha_hasta'] ?? 'Sin límite'],
            ['Total de registros', $registros->count()],
            [],
            [
                'Fecha y hora',
                'Tipo de intento',
                'Identificador',
                'CI',
                'Estudiante',
                'Motivo',
                'Responsable',
                'ID responsable',
                'Fuente',
            ],
        ], null, 'A1');

        $fila = 10;

        foreach ($registros as $registro) {
            $hoja->fromArray([[
                $registro['fecha'],
                $registro['tipo'],
                $registro['identificador'],
                $registro['ci'],
                $registro['estudiante'],
                $registro['motivo'],
                $registro['responsable'],
                $registro['id_responsable'],
                $registro['fuente'],
            ]], null, 'A' . $fila);

            $fila++;
        }

        foreach (range('A', 'I') as $columna) {
            $hoja->getColumnDimension($columna)->setAutoSize(true);
        }

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, 'auditoria_puerta_' . $examen->id . '.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    $escape = static fn ($valor) => htmlspecialchars(
        (string) ($valor ?? '—'),
        ENT_QUOTES | ENT_SUBSTITUTE,
        'UTF-8'
    );

    $filas = '';

    foreach ($registros as $registro) {
        $filas .= '<tr>'
            . '<td>' . $escape($registro['fecha']) . '</td>'
            . '<td>' . $escape($registro['tipo']) . '</td>'
            . '<td>' . $escape($registro['identificador']) . '</td>'
            . '<td>' . $escape($registro['ci']) . '</td>'
            . '<td>' . $escape($registro['estudiante']) . '</td>'
            . '<td>' . $escape($registro['motivo']) . '</td>'
            . '<td>' . $escape($registro['responsable']) . '</td>'
            . '<td>' . $escape($registro['fuente']) . '</td>'
            . '</tr>';
    }

    if ($registros->isEmpty()) {
        $filas = '<tr><td colspan="8">No existen registros de intentos para este examen.</td></tr>';
    }

    $html = '<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            @page { margin: 25px; }
            body { font-family: DejaVu Sans, sans-serif; font-size: 8px; }
            h1 { text-align: center; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { border-top: 1px solid #777; border-bottom: 1px solid #777; text-align: left; }
            td, th { padding: 5px 3px; vertical-align: top; }
            td { border-bottom: 0.4px solid #ccc; }
        </style>
    </head>
    <body>
        <h1>Auditoría de intentos de anomalías y fraude en puerta</h1>
        <p><strong>Examen:</strong> ' . $escape($examen->nombre) . '</p>
        <p><strong>Fecha:</strong> ' . $escape($examen->fecha?->format('d/m/Y')) . '</p>
        <p><strong>Zona horaria:</strong> America/La_Paz</p>
        <p><strong>Periodo:</strong> '
            . $escape($filtros['fecha_desde'] ?? 'Sin límite')
            . ' a '
            . $escape($filtros['fecha_hasta'] ?? 'Sin límite')
            . '</p>
        <p><strong>Total de registros:</strong> ' . $registros->count() . '</p>
        <table>
            <thead>
                <tr>
                    <th>Fecha y hora</th>
                    <th>Tipo</th>
                    <th>Identificador</th>
                    <th>CI</th>
                    <th>Estudiante</th>
                    <th>Motivo</th>
                    <th>Responsable</th>
                    <th>Fuente</th>
                </tr>
            </thead>
            <tbody>' . $filas . '</tbody>
        </table>
    </body>
    </html>';

    return Pdf::loadHTML($html)
        ->setPaper('a4', 'landscape')
        ->download('auditoria_puerta_' . $examen->id . '.pdf');
}
public function descargarMatrizHabilitacionAsistencia(Request $request, string $idExamen)
{
    // 1. Validar formato y filtros
    $formato = strtolower($request->query('formato', 'pdf'));

    if (!in_array($formato, ['pdf', 'xlsx'], true)) {
        return response()->json([
            'mensaje' => 'El formato debe ser pdf o xlsx.'
        ], 422);
    }

    $filtros = $this->validarFiltrosFecha($request);

    // 2. Verificar acceso al examen
    $examen = \App\Services\AccesoExamen::buscar($idExamen);

    if (!$examen) {
        return response()->json([
            'mensaje' => 'Examen no encontrado.'
        ], 404);
    }

    $usuario = $request->user();

    if (
        $usuario instanceof Docente &&
        $examen->id_docente !== $usuario->id
    ) {
        return response()->json([
            'mensaje' => 'No tienes permiso para consultar este examen.'
        ], 403);
    }

    // 3. Comprobar si el examen está dentro del rango de fechas
    $fechaExamen = \Carbon\Carbon::parse($examen->fecha)->toDateString();

    $examenEnRango = true;

    if (!empty($filtros['fecha_desde']) && $fechaExamen < $filtros['fecha_desde']) {
        $examenEnRango = false;
    }

    if (!empty($filtros['fecha_hasta']) && $fechaExamen > $filtros['fecha_hasta']) {
        $examenEnRango = false;
    }

    // 4. Obtener nómina de estudiantes inscritos
    $estudiantes = collect();

    if ($examenEnRango) {
        $estudiantes = \App\Services\AsistenciaExamen::nomina($examen->id)
            ->join('estudiantes as e', 'e.id', '=', 'ee.id_estudiante')
            ->leftJoin('estudiante_examen as ins', function ($join) {
                $join->on('ins.id_examen', '=', 'ee.id_examen')
                    ->on('ins.id_estudiante', '=', 'ee.id_estudiante');
            })
            ->where('ee.id_examen', $examen->id)
            ->select([
                'ee.id_estudiante',
                'ee.estado',
                'ee.motivo_estado',
                'ee.fecha_ingreso',
                'e.codigo_sis',
                'e.ci',
                'e.ci_extension',
                'e.nombre',
                'e.apellido_paterno',
                'e.apellido_materno',
                'ins.ajuste_manual',
                'ins.modificado_por_docente_id',
                'ins.fecha_ajuste_manual',
            ])
            ->orderBy('e.apellido_paterno')
            ->orderBy('e.apellido_materno')
            ->orderBy('e.nombre')
            ->get();
    }

    $idsEstudiantes = $estudiantes->pluck('id_estudiante');

    // 5. Obtener prerrequisitos del examen
    $prerrequisitos = DB::table('prerrequisitos_examen')
        ->where('id_examen', $examen->id)
        ->orderBy('titulo')
        ->get(['id', 'titulo']);

    // 6. Obtener cumplimiento de prerrequisitos por estudiante
    $detallePrerrequisitos = DB::table('estudiante_prerrequisito as ep')
        ->join(
            'prerrequisitos_examen as p',
            'p.id',
            '=',
            'ep.id_prerrequisito'
        )
        ->whereIn('ep.id_estudiante', $idsEstudiantes)
        ->where('p.id_examen', $examen->id)
        ->select([
            'ep.id_estudiante',
            'ep.id_prerrequisito',
            'ep.cumplido',
            'ep.fecha_cumplimiento',
            'ep.revisado_por_docente_id',
            'p.titulo',
        ])
        ->get()
        ->groupBy('id_estudiante');

    // 7. Obtener expulsiones vigentes y anuladas
    $expulsiones = Expulsion::withTrashed()
        ->where('id_examen', $examen->id)
        ->whereIn('id_estudiante', $idsEstudiantes)
        ->get()
        ->groupBy('id_estudiante');

    // 8. Construir la matriz principal y el detalle de prerrequisitos
    $matriz = $estudiantes->map(function ($estudiante) use (
        $prerrequisitos,
        $detallePrerrequisitos,
        $expulsiones
    ) {
        $requisitosEstudiante = $detallePrerrequisitos
            ->get($estudiante->id_estudiante, collect())
            ->keyBy('id_prerrequisito');

        $estadoRequisitos = [];

        foreach ($prerrequisitos as $prerrequisito) {
            $registro = $requisitosEstudiante->get($prerrequisito->id);

            if (!$registro) {
                $estado = 'Sin registro';
            } else {
                $estado = $registro->cumplido ? 'Cumplido' : 'Pendiente';
            }

            $estadoRequisitos[] = [
                'id_prerrequisito' => $prerrequisito->id,
                'titulo' => $prerrequisito->titulo,
                'estado' => $estado,
                'fecha_cumplimiento' => $registro->fecha_cumplimiento ?? null,
                'revisado_por_docente_id' => $registro->revisado_por_docente_id ?? null,
            ];
        }

        $expulsionesEstudiante = $expulsiones
            ->get($estudiante->id_estudiante, collect());

        $vigentes = $expulsionesEstudiante
            ->filter(fn ($expulsion) => $expulsion->deleted_at === null);

        $anuladas = $expulsionesEstudiante
            ->filter(fn ($expulsion) => $expulsion->deleted_at !== null);

        return [
            'id_estudiante' => $estudiante->id_estudiante,
            'codigo_sis' => $estudiante->codigo_sis,
            'ci' => $estudiante->ci,
            'ci_extension' => $estudiante->ci_extension,
            'nombre_completo' => trim(
                $estudiante->nombre . ' ' .
                $estudiante->apellido_paterno . ' ' .
                $estudiante->apellido_materno
            ),
            'estado' => $estudiante->estado,
            'motivo_estado' => $estudiante->motivo_estado,
            'ajuste_manual' => (bool) $estudiante->ajuste_manual,
            'modificado_por_docente_id' => $estudiante->modificado_por_docente_id,
            'fecha_ajuste_manual' => $estudiante->fecha_ajuste_manual,
            'fecha_ingreso' => $estudiante->fecha_ingreso,
            'ingreso' => $estudiante->fecha_ingreso ? 'Sí' : 'No',
            'expulsiones_vigentes' => $vigentes->count(),
            'expulsiones_anuladas' => $anuladas->count(),
            'prerrequisitos' => $estadoRequisitos,
        ];
    });

    // 9. Preparar datos generales del examen
    $datos = [
        'examen' => $examen,
        'matriz' => $matriz,
        'prerrequisitos' => $prerrequisitos,
        'fecha_generacion' => now()->format('d/m/Y H:i:s'),
        'total_estudiantes' => $matriz->count(),
        'total_habilitados' => $matriz->where('estado', 'Habilitado')->count(),
        'total_inhabilitados' => $matriz->where('estado', 'Inhabilitado')->count(),
        'total_con_ingreso' => $matriz->where('ingreso', 'Sí')->count(),
    ];

    // 10. Generar Excel
    if ($formato === 'xlsx') {
        $spreadsheet = new Spreadsheet();

        // Hoja principal
        $hoja = $spreadsheet->getActiveSheet();
        $hoja->setTitle('Matriz');

        $encabezados = [
            'Código SIS',
            'CI',
            'Extensión',
            'Estudiante',
            'Estado',
            'Motivo de estado',
            'Ajuste manual',
            'ID docente responsable',
            'Fecha de ajuste',
            'Ingreso',
            'Primera hora de ingreso',
            'Expulsiones vigentes',
            'Expulsiones anuladas',
        ];

        $hoja->fromArray($encabezados, null, 'A1');

        $fila = 2;

        foreach ($matriz as $estudiante) {
            $hoja->fromArray([
                $estudiante['codigo_sis'],
                $estudiante['ci'],
                $estudiante['ci_extension'],
                $estudiante['nombre_completo'],
                $estudiante['estado'],
                $estudiante['motivo_estado'],
                $estudiante['ajuste_manual'] ? 'Sí' : 'No',
                $estudiante['modificado_por_docente_id'],
                $estudiante['fecha_ajuste_manual'],
                $estudiante['ingreso'],
                $estudiante['fecha_ingreso'],
                $estudiante['expulsiones_vigentes'],
                $estudiante['expulsiones_anuladas'],
            ], null, 'A' . $fila);

            $fila++;
        }

        $hoja->getStyle('A1:M1')->getFont()->setBold(true);

$hoja->getStyle('A1:M1')->getBorders()->getTop()
    ->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);

$hoja->getStyle('A1:M1')->getBorders()->getBottom()
    ->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);

$ultimaFila = $hoja->getHighestRow();

if ($ultimaFila >= 2) {
    $hoja->getStyle("A2:M{$ultimaFila}")
        ->getBorders()->getBottom()
        ->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_HAIR);
}

        // Segunda hoja: detalle de prerrequisitos
        $hojaRequisitos = $spreadsheet->createSheet();
        $hojaRequisitos->setTitle('Prerrequisitos');

        $hojaRequisitos->fromArray([
            'Código SIS',
            'Estudiante',
            'Prerrequisito',
            'Estado',
            'Fecha de cumplimiento',
            'ID docente revisor',
        ], null, 'A1');

        $fila = 2;

        foreach ($matriz as $estudiante) {
            foreach ($estudiante['prerrequisitos'] as $requisito) {
                $hojaRequisitos->fromArray([
                    $estudiante['codigo_sis'],
                    $estudiante['nombre_completo'],
                    $requisito['titulo'],
                    $requisito['estado'],
                    $requisito['fecha_cumplimiento'],
                    $requisito['revisado_por_docente_id'],
                ], null, 'A' . $fila);

                $fila++;
            }
        }

        $hojaRequisitos->getStyle('A1:F1')->getFont()->setBold(true);

$hojaRequisitos->getStyle('A1:F1')->getBorders()->getTop()
    ->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);

$hojaRequisitos->getStyle('A1:F1')->getBorders()->getBottom()
    ->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);

$ultimaFilaRequisitos = $hojaRequisitos->getHighestRow();

if ($ultimaFilaRequisitos >= 2) {
    $hojaRequisitos->getStyle("A2:F{$ultimaFilaRequisitos}")
        ->getBorders()->getBottom()
        ->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_HAIR);
}

        foreach (range('A', 'F') as $columna) {
            $hojaRequisitos->getColumnDimension($columna)->setAutoSize(true);
        }

        $nombreArchivo = 'matriz_habilitacion_asistencia_' . $examen->id . '.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $nombreArchivo, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    // 11. Generar PDF
    $pdf = Pdf::loadView('reportes.matriz-habilitacion-asistencia', $datos)
        ->setPaper('a4', 'landscape');

    return $pdf->download(
        'matriz_habilitacion_asistencia_' . $examen->id . '.pdf'
    );
}
    
public function descargarActaDisciplinaria(Request $request, string $idExamen)
{
    $usuario = $request->user();

    if (!$usuario || !in_array(get_class($usuario), [
        Admin::class,
        Docente::class,
    ], true)) {
        return response()->json([
            'message' => 'No tienes permiso para descargar el acta disciplinaria.',
        ], 403);
    }

    $examen = \App\Services\AccesoExamen::buscar($idExamen);

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
            'message' => 'No tienes permiso para generar el acta de este examen.',
        ], 403);
    }

    $formato = $request->query('formato', 'pdf');

    if (!in_array($formato, ['pdf', 'xlsx'], true)) {
        return response()->json([
            'message' => 'El formato debe ser pdf o xlsx.',
        ], 422);
    }

    $filtros = $this->validarFiltrosFecha($request);

    $expulsiones = Expulsion::withTrashed()
        ->with([
            'estudiante:id,codigo_sis,ci,nombre,apellido_paterno,apellido_materno',
            'expulsadoPor',
        ])
        ->where('id_examen', $examen->id)
        ->when(
            isset($filtros['fecha_desde']),
            fn ($query) => $query->whereDate('fecha_hora', '>=', $filtros['fecha_desde'])
        )
        ->when(
            isset($filtros['fecha_hasta']),
            fn ($query) => $query->whereDate('fecha_hora', '<=', $filtros['fecha_hasta'])
        )
        ->orderBy('fecha_hora')
        ->get();

    $registros = $expulsiones->map(function ($expulsion) {
        $estudiante = $expulsion->estudiante;
        $responsable = $expulsion->expulsadoPor;

        return [
            'fecha_hora' => $expulsion->fecha_hora
                ? $expulsion->fecha_hora->copy()
                    ->setTimezone('America/La_Paz')
                    ->format('d/m/Y H:i:s')
                : '',
            'codigo_sis' => $estudiante?->codigo_sis ?? '',
            'ci' => $estudiante?->ci ?? '',
            'estudiante' => $estudiante
                ? trim(implode(' ', array_filter([
                    $estudiante->nombre,
                    $estudiante->apellido_paterno,
                    $estudiante->apellido_materno,
                ])))
                : 'Estudiante no disponible',
            'motivo' => $expulsion->motivo,
            'responsable' => $responsable?->nombre
                ?? $responsable?->name
                ?? 'No disponible',
            'rol' => $expulsion->rol_responsable ?? class_basename($expulsion->expulsado_por_type),
            'estado' => $expulsion->trashed() ? 'Anulada' : 'Vigente',
            'motivo_anulacion' => $expulsion->motivo_eliminacion ?? '',
        ];
    });

    if ($formato === 'xlsx') {
        $spreadsheet = new Spreadsheet();
        $hoja = $spreadsheet->getActiveSheet();
        $hoja->setTitle('Acta disciplinaria');

        $hoja->fromArray([
            ['ACTA DE EXPULSIONES E INCIDENCIAS'],
            ['Examen', $examen->nombre],
            ['Fecha del examen', $examen->fecha?->format('d/m/Y') ?? ''],
            ['Zona horaria', 'America/La_Paz'],
            [],
            [
                'Fecha y hora',
                'Código SIS',
                'CI',
                'Estudiante',
                'Motivo',
                'Registrado por',
                'Rol',
                'Estado',
                'Motivo de anulación',
            ],
        ], null, 'A1');

        $fila = 7;

        foreach ($registros as $registro) {
            $hoja->fromArray([[
                $registro['fecha_hora'],
                $registro['codigo_sis'],
                $registro['ci'],
                $registro['estudiante'],
                $registro['motivo'],
                $registro['responsable'],
                $registro['rol'],
                $registro['estado'],
                $registro['motivo_anulacion'],
            ]], null, 'A' . $fila);

            $fila++;
        }

        foreach (range('A', 'I') as $columna) {
            $hoja->getColumnDimension($columna)->setAutoSize(true);
        }

        $nombreArchivo = 'acta_disciplinaria_' . $examen->id . '.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, $nombreArchivo, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    $pdf = Pdf::loadView('reportes.acta-disciplinaria', [
        'examen' => $examen,
        'registros' => $registros,
        'fechaDesde' => $filtros['fecha_desde'] ?? null,
        'fechaHasta' => $filtros['fecha_hasta'] ?? null,
    ])->setPaper('A4', 'landscape');

    return $pdf->download('acta_disciplinaria_' . $examen->id . '.pdf');
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

        $examen = \App\Services\AccesoExamen::buscar($idExamen);

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
        $resultados = \App\Services\AsistenciaExamen::nomina($examen->id)
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
    
public function graficosEstadisticos(Request $request, string $idExamen): JsonResponse
{
    $usuario = $request->user();

    // 1. Validar tipo de usuario.
    if (!$usuario || !in_array(get_class($usuario), [
        Admin::class,
        Docente::class,
    ], true)) {
        return response()->json([
            'message' => 'No tienes permiso para consultar reportes estadísticos.',
        ], 403);
    }

    // 2. Verificar existencia del examen.
    $examen = \App\Services\AccesoExamen::buscar($idExamen);

    if (!$examen) {
        return response()->json([
            'message' => 'El examen no existe.',
        ], 404);
    }

    // 3. Verificar que el docente sea titular.
    if (
        $usuario instanceof Docente
        && (string) $examen->id_docente !== (string) $usuario->id
    ) {
        return response()->json([
            'message' => 'No tienes permiso para consultar reportes de este examen.',
        ], 403);
    }

    // 4. Validar intervalo de la curva.
    $validator = Validator::make($request->query(), [
        'intervalo' => ['sometimes', 'integer', 'in:5,10'],
    ], [
        'intervalo.integer' => 'El intervalo debe ser un número entero.',
        'intervalo.in' => 'El intervalo permitido es de 5 o 10 minutos.',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'message' => 'Los parámetros enviados no son válidos.',
            'errors' => $validator->errors(),
        ], 422);
    }

    // 5. Validar filtros de fecha existentes.
    $filtros = $this->validarFiltrosFecha($request);

    $intervalo = (int) $request->query('intervalo', 5);

    $fechaExamen = $examen->fecha?->format('Y-m-d');

    $examenDentroDelRango =
        (!isset($filtros['fecha_desde']) || $fechaExamen >= $filtros['fecha_desde'])
        && (!isset($filtros['fecha_hasta']) || $fechaExamen <= $filtros['fecha_hasta']);

    // 6. Obtener la nómina actual del examen.
    $nomina = $examenDentroDelRango
        ? \App\Services\AsistenciaExamen::nomina($examen->id)->get()
        : collect();

    $totalInscritos = $nomina->count();

    $idsEstudiantes = $nomina
        ->pluck('id_estudiante')
        ->map(fn ($id) => (string) $id)
        ->values();

    $estados = $nomina->keyBy(
        fn ($fila) => (string) $fila->id_estudiante
    );

    $idsPresentes = $nomina
        ->filter(fn ($fila) => !is_null($fila->fecha_ingreso))
        ->pluck('id_estudiante')
        ->map(fn ($id) => (string) $id)
        ->values();

    // 7. Obtener prerrequisitos del examen.
    $prerrequisitos = $examenDentroDelRango
        ? DB::table('prerrequisitos_examen')
            ->where('id_examen', $examen->id)
            ->get()
        : collect();

    $idsPrerrequisitos = $prerrequisitos
        ->pluck('id')
        ->values();

    $registrosPrerrequisitos = collect();

    if ($totalInscritos > 0 && $idsPrerrequisitos->isNotEmpty()) {
        $registrosPrerrequisitos = DB::table('estudiante_prerrequisito')
            ->whereIn('id_prerrequisito', $idsPrerrequisitos)
            ->whereIn('id_estudiante', $idsEstudiantes)
            ->get();
    }

    // Indexar cumplimiento por estudiante y prerrequisito.
    $cumplimiento = $registrosPrerrequisitos->keyBy(
        fn ($registro) =>
            $registro->id_estudiante . '|' . $registro->id_prerrequisito
    );

    // 8. Calcular cumplimiento general de prerrequisitos.
    $estudiantesQueCumplen = 0;

    foreach ($idsEstudiantes as $idEstudiante) {
        $cumpleTodos = true;

        foreach ($idsPrerrequisitos as $idPrerrequisito) {
            $clave = $idEstudiante . '|' . $idPrerrequisito;
            $registro = $cumplimiento->get($clave);

            if (!$registro || !$registro->cumplido) {
                $cumpleTodos = false;
                break;
            }
        }

        if ($cumpleTodos) {
            $estudiantesQueCumplen++;
        }
    }

    // 9. Obtener expulsiones vigentes.
    // La consulta normal del modelo excluye registros eliminados
    // mediante SoftDeletes.
    $idsExpulsados = collect();

if ($examenDentroDelRango && $idsEstudiantes->isNotEmpty()) {
    $consultaExpulsiones = DB::table('expulsiones')
        ->where('id_examen', $examen->id)
        ->whereIn('id_estudiante', $idsEstudiantes);

    if (\Illuminate\Support\Facades\Schema::hasColumn('expulsiones', 'deleted_at')) {
        $consultaExpulsiones->whereNull('deleted_at');
    }

    $idsExpulsados = $consultaExpulsiones
        ->pluck('id_estudiante')
        ->map(fn ($id) => (string) $id)
        ->unique()
        ->values();
}

    $totalExpulsados = $idsExpulsados->count();

    // 10. Embudo de asistencia.
    $totalPresentes = $idsPresentes->count();

$idsPresentesEfectivos = $nomina
    ->filter(function ($estudiante) use ($idsExpulsados) {
        $idEstudiante = (string) $estudiante->id_estudiante;

        return !is_null($estudiante->fecha_ingreso)
            && $estudiante->estado === 'Habilitado'
            && !$idsExpulsados->contains($idEstudiante);
    })
    ->pluck('id_estudiante')
    ->map(fn ($id) => (string) $id)
    ->unique()
    ->values();

$evaluadosEfectivos = $idsPresentesEfectivos->count();

    // 11. Gráfico de cumplimiento por prerrequisito.
    $graficoPrerrequisitos = [];

    foreach ($prerrequisitos as $prerrequisito) {
        $cumplidos = 0;

        foreach ($idsEstudiantes as $idEstudiante) {
            $clave = $idEstudiante . '|' . $prerrequisito->id;
            $registro = $cumplimiento->get($clave);

            if ($registro && $registro->cumplido) {
                $cumplidos++;
            }
        }

        $incumplidos = $totalInscritos - $cumplidos;

        $graficoPrerrequisitos[] = [
            'id_prerrequisito' => $prerrequisito->id,
            'requisito' => $prerrequisito->titulo,
            'total_inscritos' => $totalInscritos,
            'cumplidos' => $cumplidos,
            'incumplidos' => $incumplidos,
            'porcentaje_incumplimiento' => $totalInscritos > 0
                ? round(($incumplidos / $totalInscritos) * 100, 2)
                : 0,
        ];
    }

    // 12. Distribución general de asistencia.
    // Las categorías son excluyentes y se cuentan sobre la nómina.
    $distribucion = [
        'expulsados' => 0,
        'inhabilitados' => 0,
        'presentes' => 0,
        'ausentes' => 0,
    ];

    foreach ($nomina as $estudiante) {
        $idEstudiante = (string) $estudiante->id_estudiante;

        if ($idsExpulsados->contains($idEstudiante)) {
            $distribucion['expulsados']++;
        } elseif ($estudiante->estado === 'Inhabilitado') {
            $distribucion['inhabilitados']++;
        } elseif (!is_null($estudiante->fecha_ingreso)) {
            $distribucion['presentes']++;
        } else {
            $distribucion['ausentes']++;
        }
    }

    // 13. Curva de flujo de escaneos.
    // hora_ini se utiliza como referencia porque la tabla examenes
    // no contiene una hora independiente de apertura de puerta.
    $curvaFlujo = [];

    if ($examenDentroDelRango) {
        $zonaHoraria = 'America/La_Paz';

        $inicio = \Carbon\Carbon::parse(
            $fechaExamen . ' ' . $examen->hora_ini,
            $zonaHoraria
        );

        $fin = \Carbon\Carbon::parse(
            $fechaExamen . ' ' . $examen->hora_fin,
            $zonaHoraria
        );

        // Permitir exámenes que terminen después de medianoche.
        if ($fin->lessThanOrEqualTo($inicio)) {
            $fin->addDay();
        }

        $totalMinutos = $inicio->diffInMinutes($fin);

        $cantidadIntervalos = (int) ceil($totalMinutos / $intervalo);

        $curvaFlujo = [];

        for ($i = 0; $i < $cantidadIntervalos; $i++) {
            $desde = $inicio->copy()->addMinutes($i * $intervalo);
            $hasta = $desde->copy()->addMinutes($intervalo);

            if ($hasta->greaterThan($fin)) {
                $hasta = $fin->copy();
            }

            $curvaFlujo[] = [
                'inicio' => $desde->format('H:i'),
                'fin' => $hasta->format('H:i'),
                'permitidos' => 0,
                'rechazados' => 0,
                'total_escaneos' => 0,
            ];
        }

        $escaneos = DB::table('logs_asistencias')
            ->where('id_examen', $examen->id)
            ->whereBetween('fecha_escaneo', [
                $inicio->format('Y-m-d H:i:s'),
                $fin->format('Y-m-d H:i:s'),
            ])
            ->orderBy('fecha_escaneo')
            ->get(['fecha_escaneo', 'resultado']);

        foreach ($escaneos as $escaneo) {
            $fechaEscaneo = \Carbon\Carbon::parse(
                $escaneo->fecha_escaneo,
                $zonaHoraria
            );

            $minutosTranscurridos = $inicio->diffInMinutes($fechaEscaneo);

            $indice = (int) floor($minutosTranscurridos / $intervalo);

            if (!isset($curvaFlujo[$indice])) {
                continue;
            }

            if ($escaneo->resultado === 'PERMITIDO') {
                $curvaFlujo[$indice]['permitidos']++;
            } else {
                $curvaFlujo[$indice]['rechazados']++;
            }

            $curvaFlujo[$indice]['total_escaneos']++;
        }
    }

    // 14. Respuesta JSON de los cuatro gráficos.
    return response()->json([
        'examen' => [
            'id' => $examen->id,
            'nombre' => $examen->nombre,
            'fecha' => $fechaExamen,
            'hora_ini' => $examen->hora_ini,
            'hora_fin' => $examen->hora_fin,
        ],
        'zona_horaria' => 'America/La_Paz',
        'filtros' => [
            'fecha_desde' => $filtros['fecha_desde'] ?? null,
            'fecha_hasta' => $filtros['fecha_hasta'] ?? null,
            'intervalo_minutos' => $intervalo,
        ],
        'curva_flujo' => [
            'hora_inicio_referencia' => $examen->hora_ini,
            'origen_inicio' => 'hora_ini del examen',
            'nota' => 'No existe una hora independiente de apertura de puerta registrada.',
            'intervalos' => $curvaFlujo,
        ],
        'embudo' => [
            'total_inscritos' => $totalInscritos,
            'cumplieron_prerrequisitos' => $estudiantesQueCumplen,
            'presentes_en_puerta' => $totalPresentes,
            'evaluados_efectivos' => $evaluadosEfectivos,
        ],
        'cumplimiento_prerrequisitos' => [
            'sin_prerrequisitos' => $idsPrerrequisitos->isEmpty(),
            'resultados' => $graficoPrerrequisitos,
        ],
        'distribucion_asistencia' => [
            'total_inscritos' => $totalInscritos,
            'categorias' => $distribucion,
        ],
    ]);
}

}
