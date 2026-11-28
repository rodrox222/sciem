<?php

namespace App\Services;

use App\Models\Examen;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

final class EstadoExamen
{
    /**
     * Sincroniza el estado de los exámenes activos según fecha y hora actual (America/La_Paz).
     * - Si la hora actual superó fecha + hora_fin -> Terminado
     * - Si está dentro de [hora_ini, hora_fin] -> En proceso
     */
    public static function sincronizar(): void
    {
        if (DB::transactionLevel() > 0) {
            return;
        }

        $ahora = Carbon::now('America/La_Paz');

        $examenes = Examen::query()
            ->whereIn('estado', ['Programado', 'En proceso'])
            ->whereNotNull('fecha')
            ->whereNotNull('hora_ini')
            ->whereNotNull('hora_fin')
            ->get(['id', 'fecha', 'hora_ini', 'hora_fin', 'estado']);

        foreach ($examenes as $examen) {
            $fecha = $examen->fecha instanceof Carbon
                ? $examen->fecha->format('Y-m-d')
                : explode(' ', (string) $examen->fecha)[0];

            $horaIni = substr(trim((string) $examen->hora_ini), 0, 8);
            $horaFin = substr(trim((string) $examen->hora_fin), 0, 8);

            if ($fecha === '' || $horaIni === '' || $horaFin === '') {
                continue;
            }

            try {
                $inicio = Carbon::parse("{$fecha} {$horaIni}", 'America/La_Paz');
                $fin = Carbon::parse("{$fecha} {$horaFin}", 'America/La_Paz');
            } catch (\Throwable) {
                continue;
            }

            if ($fin->lessThan($inicio)) {
                $fin->addDay();
            }

            $nuevoEstado = null;
            if ($ahora->gt($fin)) {
                $nuevoEstado = 'Terminado';
            } elseif ($ahora->betweenIncluded($inicio, $fin) && $examen->estado === 'Programado') {
                $nuevoEstado = 'En proceso';
            }

            if ($nuevoEstado !== null && $nuevoEstado !== $examen->estado) {
                DB::table('examenes')
                    ->where('id', $examen->id)
                    ->update([
                        'estado'     => $nuevoEstado,
                        'updated_at' => now(),
                    ]);
            }
        }
    }
}
