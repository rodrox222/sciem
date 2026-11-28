<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use PDO;
use RuntimeException;

class DatabaseBackupService
{
    private const BATCH_SIZE = 200;

    public function directorioBackups(): string
    {
        $dir = storage_path('app/backups');
        if (!is_dir($dir)) {
            if (!@mkdir($dir, 0775, true) && !is_dir($dir)) {
                throw new RuntimeException('No se pudo crear el directorio de respaldos en storage/app/backups.');
            }
        }

        return $dir;
    }

    public function listarBackups(): array
    {
        $dir = $this->directorioBackups();
        $archivos = glob($dir . DIRECTORY_SEPARATOR . '*.sql') ?: [];

        $lista = [];
        foreach ($archivos as $ruta) {
            if (!is_file($ruta)) {
                continue;
            }
            $nombre = basename($ruta);
            $tipo = 'manual';
            if (str_starts_with($nombre, 'backup_automatico_')) {
                $tipo = 'automatico';
            } elseif (str_starts_with($nombre, 'backup_pre_restore_')) {
                $tipo = 'pre_restore';
            }

            $mtime = @filemtime($ruta) ?: time();

            $lista[] = [
                'nombre'         => $nombre,
                'tipo'           => $tipo,
                'tamano_bytes'   => @filesize($ruta) ?: 0,
                'fecha_creacion' => Carbon::createFromTimestamp($mtime, 'America/La_Paz')->toIso8601String(),
                'mtime'          => $mtime,
            ];
        }

        usort($lista, fn (array $a, array $b) => $b['mtime'] <=> $a['mtime']);

        return array_map(function (array $item) {
            unset($item['mtime']);
            return $item;
        }, $lista);
    }

    public function generarBackup(string $tipo = 'manual'): array
    {
        if (DB::getDriverName() !== 'pgsql') {
            throw new RuntimeException('La generación de respaldos solo está soportada en PostgreSQL.');
        }

        $tipoLimpio = in_array($tipo, ['manual', 'automatico', 'pre_restore'], true) ? $tipo : 'manual';
        $ahora = Carbon::now('America/La_Paz');
        $nombre = sprintf('backup_%s_%s.sql', $tipoLimpio, $ahora->format('Y-m-d_His'));
        $ruta = $this->directorioBackups() . DIRECTORY_SEPARATOR . $nombre;

        $pdo = DB::connection()->getPdo();
        $tablas = $this->obtenerTablasOrdenadas($pdo);

        $lineas = [];
        $lineas[] = '-- ============================================================';
        $lineas[] = '-- SCIEM PostgreSQL Backup';
        $lineas[] = '-- Tipo: ' . $tipoLimpio;
        $lineas[] = '-- Fecha: ' . $ahora->format('Y-m-d H:i:s') . ' (America/La_Paz)';
        $lineas[] = '-- ============================================================';
        $lineas[] = '';
        $lineas[] = 'BEGIN;';
        $lineas[] = '';

        if (!empty($tablas)) {
            $listaTruncate = implode(', ', array_map(fn (string $t) => $this->quoteIdent($t), $tablas));
            $lineas[] = "TRUNCATE TABLE {$listaTruncate} RESTART IDENTITY CASCADE;";
            $lineas[] = '';
        }

        foreach ($tablas as $tabla) {
            $columnas = $this->obtenerColumnasTabla($pdo, $tabla);
            if (empty($columnas)) {
                continue;
            }

            $colsSql = implode(', ', array_map(fn (string $c) => $this->quoteIdent($c), $columnas));
            $tablaSql = $this->quoteIdent($tabla);

            $stmt = $pdo->query("SELECT {$colsSql} FROM {$tablaSql}");
            if ($stmt === false) {
                continue;
            }

            $sufijoInsert = $tabla === 'expulsion_vigencias' ? ' ON CONFLICT DO NOTHING;' : ';';

            $lote = [];
            while ($fila = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $valores = [];
                foreach ($columnas as $col) {
                    $valores[] = $this->formatearValorSql($pdo, $fila[$col] ?? null);
                }
                $lote[] = '(' . implode(', ', $valores) . ')';

                if (count($lote) >= self::BATCH_SIZE) {
                    $lineas[] = "INSERT INTO {$tablaSql} ({$colsSql}) VALUES\n" . implode(",\n", $lote) . $sufijoInsert;
                    $lote = [];
                }
            }

            if (!empty($lote)) {
                $lineas[] = "INSERT INTO {$tablaSql} ({$colsSql}) VALUES\n" . implode(",\n", $lote) . $sufijoInsert;
            }

            // Sincronizar secuencias SERIAL/IDENTITY si la tabla tiene alguna
            foreach ($columnas as $col) {
                $seqStmt = $pdo->prepare('SELECT pg_get_serial_sequence(:tabla, :col)');
                $seqStmt->execute([':tabla' => 'public.' . $tabla, ':col' => $col]);
                $seqName = $seqStmt->fetchColumn();
                if ($seqName) {
                    $colSql = $this->quoteIdent($col);
                    $seqQuoted = $pdo->quote((string) $seqName);
                    $lineas[] = "SELECT setval({$seqQuoted}, COALESCE((SELECT MAX({$colSql}) FROM {$tablaSql}), 1), (SELECT COUNT(*) > 0 FROM {$tablaSql}));";
                }
            }

            $lineas[] = '';
        }

        $lineas[] = 'COMMIT;';
        $lineas[] = '';

        $contenido = implode("\n", $lineas);
        if (@file_put_contents($ruta, $contenido) === false) {
            throw new RuntimeException('No se pudo escribir el archivo de respaldo en el disco.');
        }

        return [
            'nombre'         => $nombre,
            'tipo'           => $tipoLimpio,
            'tamano_bytes'   => @filesize($ruta) ?: strlen($contenido),
            'fecha_creacion' => $ahora->toIso8601String(),
        ];
    }

    public function obtenerRutaSegura(string $nombreArchivo): string
    {
        if (!preg_match('/^[a-zA-Z0-9_.-]+\.sql$/', $nombreArchivo)) {
            throw new RuntimeException('Nombre de archivo de respaldo inválido.');
        }

        $dirReal = realpath($this->directorioBackups());
        $rutaReal = realpath($this->directorioBackups() . DIRECTORY_SEPARATOR . $nombreArchivo);

        if (!$dirReal || !$rutaReal || !str_starts_with($rutaReal, $dirReal . DIRECTORY_SEPARATOR) || !is_file($rutaReal)) {
            throw new RuntimeException('El archivo de respaldo solicitado no existe.');
        }

        return $rutaReal;
    }

    public function restaurarBackup(string $nombreArchivo): array
    {
        if (DB::getDriverName() !== 'pgsql') {
            throw new RuntimeException('La restauración solo está soportada en PostgreSQL.');
        }

        $ruta = $this->obtenerRutaSegura($nombreArchivo);
        $sql = @file_get_contents($ruta);
        if ($sql === false || trim($sql) === '') {
            throw new RuntimeException('No se pudo leer el archivo de respaldo o está vacío.');
        }

        // Respaldo de seguridad automático antes de sobreescribir la BD
        $preRestore = $this->generarBackup('pre_restore');

        // Quitamos BEGIN/COMMIT del script para ejecutarlo de forma atómica dentro de DB::transaction
        $sqlEjecutable = preg_replace('/^\s*(BEGIN|COMMIT)\s*;\s*$/im', '', $sql) ?? $sql;

        // Compatibilidad con respaldos previos: el trigger sciem_expulsion_vigencia_trigger ya inserta
        // las filas de expulsion_vigencias al insertar expulsiones, evitando colisiones PK/Unique.
        $sqlEjecutable = preg_replace(
            '/(INSERT INTO "expulsion_vigencias"\b[^;]*?)(?<!ON CONFLICT DO NOTHING);/i',
            '$1 ON CONFLICT DO NOTHING;',
            $sqlEjecutable
        ) ?? $sqlEjecutable;

        DB::transaction(function () use ($sqlEjecutable) {
            DB::unprepared($sqlEjecutable);
        });

        return [
            'restaurado'  => $nombreArchivo,
            'pre_restore' => $preRestore['nombre'],
        ];
    }

    public function eliminarBackup(string $nombreArchivo): void
    {
        $ruta = $this->obtenerRutaSegura($nombreArchivo);
        if (!@unlink($ruta)) {
            throw new RuntimeException('No se pudo eliminar el archivo de respaldo.');
        }
    }

    public function limpiarAutomaticosAntiguos(int $diasRetencion = 14): int
    {
        $dias = max(1, $diasRetencion);
        $limite = Carbon::now('America/La_Paz')->subDays($dias)->timestamp;
        $eliminados = 0;

        $archivos = glob($this->directorioBackups() . DIRECTORY_SEPARATOR . 'backup_automatico_*.sql') ?: [];
        foreach ($archivos as $ruta) {
            $mtime = @filemtime($ruta);
            if ($mtime !== false && $mtime < $limite) {
                if (@unlink($ruta)) {
                    $eliminados++;
                }
            }
        }

        return $eliminados;
    }

    public function asegurarBackupDiario(int $diasRetencion = 14): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $dir = $this->directorioBackups();
        $hoy = Carbon::now('America/La_Paz')->format('Y-m-d');
        $patronHoy = $dir . DIRECTORY_SEPARATOR . "backup_automatico_{$hoy}_*.sql";

        if (!empty(glob($patronHoy))) {
            return;
        }

        $lockPath = $dir . DIRECTORY_SEPARATOR . '.daily_backup.lock';
        $fp = @fopen($lockPath, 'c+');
        if ($fp === false) {
            return;
        }

        try {
            if (!flock($fp, LOCK_EX | LOCK_NB)) {
                return;
            }

            if (empty(glob($patronHoy))) {
                $this->generarBackup('automatico');
                $this->limpiarAutomaticosAntiguos($diasRetencion);
            }
        } finally {
            @flock($fp, LOCK_UN);
            @fclose($fp);
        }
    }

    private function obtenerTablasOrdenadas(PDO $pdo): array
    {
        $tablas = $pdo->query("
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename
        ")->fetchAll(PDO::FETCH_COLUMN) ?: [];

        $dependencias = [];
        foreach ($tablas as $tabla) {
            $dependencias[$tabla] = [];
        }

        $fks = $pdo->query("
            SELECT DISTINCT
                tc.relname AS child_table,
                pc.relname AS parent_table
            FROM pg_constraint c
            JOIN pg_class tc ON tc.oid = c.conrelid
            JOIN pg_namespace tn ON tn.oid = tc.relnamespace
            JOIN pg_class pc ON pc.oid = c.confrelid
            JOIN pg_namespace pn ON pn.oid = pc.relnamespace
            WHERE c.contype = 'f'
              AND tn.nspname = 'public'
              AND pn.nspname = 'public'
              AND tc.relname <> pc.relname
        ")->fetchAll(PDO::FETCH_ASSOC) ?: [];

        foreach ($fks as $fk) {
            $hijo = $fk['child_table'];
            $padre = $fk['parent_table'];
            if (isset($dependencias[$hijo]) && isset($dependencias[$padre])) {
                $dependencias[$hijo][$padre] = true;
            }
        }

        // Ordenamiento topológico (padres antes que hijos)
        $ordenadas = [];
        $pendientes = $dependencias;

        while (!empty($pendientes)) {
            $progreso = false;
            foreach ($pendientes as $tabla => $padres) {
                if (empty($padres)) {
                    $ordenadas[] = $tabla;
                    unset($pendientes[$tabla]);
                    foreach ($pendientes as &$otrosPadres) {
                        unset($otrosPadres[$tabla]);
                    }
                    unset($otrosPadres);
                    $progreso = true;
                }
            }

            if (!$progreso) {
                // Si hubiera algún ciclo de FK, agregamos las restantes en orden alfabético
                foreach (array_keys($pendientes) as $restante) {
                    $ordenadas[] = $restante;
                }
                break;
            }
        }

        return $ordenadas;
    }

    private function obtenerColumnasTabla(PDO $pdo, string $tabla): array
    {
        $stmt = $pdo->prepare("
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = :tabla
            ORDER BY ordinal_position
        ");
        $stmt->execute([':tabla' => $tabla]);

        return $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
    }

    private function quoteIdent(string $ident): string
    {
        return '"' . str_replace('"', '""', $ident) . '"';
    }

    private function formatearValorSql(PDO $pdo, mixed $valor): string
    {
        if ($valor === null) {
            return 'NULL';
        }
        if (is_bool($valor)) {
            return $valor ? 'TRUE' : 'FALSE';
        }
        if (is_int($valor) || is_float($valor)) {
            return (string) $valor;
        }
        if (is_resource($valor)) {
            $contenido = stream_get_contents($valor);
            return "decode('" . bin2hex((string) $contenido) . "', 'hex')";
        }

        return $pdo->quote((string) $valor);
    }
}
