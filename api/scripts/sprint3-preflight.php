<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Solo lectura, útil antes de planificar migraciones en la BD existente. No imprime PII.
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (DB::getDriverName() !== 'pgsql') {
    fwrite(STDERR, "Se requiere PostgreSQL.\n");
    exit(2);
}
DB::beginTransaction();
try {
    DB::statement('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    $report = ['postgres_version' => DB::selectOne('SHOW server_version')->server_version, 'columnas' => []];
    foreach (['estudiantes', 'estudiante_examen', 'examen_auxiliar', 'auxiliar_examen', 'expulsiones'] as $table) {
        $report['columnas'][$table] = Schema::hasTable($table) ? Schema::getColumnListing($table) : null;
    }
    $report['parejas_expulsiones_duplicadas'] = DB::selectOne('SELECT COUNT(*) AS n FROM (SELECT id_examen,id_estudiante FROM expulsiones GROUP BY id_examen,id_estudiante HAVING COUNT(*) > 1) d')->n;
    $report['pivotes_sin_log_permitido'] = DB::selectOne("SELECT COUNT(*) AS n FROM estudiante_examen ee WHERE fecha_ingreso IS NOT NULL AND NOT EXISTS (SELECT 1 FROM logs_asistencias l WHERE l.id_examen=ee.id_examen AND l.id_estudiante=ee.id_estudiante AND resultado='PERMITIDO')")->n;
    $report['logs_permitidos_sin_inscripcion'] = DB::selectOne("SELECT COUNT(*) AS n FROM logs_asistencias l WHERE resultado='PERMITIDO' AND NOT EXISTS (SELECT 1 FROM estudiante_examen ee WHERE l.id_examen=ee.id_examen AND l.id_estudiante=ee.id_estudiante)")->n;
    $report['expulsiones_sin_auditoria_vinculada'] = DB::selectOne("SELECT COUNT(*) AS n FROM expulsiones e WHERE NOT EXISTS (SELECT 1 FROM logs_auditoria l WHERE l.modulo='EXPULSIONES' AND l.detalles->>'expulsion_id'=e.id::text)")->n;
    $report['indexes_expulsiones'] = DB::select("SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('expulsiones','expulsion_vigencias')");
    echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE).PHP_EOL;
} finally {
    DB::rollBack();
}
