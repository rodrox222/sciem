<?php

use App\Models\Examen;
use Carbon\Carbon;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Storage;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

/**
 * Tarea programada: elimina automáticamente las fotos de verificación facial
 * de la carpeta 'fotos_verificacion_qr' una vez que se termine el examen pe
 */
Schedule::call(function () {
    $ahora = Carbon::now('America/La_Paz');

    // Obtener exámenes que ya concluyeron según fecha y hora_fin
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

    foreach ($examenesConcluidos as $examen) {
        // El nombre del archivo se guarda como qr_token_{id_estudiante}_{id_examen}_{timestamp}.ext
        $patronIdExamen = '_' . $examen->id . '_';

        foreach ($archivos as $archivo) {
            if (str_contains($archivo, $patronIdExamen)) {
                $disco->delete($archivo);
            }
        }
    }
})->everyTenMinutes()->name('limpiar-fotos-verificacion-expiradas');