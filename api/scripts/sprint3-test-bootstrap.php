<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Únicamente para el contenedor PostgreSQL desechable definido en docker-compose.sprint3-qa.yml.
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (getenv('SCIEM_QA_ALLOW_WRITE') !== '1' || ! app()->environment('testing')
    || DB::getDriverName() !== 'pgsql' || DB::connection()->getDatabaseName() !== 'sciem_sprint3_test'
    || DB::selectOne('SELECT current_database() AS db')->db !== 'sciem_sprint3_test') {
    fwrite(STDERR, "REFUSADO: se requiere APP_ENV=testing y BD sciem_sprint3_test PostgreSQL explícita.\n");
    exit(2);
}
// El bootstrap no adopta una BD existente con datos o tablas ajenas.
$tables = DB::select('SELECT tablename FROM pg_tables WHERE schemaname = current_schema()');
if (count($tables) && ! Schema::hasTable('sprint3_qa_marker')) {
    fwrite(STDERR, "REFUSADO: la BD no está vacía ni tiene marcador de este entorno QA.\n");
    exit(2);
}
if (! Schema::hasTable('sprint3_qa_marker')) {
    Schema::create('sprint3_qa_marker', fn ($t) => $t->string('purpose')->primary());
}
$code = Artisan::call('migrate', ['--force' => true]);
echo Artisan::output();
if ($code !== 0) {
    exit($code);
}
echo "PASS: migraciones incrementales en BD QA; no se ejecutaron semillas, fresh ni wipe.\n";
