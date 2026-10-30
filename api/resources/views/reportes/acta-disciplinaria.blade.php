<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Acta disciplinaria</title>
    <style>
        @page {
            margin: 25px 30px;
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 9px;
            color: #222;
        }

        h1 {
            text-align: center;
            font-size: 15px;
            margin-bottom: 5px;
            text-transform: uppercase;
        }

        .subtitulo {
            text-align: center;
            font-size: 10px;
            margin-bottom: 18px;
        }

        .datos {
            width: 100%;
            margin-bottom: 15px;
            border-collapse: collapse;
        }

        .datos td {
            padding: 4px;
        }

       table.registros {
    width: 100%;
    border-collapse: collapse;
    border-top: 1px solid #555;
    border-bottom: 1px solid #555;
}

.registros th,
.registros td {
    border: none;
    border-bottom: 0.5px solid #ccc;
    padding: 7px 5px;
    text-align: left;
    vertical-align: top;
}

.registros th {
    font-weight: bold;
    background: transparent;
    border-bottom: 1px solid #555;
}

.registros tbody tr:last-child td {
    border-bottom: none;
}

        .estado {
            text-align: center;
            font-weight: bold;
        }

        .vacio {
            text-align: center;
            padding: 15px;
        }

        .pie {
    margin-top: 12px;
    padding-top: 6px;
    border-top: 1px solid #555;
    font-size: 8px;
    text-align: right;
}
    </style>
</head>
<body>
    <h1>Acta de expulsiones e incidencias</h1>
    <div class="subtitulo">Registro disciplinario institucional</div>

    <table class="datos">
        <tr>
            <td><strong>Examen:</strong> {{ $examen->nombre }}</td>
            <td><strong>Fecha:</strong> {{ $examen->fecha?->format('d/m/Y') ?? 'No disponible' }}</td>
        </tr>
        <tr>
            <td><strong>Desde:</strong> {{ $fechaDesde ?? 'Sin límite' }}</td>
            <td><strong>Hasta:</strong> {{ $fechaHasta ?? 'Sin límite' }}</td>
        </tr>
        <tr>
            <td colspan="2"><strong>Zona horaria:</strong> America/La_Paz</td>
        </tr>
    </table>

    <table class="registros">
        <thead>
            <tr>
                <th>Fecha y hora</th>
                <th>Código SIS</th>
                <th>Estudiante</th>
                <th>Motivo</th>
                <th>Registrado por</th>
                <th>Rol</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($registros as $registro)
                <tr>
                    <td>{{ $registro['fecha_hora'] }}</td>
                    <td>{{ $registro['codigo_sis'] }}</td>
                    <td>{{ $registro['estudiante'] }}</td>
                    <td>{{ $registro['motivo'] }}</td>
                    <td>{{ $registro['responsable'] }}</td>
                    <td>{{ $registro['rol'] }}</td>
                    <td class="estado">{{ $registro['estado'] }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" class="vacio">
                        No existen expulsiones registradas para este examen.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="pie">
        Total de registros: {{ $registros->count() }}
    </div>
</body>
</html>
