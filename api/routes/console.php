<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

/**
 * Tarea programada: elimina automáticamente las fotos de verificación facial
 * de la carpeta 'fotos_verificacion_qr' 24 horas después de concluir el examen.
 */
Schedule::command('fotos:limpiar-verificaciones')
    ->everyTenMinutes()
    ->name('limpiar-fotos-verificacion-expiradas');