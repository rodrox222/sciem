<?php

namespace App\Console\Commands;

use App\Models\Examen;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class LimpiarFotosVerificacionExpiradas extends Command
{
    protected $signature = 'fotos:limpiar-verificaciones';
    protected $description = 'Elimina las fotos temporales de verificación facial de exámenes concluidos.';

    public function handle(): int
    {
        $ahora = Carbon::now('America/La_Paz');

        // Buscar exámenes que ya hayan terminado (hora_fin superada)
        $examenesConcluidos = Examen::whereNotNull('fecha')
            ->whereNotNull('hora_fin')
            ->get()
            ->filter(function ($examen) use ($ahora) {
                $soloFecha = $examen->fecha instanceof Carbon
                    ? $examen->fecha->format('Y-m-d')
                    : explode(' ', (string) $examen->fecha)[0];

                $soloHoraFin = explode(' ', (string) $examen->hora_fin);
                $horaFinStr = end($soloHoraFin);

                $finExamen = Carbon::createFromFormat(
                    'Y-m-d H:i:s',
                    "{$soloFecha} {$horaFinStr}",
                    'America/La_Paz'
                );

                return $ahora->gt($finExamen);
            });

        $disco = Storage::disk('local');
        $archivos = $disco->files('fotos_verificacion_qr');
        $eliminados = 0;

        foreach ($examenesConcluidos as $examen) {
            // El patrón de guardado incluye el UUID del examen: qr_token_{id_est}_{id_examen}_{time}.jpg
            $patronIdExamen = '_' . $examen->id . '_';

            foreach ($archivos as $archivo) {
                if (str_contains($archivo, $patronIdExamen)) {
                    $disco->delete($archivo);
                    $eliminados++;
                }
            }
        }

        $this->info("Limpieza completada: se eliminaron {$eliminados} fotos de verificación de exámenes concluidos.");

        return Command::SUCCESS;
    }
}