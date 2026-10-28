<?php

namespace Tests\Sprint3\Feature;

use App\Models\Admin;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Expulsion;
use App\Models\LogAsistencia;
use App\Models\LogAuditoria;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

/** PostgreSQL real, migrado previamente. Sin RefreshDatabase, truncados ni semillas generales. */
class FlujosSprint3Test extends TestCase
{
    private Docente $teacher;

    private Docente $other;

    private Admin $admin;

    private Estudiante $student;

    private Estudiante $aux;

    private Examen $exam;

    private bool $transactionStarted = false;

    protected function setUp(): void
    {
        parent::setUp();
        if (getenv('SCIEM_QA_ALLOW_WRITE') !== '1') {
            $this->markTestSkipped('Requiere SCIEM_QA_ALLOW_WRITE=1 y BD PostgreSQL aislada migrada.');
        }
        $this->assertSame('pgsql', DB::getDriverName());
        $this->assertSame('sciem_sprint3_test', DB::connection()->getDatabaseName());
        $this->assertSame('sciem_sprint3_test', DB::selectOne('SELECT current_database() AS db')->db);
        DB::beginTransaction();
        $this->transactionStarted = true;
        $this->teacher = $this->teacher('Titular');
        $this->other = $this->teacher('Ajeno');
        $this->admin = Admin::create(['ci' => 'QA'.random_int(100000, 999999), 'nombre' => 'QA', 'apellido_paterno' => 'Admin', 'activo' => true, 'password' => Hash::make(Str::random(32))]);
        $this->student = $this->student();
        $this->aux = $this->student(true);
        $materia = (string) Str::uuid();
        $aula = (string) Str::uuid();
        DB::table('materias')->insert(['id' => $materia, 'nombre' => 'QA Sprint 3']);
        DB::table('aulas')->insert(['id' => $aula, 'nombre' => 'QA', 'ubicacion' => 'Fixture', 'estado' => 'Disponible', 'capacidad' => 350]);
        $this->exam = Examen::create(['nombre' => 'QA Sprint 3', 'id_docente' => $this->teacher->id, 'id_materia' => $materia, 'id_aula' => $aula, 'estado' => 'En proceso', 'fecha' => now('America/La_Paz')->toDateString(), 'hora_ini' => '00:00:00', 'hora_fin' => '23:59:59']);
        DB::table('estudiante_examen')->insert(['id_examen' => $this->exam->id, 'id_estudiante' => $this->student->id, 'estado' => 'Habilitado']);
        DB::table('examen_auxiliar')->insert(['id' => (string) Str::uuid(), 'id_examen' => $this->exam->id, 'id_auxiliar' => $this->aux->id, 'estado' => 'Activo']);
        $this->asRole($this->teacher, 'docente');
    }

    protected function tearDown(): void
    {
        if ($this->transactionStarted) {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
        }
        parent::tearDown();
    }

    private function teacher(string $name): Docente
    {
        return Docente::create(['nombre' => 'QA', 'apellido_paterno' => $name, 'ci' => 'QA'.random_int(100000, 999999), 'email' => Str::uuid().'@fcyt.umss.edu.bo', 'password' => Hash::make(Str::random(32)), 'activo' => true]);
    }

    private function student(bool $aux = false): Estudiante
    {
        return Estudiante::create(['nombre' => 'José', 'apellido_paterno' => 'Pérez', 'apellido_materno' => 'Ñúñez', 'codigo_sis' => (string) random_int(100000000, 999999999), 'email_institucional' => Str::uuid().'@est.umss.edu', 'activo' => true, 'es_auxiliar' => $aux, 'password' => Hash::make(Str::random(32))]);
    }

    private function asRole($user, string $role): void
    {
        $user->withAccessToken(new PersonalAccessToken(['abilities' => ['role:'.$role]]));
        $this->actingAs($user, 'sanctum');
    }

    private function url(string $suffix): string
    {
        return '/api/examenes/'.$this->exam->id.'/'.$suffix;
    }

    private function admit(): void
    {
        $this->postJson($this->url('registro-manual'), ['id_estudiante' => $this->student->id, 'motivo' => 'Fixture de ingreso'])->assertOk();
    }

    private function expel(): string
    {
        return $this->postJson($this->url('expulsiones'), ['id_estudiante' => $this->student->id, 'motivo' => 'Uso de material no permitido'])->assertCreated()->json('expulsion.id');
    }

    public function test_expulsion_edit_delete_history_and_no_reentry(): void
    {
        $this->postJson($this->url('expulsiones'), ['id_estudiante' => $this->student->id, 'motivo' => 'Motivo válido'])->assertStatus(422);
        $this->admit();
        $id = $this->expel();
        $this->postJson($this->url('expulsiones'), ['id_estudiante' => $this->student->id, 'motivo' => 'Duplicado'])->assertConflict();
        $this->postJson($this->url('registro-manual'), ['id_estudiante' => $this->student->id])->assertForbidden()->assertJsonPath('resultado', 'EXPULSADO');
        $this->patchJson($this->url('expulsiones/'.$id), ['motivo' => 'Corrección autorizada'])->assertOk()->assertJsonPath('expulsion.motivo_original', 'Uso de material no permitido');
        $this->deleteJson($this->url('expulsiones/'.$id), ['motivo_eliminacion' => 'Registro equivocado'])->assertOk();
        $this->assertNotNull(Expulsion::withTrashed()->findOrFail($id)->deleted_at);
        $this->assertSame(0, DB::table('expulsion_vigencias')->where('id_examen', $this->exam->id)->count());
        $history = $this->getJson($this->url('expulsiones'))->assertOk()->assertJsonPath('total', 1);
        $this->assertCount(1, $history->json('expulsiones.0.ediciones'));
        $this->assertSame(3, LogAuditoria::where('modulo', 'EXPULSIONES')->where('detalles->expulsion_id', $id)->count());
        // Eliminar una expulsión no elimina ni duplica un ingreso autorizado.
        $this->postJson($this->url('registro-manual'), ['id_estudiante' => $this->student->id])->assertConflict();
        $this->assertSame(1, LogAsistencia::where('id_examen', $this->exam->id)->where('resultado', 'PERMITIDO')->count());
        $this->expel(); // Una nueva expulsión es posible tras la baja lógica de la anterior.
    }

    public function test_auxiliary_scope_dual_role_and_revocation(): void
    {
        $this->asRole($this->other, 'docente');
        $this->getJson($this->url('expulsiones'))->assertForbidden();
        $this->postJson($this->url('registro-manual'), ['id_estudiante' => $this->student->id])->assertForbidden();
        $this->asRole($this->aux, 'auxiliar');
        $this->getJson('/api/me')->assertOk()->assertJsonPath('rol', 'auxiliar');
        $this->getJson('/api/dashboard')->assertOk()->assertJsonPath('rol', 'auxiliar')->assertJsonPath('secciones.resumen.total_examenes', 1);
        $this->getJson($this->url('expulsiones/estudiantes'))->assertOk();
        $this->getJson($this->url('monitoreo'))->assertForbidden();
        $this->getJson($this->url('reportes/estadisticas'))->assertForbidden();
        DB::table('examen_auxiliar')->where('id_auxiliar', $this->aux->id)->update(['estado' => 'Inactivo']);
        $this->getJson($this->url('expulsiones'))->assertForbidden();
        $this->getJson('/api/dashboard')->assertOk()->assertJsonPath('secciones.resumen.total_examenes', 0);
        $this->asRole($this->aux, 'estudiante');
        $this->getJson('/api/dashboard')->assertOk()->assertJsonPath('rol', 'estudiante');
        $this->getJson($this->url('expulsiones'))->assertForbidden();
    }

    public function test_motive_validation_is_independent_of_student_validation_and_window(): void
    {
        $this->admit();
        $this->postJson($this->url('expulsiones'), ['id_estudiante' => $this->student->id, 'motivo' => '   '])->assertStatus(422)->assertJsonValidationErrors('motivo');
        $this->assertSame(0, Expulsion::where('id_examen', $this->exam->id)->count());
        $this->exam->update(['estado' => 'Terminado']);
        $this->postJson($this->url('expulsiones'), ['id_estudiante' => $this->student->id, 'motivo' => 'Motivo válido'])->assertStatus(422);
    }

    public function test_signed_qr_is_read_only_and_respects_enrollment(): void
    {
        $this->admit();
        $payload = base64_encode(json_encode(['id_examen' => $this->exam->id, 'id_estudiante' => $this->student->id, 'expira_at' => now()->addMinutes(5)->timestamp]));
        $qr = $payload.'.'.hash_hmac('sha256', $payload, config('app.key'));
        $before = LogAsistencia::count();
        $this->getJson($this->url('expulsiones/estudiantes').'?'.http_build_query(['qr_data' => $qr]))->assertOk()->assertJsonPath('estudiantes.0.elegible', true);
        $this->assertSame($before, LogAsistencia::count());
        $this->assertSame(0, Expulsion::where('id_examen', $this->exam->id)->count());
    }

    public function test_summary_lists_reports_exports_and_dashboard_use_same_attendance(): void
    {
        $this->admit();
        // Log de no inscrito: no debe aumentar asistentes de la nómina.
        LogAsistencia::create(['id_examen' => $this->exam->id, 'id_estudiante' => $this->aux->id, 'codigo_sis_escaneado' => $this->aux->codigo_sis, 'resultado' => 'PERMITIDO', 'mensaje' => 'Anomalía histórica fixture', 'fecha_escaneo' => now('America/La_Paz')]);
        DB::table('estudiante_examen')->where('id_examen', $this->exam->id)->update(['fecha_ingreso' => null]);
        $monitor = $this->getJson($this->url('monitoreo').'?incluir_listas=1')->assertOk()->assertJsonPath('resumen.total_estudiantes', 1)->assertJsonPath('resumen.total_ingresados', 1);
        $this->assertCount(1, $monitor->json('listas.ingresados'));
        $this->getJson($this->url('monitoreo').'?incluir_listas=1&revision='.$monitor->json('revision'))->assertOk()->assertJsonMissingPath('listas');
        $this->student->update(['nombre' => 'María']);
        $this->getJson($this->url('monitoreo').'?incluir_listas=1&revision='.$monitor->json('revision'))->assertOk()->assertJsonPath('listas.ingresados.0.nombre', 'María');
        $this->getJson($this->url('reportes/estadisticas'))->assertOk()->assertJsonPath('resumen.total_asistentes', 1)->assertJsonPath('resumen.total_ausentes', 0);
        $this->getJson('/api/dashboard')->assertOk()->assertJsonPath('secciones.resumen.total_ingresados', 1);
        $xlsx = $this->get($this->url('reportes/estadisticas/descargar').'?formato=xlsx')->assertOk()->streamedContent();
        $path = tempnam(sys_get_temp_dir(), 'sciem-xlsx-');
        try {
            file_put_contents($path, $xlsx);
            $book = IOFactory::load($path);
            $this->assertSame(['Resumen', 'Asistencia', 'Intentos', 'Franjas horarias'], $book->getSheetNames());
            $this->assertStringContainsString('María', json_encode($book->getSheetByName('Asistencia')->toArray(), JSON_UNESCAPED_UNICODE));
            $book->disconnectWorksheets();
        } finally {
            @unlink($path);
        }
        $pdf = $this->get($this->url('reportes/estadisticas/descargar').'?formato=pdf')->assertOk();
        $this->assertStringStartsWith('%PDF-', $pdf->getContent());
    }

    public function test_audit_failure_rolls_back_expulsion_and_unique_guard(): void
    {
        $this->admit();
        $dispatcher = LogAuditoria::getEventDispatcher();
        LogAuditoria::setEventDispatcher(clone $dispatcher);
        try {
            LogAuditoria::creating(function ($log) {
                if ($log->accion === 'EXPULSION_REGISTRADA') {
                    throw new \RuntimeException('QA simulated audit failure');
                }
            });
            $this->postJson($this->url('expulsiones'), ['id_estudiante' => $this->student->id, 'motivo' => 'Debe revertirse'])->assertStatus(500);
        } finally {
            LogAuditoria::setEventDispatcher($dispatcher);
        }
        $this->assertSame(0, Expulsion::where('id_examen', $this->exam->id)->count());
        $this->assertSame(0, DB::table('expulsion_vigencias')->where('id_examen', $this->exam->id)->count());
    }

    public function test_300_students_keep_balanced_snapshot_and_report_query_metrics(): void
    {
        $rows = [];
        $prefix = (string) random_int(100000, 999999);
        for ($i = 0; $i < 299; $i++) {
            $rows[] = ['id' => (string) Str::uuid(), 'nombre' => 'QA', 'apellido_paterno' => 'Carga', 'codigo_sis' => $prefix.str_pad((string) $i, 3, '0', STR_PAD_LEFT), 'email_institucional' => Str::uuid().'@est.umss.edu'];
        }
        DB::table('estudiantes')->insert($rows);
        DB::table('estudiante_examen')->insert(array_map(fn ($r) => ['id_examen' => $this->exam->id, 'id_estudiante' => $r['id'], 'estado' => 'Habilitado'], $rows));
        DB::enableQueryLog();
        $start = microtime(true);
        $response = $this->getJson($this->url('monitoreo').'?incluir_listas=1')->assertOk()->assertJsonPath('resumen.total_estudiantes', 300)->assertJsonPath('resumen.total_ausentes', 300);
        $elapsed = round((microtime(true) - $start) * 1000, 2);
        $queries = count(DB::getQueryLog());
        DB::disableQueryLog();
        $this->assertCount(300, $response->json('listas.ausentes'));
        fwrite(STDERR, "\nMETRICA ".json_encode(['escenario' => 'monitoreo_300', 'ms' => $elapsed, 'queries' => $queries, 'umbral_rnf' => 'pendiente'])."\n");
    }

    public function test_admin_cache_reuses_slow_metrics_without_caching_authorization(): void
    {
        $this->asRole($this->admin, 'admin');
        DB::enableQueryLog();
        DB::flushQueryLog();
        $this->getJson('/api/dashboard')->assertOk()->assertJsonPath('rol', 'admin');
        $cold = count(DB::getQueryLog());
        DB::flushQueryLog();
        $this->getJson('/api/dashboard')->assertOk();
        $warm = count(DB::getQueryLog());
        DB::disableQueryLog();
        $this->assertLessThan($cold, $warm);
        $this->admin->activo = false;
        $this->getJson('/api/dashboard')->assertForbidden();
    }
}
