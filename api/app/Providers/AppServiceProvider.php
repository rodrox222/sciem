<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Request;
use App\Models\LogAuditoria;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $fontsDir = storage_path('fonts');
        if (!is_dir($fontsDir)) {
            @mkdir($fontsDir, 0775, true);
        }

        if (!is_dir($fontsDir) || !is_writable($fontsDir)) {
            $tmpFontsDir = rtrim(sys_get_temp_dir(), '/\\') . DIRECTORY_SEPARATOR . 'sciem_dompdf_fonts';
            if (!is_dir($tmpFontsDir)) {
                @mkdir($tmpFontsDir, 0775, true);
            }
            config([
                'dompdf.options.font_dir'   => $tmpFontsDir,
                'dompdf.options.font_cache' => $tmpFontsDir,
            ]);
        }

        if (!$this->app->runningInConsole()) {
            $this->app->terminating(function () {
                try {
                    app(\App\Services\DatabaseBackupService::class)->asegurarBackupDiario();
                } catch (\Throwable) {
                    // No interrumpir la petición si falla el respaldo automático
                }
            });
        }
    }
}
