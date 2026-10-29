<?php

namespace Tests\Sprint3\Unit;

use App\Http\Middleware\OperacionExamen;
use App\Models\Admin;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Services\AccesoExamen;
use App\Services\IdentificadorQr;
use App\Services\RolOperativo;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class ContratosTest extends TestCase
{
    private const EXAM = '11111111-1111-4111-8111-111111111111';

    private const STUDENT = '22222222-2222-4222-8222-222222222222';

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.key' => 'clave-solo-fixture-no-produccion']);
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-28 10:00:00', 'America/La_Paz'));
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    private function request($user, array $abilities): Request
    {
        $user->withAccessToken(new PersonalAccessToken(['abilities' => $abilities]));
        $request = Request::create('/');
        $request->setUserResolver(fn () => $user);

        return $request;
    }

    private function token(array $replace = []): string
    {
        $payload = base64_encode(json_encode(array_merge(['id_examen' => self::EXAM, 'id_estudiante' => self::STUDENT, 'expira_at' => CarbonImmutable::now()->addMinutes(5)->timestamp], $replace)));

        return $payload.'.'.hash_hmac('sha256', $payload, config('app.key'));
    }

    public function test_dual_student_uses_only_selected_role_and_revocation_is_immediate(): void
    {
        $user = new Estudiante(['activo' => true, 'es_auxiliar' => true]);
        $this->assertSame('estudiante', RolOperativo::actual($this->request($user, ['role:estudiante'])));
        $this->assertSame('auxiliar', RolOperativo::actual($this->request($user, ['role:auxiliar'])));
        $this->assertNull(RolOperativo::actual($this->request($user, ['role:estudiante', 'role:auxiliar'])));
        $this->assertNull(RolOperativo::actual($this->request($user, ['*'])));
        $this->assertNull(RolOperativo::actual($this->request($user, ['role:admin'])));
        $request = $this->request($user, ['role:auxiliar']);
        $user->es_auxiliar = false;
        $this->assertNull(RolOperativo::actual($request));
        $user->activo = false;
        $this->assertNull(RolOperativo::actual($this->request($user, ['role:estudiante'])));
    }

    public function test_teacher_only_owns_own_exam_and_admin_keeps_scope(): void
    {
        $teacher = new Docente(['activo' => true]);
        $teacher->id = 'teacher';
        $exam = new Examen(['id_docente' => 'teacher']);
        $request = $this->request($teacher, ['role:docente']);
        $this->assertTrue(AccesoExamen::permite($request, $exam));
        $exam->id_docente = 'other';
        $this->assertFalse(AccesoExamen::permite($request, $exam));
        $this->assertTrue(AccesoExamen::permite($this->request(new Admin(['activo' => true]), ['role:admin']), $exam));
    }

    public function test_exam_window_includes_boundaries_and_supports_midnight(): void
    {
        $e = new Examen(['fecha' => '2026-10-28', 'hora_ini' => '10:00:00', 'hora_fin' => '11:00:00', 'estado' => 'En proceso']);
        $this->assertTrue(AccesoExamen::enHorario($e));
        $this->assertFalse(AccesoExamen::enHorario($e, CarbonImmutable::now()->subSecond()));
        $this->assertTrue(AccesoExamen::enHorario($e, CarbonImmutable::now()->addHour()));
        $this->assertFalse(AccesoExamen::enHorario($e, CarbonImmutable::now()->addHour()->addSecond()));
        $e->hora_ini = '23:00:00';
        $e->hora_fin = '01:00:00';
        $this->assertTrue(AccesoExamen::enHorario($e, CarbonImmutable::parse('2026-10-29 00:30:00', 'America/La_Paz')));
        $e->estado = 'Terminado';
        $this->assertFalse(AccesoExamen::enHorario($e));
    }

    public function test_current_issuer_signature_and_legacy_identifier_are_readable(): void
    {
        $this->assertSame(self::STUDENT, IdentificadorQr::leer($this->token(), self::EXAM)['id']);
        $this->assertSame('202600001', IdentificadorQr::leer('{"sis":"202600001"}', self::EXAM)['sis']);
    }

    public function test_forged_signature_is_rejected(): void
    {
        $this->expectException(ValidationException::class);
        IdentificadorQr::leer($this->token().'x', self::EXAM);
    }

    public function test_expired_signature_is_rejected(): void
    {
        $this->expectException(ValidationException::class);
        IdentificadorQr::leer($this->token(['expira_at' => CarbonImmutable::now()->subSecond()->timestamp]), self::EXAM);
    }

    public function test_other_exam_is_rejected(): void
    {
        $this->expectException(ValidationException::class);
        IdentificadorQr::leer($this->token(['id_examen' => self::STUDENT]), self::EXAM);
    }

    public function test_malformed_identifier_is_rejected_without_a_database_query(): void
    {
        $this->expectException(ValidationException::class);
        IdentificadorQr::leer('{"id_estudiante":"invalid"}', self::EXAM);
    }

    public function test_routes_preserve_edit_delete_and_all_producers_share_the_lock(): void
    {
        $routes = collect(Route::getRoutes()->getRoutes());
        $this->assertNull($routes->first(fn ($r) => $r->uri() === 'api/seed-render-now'));
        foreach (['POST:expulsiones', 'PATCH:expulsiones/{expulsionId}', 'DELETE:expulsiones/{expulsionId}', 'POST:registro-manual', 'POST:verificar-ingreso', 'POST:sincronizar-asistencias'] as $spec) {
            [$method, $suffix] = explode(':', $spec, 2);
            $r = $routes->first(fn ($r) => $r->uri() === 'api/examenes/{id}/'.$suffix && in_array($method, $r->methods()));
            $this->assertNotNull($r, $spec);
            $this->assertContains(OperacionExamen::class, $r->middleware(), $spec);
        }
        $alias = $routes->first(fn ($r) => $r->uri() === 'api/examenes/{id_examen}/escanear-ingreso');
        $this->assertContains(OperacionExamen::class, $alias->middleware());
    }

    public function test_guest_cannot_access_our_four_modules(): void
    {
        foreach (['dashboard', 'examenes/'.self::EXAM.'/expulsiones', 'examenes/'.self::EXAM.'/monitoreo', 'examenes/'.self::EXAM.'/reportes/estadisticas'] as $path) {
            $this->getJson('/api/'.$path)->assertUnauthorized();
        }
    }
}
