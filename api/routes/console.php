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

/**
 * Tarea programada: sincroniza estados de exámenes (Programado -> En proceso -> Terminado).
 */
Schedule::call(fn () => \App\Services\EstadoExamen::sincronizar())
    ->everyMinute()
    ->name('sincronizar-estados-examenes');

/**
 * Tarea programada: respaldo diario automático de toda la base de datos PostgreSQL.
 */
Schedule::command('db:backup --tipo=automatico --retention=14')
    ->dailyAt('02:00')
    ->timezone('America/La_Paz')
    ->name('backup-diario-bd');