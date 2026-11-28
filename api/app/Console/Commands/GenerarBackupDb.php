<?php

namespace App\Console\Commands;

use App\Services\DatabaseBackupService;
use Illuminate\Console\Command;

class GenerarBackupDb extends Command
{
    protected $signature = 'db:backup {--tipo=automatico} {--retention=14}';
    protected $description = 'Genera un respaldo completo de la base de datos PostgreSQL y limpia respaldos automáticos antiguos.';

    public function handle(DatabaseBackupService $backupService): int
    {
        $tipo = (string) $this->option('tipo');
        $retencion = (int) $this->option('retention');

        $resultado = $backupService->generarBackup($tipo);
        $this->info("Respaldo generado: {$resultado['nombre']} ({$resultado['tamano_bytes']} bytes).");

        if ($tipo === 'automatico') {
            $eliminados = $backupService->limpiarAutomaticosAntiguos($retencion);
            if ($eliminados > 0) {
                $this->info("Se eliminaron {$eliminados} respaldos automáticos antiguos (retención: {$retencion} días).");
            }
        }

        return Command::SUCCESS;
    }
}
