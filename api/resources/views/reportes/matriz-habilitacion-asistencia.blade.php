<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Matriz de Habilitación y Asistencia</title>

    <style>
    @page {
        margin: 25px;
    }

    body {
        font-family: DejaVu Sans, sans-serif;
        font-size: 8px;
        color: #222;
    }

    h2, h3 {
        text-align: center;
        margin-bottom: 6px;
        color: #222;
    }

    h2 {
        font-size: 14px;
    }

    h3 {
        font-size: 10px;
        margin-top: 16px;
    }

    .subtitulo {
        text-align: center;
        margin-bottom: 15px;
        font-size: 9px;
    }

    .resumen {
        width: 100%;
        margin-bottom: 15px;
        border-collapse: collapse;
    }

    .resumen td {
        border-top: 1px solid #888;
        border-bottom: 1px solid #888;
        padding: 6px;
        text-align: center;
    }

    table.matriz,
    .detalle table {
        width: 100%;
        border-collapse: collapse;
    }

    .matriz th,
    .detalle th {
        border-top: 1px solid #555;
        border-bottom: 1px solid #555;
        padding: 5px 3px;
        text-align: left;
        font-size: 7px;
    }

    .matriz td,
    .detalle td {
        border-bottom: 1px solid #ccc;
        padding: 5px 3px;
        vertical-align: top;
    }

    .matriz th,
    .detalle th {
        background-color: transparent;
    }

    .detalle {
        margin-top: 15px;
    }

    .pie {
        margin-top: 15px;
        padding-top: 5px;
        border-top: 1px solid #888;
        text-align: right;
        font-size: 7px;
    }
</style>
</head>

<body>

    <h2>MATRIZ COMPLETA DE HABILITACIÓN Y ASISTENCIA</h2>

    <div class="subtitulo">
        Examen: {{ $examen->id }} |
        Fecha: {{ $examen->fecha }} |
        Generado: {{ $fecha_generacion }}
    </div>

    <table class="resumen">
        <tr>
            <td><strong>Total inscritos</strong><br>{{ $total_estudiantes }}</td>
            <td><strong>Habilitados</strong><br>{{ $total_habilitados }}</td>
            <td><strong>Inhabilitados</strong><br>{{ $total_inhabilitados }}</td>
            <td><strong>Con ingreso</strong><br>{{ $total_con_ingreso }}</td>
        </tr>
    </table>

    <h3>1. Nómina y estado de los estudiantes</h3>

    <table class="matriz">
        <thead>
            <tr>
                <th>SIS</th>
                <th>CI</th>
                <th>Estudiante</th>
                <th>Estado</th>
                <th>Motivo</th>
                <th>Ajuste manual</th>
                <th>Ingreso</th>
                <th>Primera hora</th>
                <th>Exp. vigentes</th>
                <th>Exp. anuladas</th>
            </tr>
        </thead>

        <tbody>
            @forelse ($matriz as $estudiante)
                <tr>
                    <td>{{ $estudiante['codigo_sis'] }}</td>
                    <td>
                        {{ $estudiante['ci'] }}
                        {{ $estudiante['ci_extension'] }}
                    </td>
                    <td>{{ $estudiante['nombre_completo'] }}</td>
                    <td>{{ $estudiante['estado'] }}</td>
                    <td>{{ $estudiante['motivo_estado'] ?: '—' }}</td>
                    <td>
                        {{ $estudiante['ajuste_manual'] ? 'Sí' : 'No' }}
                        @if ($estudiante['ajuste_manual'])
                            <br>
                            Fecha: {{ $estudiante['fecha_ajuste_manual'] ?: '—' }}
                        @endif
                    </td>
                    <td>{{ $estudiante['ingreso'] }}</td>
                    <td>{{ $estudiante['fecha_ingreso'] ?: '—' }}</td>
                    <td>{{ $estudiante['expulsiones_vigentes'] }}</td>
                    <td>{{ $estudiante['expulsiones_anuladas'] }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="10" style="text-align:center">
                        No existen estudiantes inscritos para este examen o dentro del rango seleccionado.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="detalle">
        <h3>2. Detalle de prerrequisitos</h3>

        <table>
            <thead>
                <tr>
                    <th>SIS</th>
                    <th>Estudiante</th>
                    <th>Prerrequisito</th>
                    <th>Estado</th>
                    <th>Fecha de cumplimiento</th>
                </tr>
            </thead>

            <tbody>
                @php $hayRequisitos = false; @endphp

                @foreach ($matriz as $estudiante)
                    @foreach ($estudiante['prerrequisitos'] as $requisito)
                        @php $hayRequisitos = true; @endphp

                        <tr>
                            <td>{{ $estudiante['codigo_sis'] }}</td>
                            <td>{{ $estudiante['nombre_completo'] }}</td>
                            <td>{{ $requisito['titulo'] }}</td>
                            <td>{{ $requisito['estado'] }}</td>
                            <td>{{ $requisito['fecha_cumplimiento'] ?: '—' }}</td>
                        </tr>
                    @endforeach
                @endforeach

                @if (!$hayRequisitos)
                    <tr>
                        <td colspan="5" style="text-align:center">
                            No existen prerrequisitos registrados para los estudiantes.
                        </td>
                    </tr>
                @endif
            </tbody>
        </table>
    </div>

    <div class="pie">
        Documento generado por el Sistema de Control de Ingreso a Exámenes (SCiEM).
    </div>

</body>
</html>