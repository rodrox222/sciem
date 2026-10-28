<?php

use App\Models\Admin;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Expulsion;
use App\Models\LogAsistencia;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (getenv('SCIEM_QA_ALLOW_WRITE') !== '1' || ! app()->environment('testing')
    || DB::getDriverName() !== 'pgsql' || DB::connection()->getDatabaseName() !== 'sciem_sprint3_test'
    || DB::selectOne('SELECT current_database() AS db')->db !== 'sciem_sprint3_test'
    || ! Schema::hasTable('sprint3_qa_marker')) {
    fwrite(STDERR, "REFUSADO: solo BD PostgreSQL QA marcada y autorizada.\n");
    exit(2);
}

// Fixtures sintéticos comprometidos para que procesos HTTP independientes puedan verlos.
// El compose usa tmpfs y destruye esta BD al terminar; nunca se usa la BD normal.
config(['hashing.bcrypt.rounds' => 4]);
$passed = [];
$metrics = [];
$client = new GuzzleHttp\Client(['base_uri' => 'http://127.0.0.1:8200', 'http_errors' => false, 'timeout' => 30]);
$evidence = '/tmp/sciem-qa-evidence';
@mkdir($evidence, 0700, true);
function check(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}
function done(string $scenario): void
{
    global $passed;
    $passed[] = $scenario;
    echo 'PASS '.$scenario.PHP_EOL;
}
function http(string $method, string $path, ?string $token = null, array $data = [], ?int $expected = 200): array
{
    global $client;
    $response = $client->request($method, $path, ['headers' => ['Accept' => 'application/json', 'Authorization' => $token ? 'Bearer '.$token : '', 'X-Forwarded-For' => '198.18.0.10'], 'json' => $data]);
    $status = $response->getStatusCode();
    check($expected === null || $status === $expected, "$method $path: HTTP $status; esperado $expected");
    return ['status' => $status, 'json' => json_decode((string) $response->getBody(), true), 'raw' => (string) $response->getBody()];
}
function startRequest(string $method, string $path, string $token, array $data = []): array
{
    $process = proc_open([PHP_BINARY, __DIR__.'/sprint3-http-worker.php'], [['pipe', 'r'], ['pipe', 'w'], ['pipe', 'w']], $pipes);
    check(is_resource($process), 'No se pudo iniciar cliente HTTP');
    fwrite($pipes[0], json_encode(compact('method', 'path', 'token', 'data'), JSON_THROW_ON_ERROR));
    fclose($pipes[0]);
    return [$process, $pipes];
}
function finishRequest(array $worker): array
{
    [$process, $pipes] = $worker;
    $out = stream_get_contents($pipes[1]);
    $err = stream_get_contents($pipes[2]);
    fclose($pipes[1]); fclose($pipes[2]);
    check(proc_close($process) === 0, 'Cliente HTTP independiente falló: '.$err);
    return json_decode($out, true, flags: JSON_THROW_ON_ERROR);
}
function race(string $examId, array $requests): array
{
    global $metrics;
    DB::beginTransaction();
    DB::table('examenes')->where('id', $examId)->lockForUpdate()->first();
    $workers = [];
    try {
        foreach ($requests as $r) {
            $workers[] = startRequest(...$r);
        }
        $deadline = microtime(true) + 10;
        do {
            // Snapshot estadístico explícitamente renovado en cada consulta.
            DB::select('SELECT pg_stat_clear_snapshot()');
            $waiting = (int) DB::selectOne("SELECT count(*) AS n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock'")->n;
            if ($waiting >= count($requests)) break;
            usleep(20000);
        } while (microtime(true) < $deadline);
        check($waiting >= count($requests), 'No se observó contención real de ambas conexiones PostgreSQL');
    } finally {
        DB::rollBack();
    }
    $results = array_map('finishRequest', $workers);
    $metrics['carreras'][] = ['clientes' => count($requests), 'conexiones_bloqueadas' => $waiting, 'ms' => array_column($results, 'ms')];
    return $results;
}
function qr(Examen $exam, Estudiante $student, array $replace = []): string
{
    $payload = base64_encode(json_encode(array_merge(['id_examen' => $exam->id, 'id_estudiante' => $student->id, 'expira_at' => now()->addMinutes(30)->timestamp], $replace)));
    return $payload.'.'.hash_hmac('sha256', $payload, config('app.key'));
}

try {
    $password = Str::random(32);
    $teacher = Docente::create(['nombre' => 'QA', 'apellido_paterno' => 'Titular', 'ci' => 'QA'.random_int(1000000, 9999999), 'email' => Str::uuid().'@fcyt.umss.edu.bo', 'password' => Hash::make($password), 'activo' => true]);
    $other = Docente::create(['nombre' => 'QA', 'apellido_paterno' => 'Ajeno', 'ci' => 'QA'.random_int(1000000, 9999999), 'email' => Str::uuid().'@fcyt.umss.edu.bo', 'password' => Hash::make($password), 'activo' => true]);
    $admin = Admin::create(['ci' => (string) random_int(10000000, 99999999), 'nombre' => 'QA', 'apellido_paterno' => 'Admin', 'activo' => true, 'password' => Hash::make($password)]);
    $students = [];
    $prefix = (string) random_int(100000, 999999);
    for ($i = 0; $i < 302; $i++) {
        $students[] = Estudiante::create(['nombre' => $i === 0 ? 'José' : 'QA'.$i, 'apellido_paterno' => 'Pérez', 'apellido_materno' => 'Ñúñez', 'codigo_sis' => $prefix.str_pad((string) $i, 3, '0', STR_PAD_LEFT), 'email_institucional' => Str::uuid().'@est.umss.edu', 'activo' => true, 'es_auxiliar' => $i === 300, 'primer_acceso_completado' => true, 'password' => Hash::make($password)]);
    }
    $student = $students[0]; $dual = $students[300]; $outsider = $students[301];
    $materia = (string) Str::uuid(); $aula = (string) Str::uuid();
    DB::table('materias')->insert(['id' => $materia, 'nombre' => 'QA Sprint 3']);
    DB::table('aulas')->insert(['id' => $aula, 'nombre' => 'QA', 'ubicacion' => 'Fixture', 'estado' => 'Disponible', 'capacidad' => 350]);
    $examData = ['nombre' => 'QA Sprint 3 José Ñúñez', 'id_docente' => $teacher->id, 'id_materia' => $materia, 'id_aula' => $aula, 'estado' => 'En proceso', 'fecha' => now('America/La_Paz')->toDateString(), 'hora_ini' => '00:00:00', 'hora_fin' => '23:59:59'];
    $exam = Examen::create($examData);
    $empty = Examen::create(array_merge($examData, ['nombre' => 'QA vacío']));
    $foreign = Examen::create(array_merge($examData, ['id_docente' => $other->id, 'nombre' => 'QA ajeno']));
    foreach (array_slice($students, 0, 300) as $s) {
        DB::table('estudiante_examen')->insert(['id_examen' => $exam->id, 'id_estudiante' => $s->id, 'estado' => 'Habilitado']);
    }
    DB::table('examen_auxiliar')->insert(['id' => (string) Str::uuid(), 'id_examen' => $exam->id, 'id_auxiliar' => $dual->id, 'estado' => 'Activo']);
    $base = '/api/examenes/'.$exam->id.'/';
    $tokens = [];
    foreach (['admin' => $admin->ci, 'docente' => $teacher->email, 'auxiliar' => $dual->email_institucional, 'estudiante' => $dual->email_institucional] as $role => $email) {
        $login = http('POST', '/api/login', null, ['email' => $email, 'password' => $password, 'role' => $role])['json'];
        check($login['user']['rol'] === $role, 'Login con rol incorrecto');
        $tokens[$role] = $login['token'];
        check(http('GET', '/api/me', $tokens[$role])['json']['rol'] === $role, '/me con rol incorrecto');
        check(http('GET', '/api/dashboard', $tokens[$role])['json']['rol'] === $role, 'Dashboard con rol incorrecto');
    }
    check($tokens['auxiliar'] !== $tokens['estudiante'], 'Sesiones duales mezcladas');
    $t = $tokens['docente'];
    $otherToken = $other->createToken('qa', ['role:docente'])->plainTextToken;
    $studentToken = $student->createToken('qa', ['role:estudiante'])->plainTextToken;
    $legacy = $dual->createToken('qa-legacy', ['role:estudiante', 'role:auxiliar'])->plainTextToken;
    http('GET', '/api/me', $legacy, [], 403);
    $teacher->update(['activo' => false]);
    http('GET', '/api/dashboard', $t, [], 403);
    http('POST', '/api/login', null, ['email' => $teacher->email, 'password' => $password, 'role' => 'docente'], 403);
    $teacher->update(['activo' => true]);
    done('login HTTP cuatro roles, sesiones duales, token antiguo y cuenta inactiva');

    foreach (['expulsiones', 'monitoreo', 'reportes/estadisticas', 'reportes/estadisticas/descargar?formato=xlsx'] as $suffix) {
        http('GET', $base.$suffix, $otherToken, [], 403);
        http('GET', $base.$suffix, $studentToken, [], 403);
    }
    foreach (['monitoreo', 'reportes/estadisticas', 'reportes/estadisticas/descargar?formato=pdf'] as $suffix) http('GET', $base.$suffix, $tokens['auxiliar'], [], 403);
    http('GET', $base.'expulsiones', $tokens['auxiliar']);
    DB::table('examen_auxiliar')->where('id_auxiliar', $dual->id)->update(['estado' => 'Inactivo']);
    http('GET', $base.'expulsiones', $tokens['auxiliar'], [], 403);
    check(http('GET', '/api/dashboard', $tokens['auxiliar'])['json']['secciones']['resumen']['total_examenes'] === 0, 'Caché conserva auxiliar revocado');
    DB::table('examen_auxiliar')->where('id_auxiliar', $dual->id)->update(['estado' => 'Activo']);
    done('aislamiento de roles/exámenes y revocación durante TTL');

    $initial = http('GET', $base.'monitoreo?incluir_listas=1', $t)['json'];
    check($initial['resumen']['total_estudiantes'] === 300 && count($initial['listas']['ausentes']) === 300, 'Nómina inicial incorrecta');
    $zero = http('GET', '/api/examenes/'.$empty->id.'/monitoreo?incluir_listas=1', $t)['json'];
    check($zero['resumen']['total_estudiantes'] === 0, 'Examen vacío incorrecto');
    http('POST', $base.'registro-manual', $t, ['id_estudiante' => $student->id, 'motivo' => 'QA ingreso']);
    $before = [LogAsistencia::count(), Expulsion::withTrashed()->count(), DB::table('logs_auditoria')->count()];
    foreach (['Jose', 'Perez', $student->codigo_sis] as $search) {
        $rows = http('GET', $base.'expulsiones/estudiantes?'.http_build_query(['search' => $search]), $t)['json']['estudiantes'];
        check(in_array($student->id, array_column($rows, 'id')), 'Búsqueda no encuentra inscrito');
    }
    $rows = http('GET', $base.'expulsiones/estudiantes?'.http_build_query(['qr_data' => qr($exam, $student)]), $t)['json']['estudiantes'];
    check(count($rows) === 1 && $rows[0]['elegible'], 'QR válido no elegible');
    foreach ([qr($exam, $student).'x', qr($exam, $student, ['expira_at' => now()->subMinute()->timestamp]), qr($foreign, $student)] as $bad) http('GET', $base.'expulsiones/estudiantes?'.http_build_query(['qr_data' => $bad]), $t, [], 422);
    check($before === [LogAsistencia::count(), Expulsion::withTrashed()->count(), DB::table('logs_auditoria')->count()], 'GET generó escrituras');
    foreach (['  ', 'ab', str_repeat('x', 2001)] as $motive) http('POST', $base.'expulsiones', $t, ['id_estudiante' => $student->id, 'motivo' => $motive], 422);
    done('búsqueda nombre/apellido/SIS/QR, negativas y GET sin escrituras');

    $expel = ['id_estudiante' => $student->id, 'motivo' => '  Motivo simultáneo  '];
    $results = race($exam->id, [['POST', $base.'expulsiones', $t, $expel], ['POST', $base.'expulsiones', $t, $expel]]);
    $codes = array_column($results, 'status'); sort($codes);
    check($codes === [201, 409], 'Dos altas simultáneas no dejaron 201/409');
    $expulsion = Expulsion::where('id_examen', $exam->id)->firstOrFail();
    check($expulsion->motivo === 'Motivo simultáneo', 'No se hizo trim');
    check(Expulsion::where('id_examen', $exam->id)->count() === 1 && DB::table('expulsion_vigencias')->where('id_examen', $exam->id)->count() === 1, 'Vigencia inconsistente');
    check(DB::table('logs_auditoria')->where('detalles->expulsion_id', $expulsion->id)->count() === 1, 'Auditoría de carrera duplicada');
    done('concurrencia real: dos altas, fila vigente y auditoría única');

    foreach (['Terminado', 'En proceso'] as $state) {
        $exam->update(['estado' => $state, 'fecha' => $state === 'En proceso' ? now('America/La_Paz')->subDay()->toDateString() : $examData['fecha']]);
        http('PATCH', $base.'expulsiones/'.$expulsion->id, $t, ['motivo' => 'Fuera de horario'], 422);
        http('DELETE', $base.'expulsiones/'.$expulsion->id, $t, ['motivo_eliminacion' => 'Fuera de horario'], 422);
    }
    $exam->update(['estado' => 'En proceso', 'fecha' => $examData['fecha']]);
    http('PATCH', $base.'expulsiones/'.$expulsion->id, $t, ['motivo' => 'Corrección auditada']);
    $history = http('GET', $base.'expulsiones', $t)['json']['expulsiones'][0];
    check($history['motivo_original'] === 'Motivo simultáneo' && count($history['ediciones']) === 1 && $history['responsable']['rol'] === 'docente', 'Historial o responsable incorrectos');
    $results = race($exam->id, [['DELETE', $base.'expulsiones/'.$expulsion->id, $t, ['motivo_eliminacion' => 'QA baja concurrente']], ['POST', $base.'expulsiones', $t, $expel]]);
    check($results[0]['status'] === 200 && in_array($results[1]['status'], [201, 409], true), 'Alta contra baja sin serialización válida');
    $active = Expulsion::where('id_examen', $exam->id)->get();
    check($active->count() === ($results[1]['status'] === 201 ? 1 : 0), 'Alta/baja deja estado inesperado');
    foreach ($active as $e) http('DELETE', $base.'expulsiones/'.$e->id, $t, ['motivo_eliminacion' => 'QA limpieza lógica']);
    $results = race($exam->id, [['POST', $base.'registro-manual', $t, ['id_estudiante' => $student->id]], ['POST', $base.'expulsiones', $t, $expel]]);
    check(in_array($results[0]['status'], [403, 409], true) && $results[1]['status'] === 201, 'Ingreso contra expulsión incorrecto');
    check(LogAsistencia::where('id_examen', $exam->id)->where('id_estudiante', $student->id)->where('resultado', 'PERMITIDO')->count() === 1, 'Carrera duplicó admisión');
    $current = Expulsion::where('id_examen', $exam->id)->firstOrFail();
    http('DELETE', $base.'expulsiones/'.$current->id, $t, ['motivo_eliminacion' => 'QA fin de carrera']);
    http('POST', $base.'registro-manual', $t, ['id_estudiante' => $student->id], 409);
    done('edición/baja auditada, ventana cerrada, carreras alta/baja e ingreso/expulsión');

    // Regresión de los tres productores compartidos, sin implementar funcionalidad HU21.
    http('POST', $base.'verificar-ingreso', $t, ['qr_data' => qr($exam, $students[1])]);
    http('POST', $base.'verificar-ingreso', $t, ['qr_data' => qr($exam, $students[1])], 409);
    $event = ['codigo_sis' => $students[2]->codigo_sis, 'fecha_ingreso' => now('America/La_Paz')->subSeconds(2)->toIso8601String(), 'resultado' => 'PERMITIDO'];
    $offline = http('POST', $base.'sincronizar-asistencias', $tokens['auxiliar'], ['asistencias' => [$event]])['json'];
    check($offline['total_procesados'] === 1, 'Offline válido rechazado');
    http('POST', $base.'sincronizar-asistencias', $tokens['auxiliar'], ['asistencias' => [$event]]);
    check(LogAsistencia::where('id_examen', $exam->id)->where('id_estudiante', $students[2]->id)->where('resultado', 'PERMITIDO')->count() === 1, 'Offline duplicó ingreso');
    $event['codigo_sis'] = $students[3]->codigo_sis; $event['fecha_ingreso'] = now()->addHour()->toIso8601String();
    check(http('POST', $base.'sincronizar-asistencias', $tokens['auxiliar'], ['asistencias' => [$event]])['json']['total_procesados'] === 0, 'Offline aceptó evento futuro');
    done('regresión QR/manual/offline, duplicados y evento futuro');

    // Fuente de referencia independiente de AsistenciaExamen: SQL explícito.
    DB::table('estudiante_examen')->where('id_examen', $exam->id)->update(['fecha_ingreso' => null]);
    LogAsistencia::create(['id_examen' => $exam->id, 'id_estudiante' => $outsider->id, 'codigo_sis_escaneado' => $outsider->codigo_sis, 'resultado' => 'PERMITIDO', 'mensaje' => 'QA anomalía no inscrito', 'fecha_escaneo' => now('America/La_Paz')]);
    DB::table('estudiante_examen')->where('id_examen', $exam->id)->where('id_estudiante', $students[4]->id)->update(['estado' => 'Inhabilitado']);
    http('POST', $base.'registro-manual', $t, ['id_estudiante' => $students[4]->id], 403);
    http('POST', $base.'registro-manual', $t, ['id_estudiante' => $dual->id], 403);
    $sql = DB::selectOne("SELECT count(*)::int AS inscritos, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM logs_asistencias l WHERE l.id_examen=ee.id_examen AND l.id_estudiante=ee.id_estudiante AND resultado='PERMITIDO'))::int AS asistentes FROM estudiante_examen ee WHERE ee.id_examen=?", [$exam->id]);
    $expected = [$sql->inscritos, $sql->asistentes, $sql->inscritos - $sql->asistentes];
    foreach (['RECHAZADO_INHABILITADO', 'RECHAZADO_NO_INSCRITO', 'RECHAZADO_YA_INGRESO'] as $category) $expected[] = DB::table('logs_asistencias')->where('id_examen', $exam->id)->where('resultado', $category)->count();
    $report = http('GET', $base.'reportes/estadisticas', $t)['json'];
    check(array_values($report['resumen']) === $expected, 'Seis indicadores difieren de SQL');
    $monitor = http('GET', $base.'monitoreo?incluir_listas=1', $t)['json'];
    check($monitor['resumen']['total_ingresados'] === $sql->asistentes && count($monitor['listas']['ingresados']) === $sql->asistentes, 'Monitoreo difiere de SQL');
    check(http('GET', '/api/dashboard', $t)['json']['secciones']['resumen']['total_ingresados'] === $sql->asistentes, 'Dashboard difiere de SQL');
    http('GET', $base.'reportes/estadisticas?fecha_desde=2026-10-29&fecha_hasta=2026-10-28', $t, [], 422);
    check(array_sum(http('GET', $base.'reportes/estadisticas?fecha_desde=2099-01-01', $t)['json']['resumen']) === 0, 'Rango sin resultados no vacío');
    check(array_sum(http('GET', '/api/examenes/'.$empty->id.'/reportes/estadisticas', $t)['json']['resumen']) === 0, 'Reporte vacío no cero');
    $xlsx = http('GET', $base.'reportes/estadisticas/descargar?formato=xlsx', $t)['raw'];
    file_put_contents($evidence.'/reporte.xlsx', $xlsx);
    $book = IOFactory::load($evidence.'/reporte.xlsx');
    check($book->getSheetNames() === ['Resumen', 'Asistencia', 'Intentos', 'Franjas horarias'], 'Hojas XLSX incorrectas');
    for ($i = 0; $i < 6; $i++) check($book->getSheetByName('Resumen')->getCell('B'.($i + 9))->getValue() === $expected[$i], 'Indicador XLSX distinto de SQL');
    $attendance = $book->getSheetByName('Asistencia')->toArray();
    check(count($attendance) === 301 && str_contains(json_encode($attendance, JSON_UNESCAPED_UNICODE), 'Ñúñez'), 'Asistencia/tildes XLSX incorrectas');
    check($book->getSheetByName('Franjas horarias')->getHighestDataRow() === 25, 'Faltan franjas XLSX');
    $hourly = DB::select("SELECT extract(hour from first_at)::int AS hora,count(*)::int AS n FROM (SELECT min(l.fecha_escaneo) first_at FROM estudiante_examen ee JOIN logs_asistencias l ON l.id_examen=ee.id_examen AND l.id_estudiante=ee.id_estudiante AND l.resultado='PERMITIDO' WHERE ee.id_examen=? GROUP BY ee.id_estudiante) x GROUP BY 1", [$exam->id]);
    $byHour = array_column($hourly, 'n', 'hora');
    for ($i = 0; $i < 24; $i++) check($book->getSheetByName('Franjas horarias')->getCell('C'.($i + 2))->getValue() === ($byHour[$i] ?? 0), 'Franja XLSX difiere de SQL');
    $book->disconnectWorksheets();
    file_put_contents($evidence.'/reporte.pdf', http('GET', $base.'reportes/estadisticas/descargar?formato=pdf', $t)['raw']);
    file_put_contents($evidence.'/referencia.json', json_encode(['resumen' => $report['resumen'], 'franjas' => $byHour, 'zona_horaria' => DB::selectOne('SHOW timezone')->TimeZone ?? null], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    done('HU16/HU17/HU20 vs SQL, seis métricas, filtros, XLSX cuatro hojas y 24 franjas');

    // Inducir una falla SQL real en una sola sección, con restauración garantizada.
    Cache::store('file')->forget('sprint3:dashboard:admin:'.$admin->id.':aulas');
    DB::statement('ALTER TABLE aulas RENAME TO aulas_qa_unavailable');
    try {
        $partial = http('GET', '/api/dashboard', $tokens['admin'])['json'];
        check($partial['secciones']['resumen']['aulas_disponibles'] === null && isset($partial['errores_secciones']['aulas_disponibles']), 'Falla parcial convertida en cero');
        check(is_int($partial['secciones']['resumen']['estudiantes']), 'Falla parcial contaminó otra sección');
    } finally {
        DB::statement('ALTER TABLE aulas_qa_unavailable RENAME TO aulas');
    }
    done('dashboard: error SQL parcial aislado y null explícito');

    // Carga HTTP de 300 inscritos, cuatro usuarios/procesos simultáneos, sin SLA inventado.
    $latencies = [];
    for ($round = 0; $round < 5; $round++) {
        $workers = [];
        foreach ([$t, $tokens['admin'], $t, $tokens['admin']] as $token) $workers[] = startRequest('GET', $base.'monitoreo?incluir_listas=1', $token);
        foreach ($workers as $w) {
            $result = finishRequest($w);
            check($result['status'] === 200 && $result['body']['resumen']['total_estudiantes'] === 300, 'Carga concurrente falló');
            $latencies[] = $result['ms'];
        }
    }
    sort($latencies);
    $metrics['carga_300'] = ['peticiones' => count($latencies), 'simultaneas' => 4, 'p50_ms' => $latencies[9], 'p95_ms' => $latencies[18], 'memoria_orquestador_bytes' => memory_get_peak_usage(true), 'sla' => 'no definido'];
    done('carga HTTP 300 alumnos con cuatro clientes concurrentes');

    // La migración incremental se prueba en un esquema transaccional separado con duplicados heredados.
    DB::beginTransaction();
    try {
        DB::statement('CREATE SCHEMA sprint3_migration_qa');
        DB::statement('SET LOCAL search_path TO sprint3_migration_qa');
        DB::statement('CREATE TABLE examenes (id uuid PRIMARY KEY)');
        DB::statement('CREATE TABLE estudiantes (id uuid PRIMARY KEY)');
        DB::statement('CREATE TABLE expulsiones (id uuid PRIMARY KEY,id_examen uuid,id_estudiante uuid,fecha_hora timestamp)');
        DB::statement('CREATE TABLE logs_auditoria (id uuid PRIMARY KEY,modulo text,detalles jsonb)');
        $eid = (string) Str::uuid(); $sid = (string) Str::uuid(); $old = (string) Str::uuid(); $new = (string) Str::uuid();
        DB::table('examenes')->insert(['id' => $eid]); DB::table('estudiantes')->insert(['id' => $sid]);
        DB::table('expulsiones')->insert([['id' => $old, 'id_examen' => $eid, 'id_estudiante' => $sid, 'fecha_hora' => '2026-10-28 10:00:00'], ['id' => $new, 'id_examen' => $eid, 'id_estudiante' => $sid, 'fecha_hora' => '2026-10-28 11:00:00']]);
        $migration = require __DIR__.'/../database/migrations/2026_10_28_120000_guardar_vigencia_y_baja_expulsiones.php';
        $migration->up();
        check(DB::table('expulsiones')->count() === 2 && DB::table('expulsion_vigencias')->value('id_expulsion') === $new, 'Backfill perdió duplicados');
        DB::table('expulsiones')->where('id', $new)->update(['deleted_at' => now()]);
        check(DB::table('expulsion_vigencias')->value('id_expulsion') === $old, 'Vigencia no pasó al incidente histórico');
        DB::table('expulsiones')->where('id', $old)->update(['deleted_at' => now()]);
        check(DB::table('expulsion_vigencias')->count() === 0 && DB::table('expulsiones')->count() === 2, 'Baja histórica perdió filas');
    } finally {
        DB::rollBack();
    }
    done('migración incremental: backfill de duplicados y vigencia histórica conservada');

    // Credenciales sintéticas solo para el siguiente proceso del runner; no se suben como evidencia.
    file_put_contents('/tmp/sciem-browser-fixture.json', json_encode(['tokens' => $tokens, 'student_token' => $studentToken, 'exam' => $exam->id, 'empty_exam' => $empty->id, 'student' => $student->id, 'sis' => $student->codigo_sis, 'qr' => qr($exam, $student), 'teacher_email' => $teacher->email, 'password' => $password], JSON_THROW_ON_ERROR));
    chmod('/tmp/sciem-browser-fixture.json', 0600);
    echo 'METRICAS '.json_encode($metrics, JSON_UNESCAPED_UNICODE).PHP_EOL;
    file_put_contents($evidence.'/extended.json', json_encode(['passed' => $passed, 'metrics' => $metrics], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
} catch (Throwable $e) {
    fwrite(STDERR, 'FAIL '.$e->getMessage().' en '.$e->getFile().':'.$e->getLine().PHP_EOL);
    exit(1);
}
