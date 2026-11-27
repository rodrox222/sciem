<?php

namespace App\Console\Commands;

use App\Models\Examen;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class LimpiarFotosVerificacionExpiradas extends Command
{
    protected $signature = 'fotos:limpiar-verificaciones';
    protected $description = 'Elimina las fotos temporales de verificación facial 24 horas después de concluir el examen.';

    public function handle(): int
    {
        $ahora = Carbon::now('America/La_Paz');

        // Buscar exámenes que hayan terminado hace más de 24 horas
        $examenesConcluidos = Examen::whereNotNull('fecha')
            ->whereNotNull('hora_fin')
            ->get()
            ->filter(function ($examen) use ($ahora) {
                $soloFecha = $examen->fecha instanceof Carbon
                    ? $examen->fecha->format('Y-m-d')
                    : explode(' ', (string) $examen->fecha)[0];

                $soloHoraFin = explode(' ', (string) $examen->hora_fin);
                $horaFinStr = end($soloHoraFin);

                $finExamen = Carbon::parse("{$soloFecha} {$horaFinStr}", 'America/La_Paz');

                return $ahora->gt($finExamen->copy()->addHours(24));
            });

        $disco = Storage::disk('public');
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

        $this->info("Limpieza completada: se eliminaron {$eliminados} fotos de verificación de exámenes concluidos hace más de 24 horas.");

        return Command::SUCCESS;
    }
}