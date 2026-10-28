<?php

// CONFIRMADO contra VerificacionController (HU-10/11/12) y el schema vigente:
// - POST /api/examenes/{id}/verificar-ingreso (CheckRole: admin, docente, auxiliar).
// - Tabla logs_asistencias con índice único parcial.
// - PARCHE APLICADO: El auxiliar se simula como Estudiante (es_auxiliar=true)
//   para cumplir con la Foreign Key de `examen_auxiliar` -> `estudiantes`.

use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\LogAuditoria;
use App\Models\Norma;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

afterEach(fn () => Carbon::setTestNow());

function qrJson(string $sis, ?string $materia = null): string
{
    return json_encode(array_filter(['sis' => $sis, 'materia' => $materia], fn ($v) => $v !== null));
}

function ingresoFixture(string $estado = 'Habilitado', ?string $motivo = null): array
{
    $examen = Examen::factory()->create();
    $estudiante = Estudiante::factory()->create();

    $examen->estudiantes()->attach($estudiante->id, [
        'estado' => $estado, 'motivo_estado' => $motivo, 'ajuste_manual' => false,
    ]);

    return [$examen, $estudiante];
}

function verificarIngreso($test, $actor, Examen $examen, string $qr)
{
    if ($actor instanceof Estudiante && $actor->es_auxiliar) {
        DB::table('examen_auxiliar')->updateOrInsert(
            ['id_examen' => $examen->id, 'id_auxiliar' => $actor->id],
            ['id' => (string) Str::uuid(), 'estado' => 'Aceptada', 'created_at' => now(), 'updated_at' => now()]
        );
        Sanctum::actingAs($actor, ['role:auxiliar']);
    } else {
        $test->actingAs($actor, 'sanctum');
    }

    return $test->postJson("/api/examenes/{$examen->id}/verificar-ingreso", ['qr_data' => $qr]);
}

// ---------------- HU-10: escaneo e identificación ----------------

it('TC-HU10-1: identifica al estudiante (nombre completo y código SIS) al validar un QR válido', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    [$examen, $estudiante] = ingresoFixture();

    $response = verificarIngreso($this, $auxiliar, $examen, qrJson($estudiante->codigo_sis));

    $response->assertOk()
        ->assertJsonPath('resultado', 'PERMITIDO')
        ->assertJsonPath('estudiante.codigo_sis', $estudiante->codigo_sis)
        ->assertJsonPath(
            'estudiante.nombre_completo',
            trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}")
        );
})->group('grupo1');

it('TC-HU10-2 (SIS): localiza al estudiante por código SIS en la búsqueda manual', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    $estudiante = Estudiante::factory()->create();

    Sanctum::actingAs($auxiliar, ['role:auxiliar']);
    $this->getJson("/api/estudiantes/{$estudiante->codigo_sis}")
        ->assertOk()
        ->assertJsonPath('id', $estudiante->id);
})->group('grupo1');

it('TC-HU10-2 (CI): localiza al estudiante por carnet de identidad en la búsqueda manual', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    $estudiante = Estudiante::factory()->create();

    Sanctum::actingAs($auxiliar, ['role:auxiliar']);
    $this->getJson('/api/estudiantes?search=' . $estudiante->ci)
        ->assertOk()
        ->assertJsonPath('data.0.id', $estudiante->id);
})->group('grupo1');

it('TC-HU10-3: un QR con formato no esperado responde 400 ERROR_DATOS_INVALIDOS y deja registro', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    $examen = Examen::factory()->create();

    $response = verificarIngreso($this, $auxiliar, $examen, 'esto no es un JSON');

    $response->assertStatus(400)->assertJsonPath('resultado', 'ERROR_DATOS_INVALIDOS');
    $this->assertDatabaseHas('logs_asistencias', [
        'id_examen' => $examen->id, 'resultado' => 'ERROR_DATOS_INVALIDOS',
    ]);
})->group('grupo1');

it('TC-HU10-4: informa que no existe el estudiante al buscar un código SIS inexistente', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);

    Sanctum::actingAs($auxiliar, ['role:auxiliar']);
    // GAP Documentado: Devuelve 503 por comparar UUID con un string. Dejamos el assert 404 para que el dev lo corrija.
    $this->getJson('/api/estudiantes/999999999')->assertStatus(404);
})->group('grupo1');

// ---------------- HU-11: validación de habilitación y ambiente ----------------

it('TC-HU11-3: rechaza (403 RECHAZADO_NO_INSCRITO) a un estudiante sin inscripción en el examen y deja registro', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    $examen = Examen::factory()->create();
    $ajeno = Estudiante::factory()->create();

    $response = verificarIngreso($this, $auxiliar, $examen, qrJson($ajeno->codigo_sis));

    $response->assertStatus(403)->assertJsonPath('resultado', 'RECHAZADO_NO_INSCRITO');
    $this->assertDatabaseHas('logs_asistencias', [
        'id_examen' => $examen->id, 'id_estudiante' => $ajeno->id, 'resultado' => 'RECHAZADO_NO_INSCRITO',
    ]);
})->group('grupo1');

it('TC-HU11-4: rechaza (403 RECHAZADO_INHABILITADO) mostrando el motivo de inhabilitación registrado', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    [$examen, $estudiante] = ingresoFixture('Inhabilitado', 'Falta pago de matricula');

    $response = verificarIngreso($this, $auxiliar, $examen, qrJson($estudiante->codigo_sis));

    $response->assertStatus(403)
        ->assertJsonPath('resultado', 'RECHAZADO_INHABILITADO')
        ->assertJsonPath('detalles.motivo_inhabilitacion', 'Falta pago de matricula');
})->group('grupo1');

it('TC-HU11-5: rechaza indicando el aula correcta cuando el aula del punto de control no coincide', function () {
})->skip('Sin soporte en backend: verificar-ingreso no recibe el aula del punto de control.')
  ->group('grupo1');

it('TC-HU11-6: no autoriza a un estudiante habilitado solo en otro examen', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    $examenActual = Examen::factory()->create();
    [$otroExamen, $estudiante] = ingresoFixture();

    $response = verificarIngreso($this, $auxiliar, $examenActual, qrJson($estudiante->codigo_sis));

    $response->assertStatus(403)->assertJsonPath('resultado', 'RECHAZADO_NO_INSCRITO');
    $this->assertDatabaseMissing('logs_asistencias', [
        'id_examen' => $examenActual->id, 'id_estudiante' => $estudiante->id, 'resultado' => 'PERMITIDO',
    ]);
})->group('grupo1');

it('TC-HU11-7: la información del examen incluye asignatura, aula, horario y normas', function () {
    $examen = Examen::factory()->create();
    $examen->normas()->attach(Norma::factory()->create()->id);

    // Endpoint público
    $this->getJson("/api/examenes/{$examen->id}")
        ->assertOk()
        ->assertJsonStructure([
            'id', 'hora_ini', 'hora_fin',
            'materia' => ['id', 'nombre'],
            'aula' => ['id', 'nombre'],
            'normas' => ['*' => ['id', 'titulo', 'tipo']],
        ]);
})->group('grupo1');

it('TC-HU11-8: cada rechazo muestra un motivo específico, nunca un mensaje genérico', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    [$examenA, $estudianteA] = ingresoFixture();
    [$examenB, $estudianteB] = ingresoFixture('Inhabilitado', 'Falta documentacion');
    $ajeno = Estudiante::factory()->create();

    $noInscrito = verificarIngreso($this, $auxiliar, $examenA, qrJson($ajeno->codigo_sis));
    $inhabilitado = verificarIngreso($this, $auxiliar, $examenB, qrJson($estudianteB->codigo_sis));
    verificarIngreso($this, $auxiliar, $examenA, qrJson($estudianteA->codigo_sis))->assertOk();
    $yaIngreso = verificarIngreso($this, $auxiliar, $examenA, qrJson($estudianteA->codigo_sis));

    $respuestas = [$noInscrito, $inhabilitado, $yaIngreso];
    $resultados = array_map(fn ($r) => $r->json('resultado'), $respuestas);
    $mensajes = array_map(fn ($r) => $r->json('message'), $respuestas);

    expect($resultados)->toBe(['RECHAZADO_NO_INSCRITO', 'RECHAZADO_INHABILITADO', 'RECHAZADO_YA_INGRESO']);
    expect(array_unique($mensajes))->toHaveCount(3);
    foreach ($mensajes as $mensaje) {
        expect($mensaje)->not->toBeEmpty();
    }
})->group('grupo1');

// ---------------- HU-12: control de concurrencia e ingreso ----------------

it('TC-HU12-1: registra fecha y hora de ingreso en la inscripción al autorizar', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    [$examen, $estudiante] = ingresoFixture();

    verificarIngreso($this, $auxiliar, $examen, qrJson($estudiante->codigo_sis))->assertOk();

    $fechaIngreso = DB::table('estudiante_examen')
        ->where('id_examen', $examen->id)->where('id_estudiante', $estudiante->id)
        ->value('fecha_ingreso');

    expect($fechaIngreso)->not->toBeNull();
})->group('grupo1');

it('TC-HU12-2: inserta en logs_asistencias una entrada PERMITIDO al autorizar', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    [$examen, $estudiante] = ingresoFixture();

    verificarIngreso($this, $auxiliar, $examen, qrJson($estudiante->codigo_sis))->assertOk();

    $this->assertDatabaseHas('logs_asistencias', [
        'id_examen' => $examen->id, 'id_estudiante' => $estudiante->id, 'resultado' => 'PERMITIDO',
    ]);
})->group('grupo1');

it('TC-HU12-3: rechaza estrictamente un doble ingreso indicando la fecha/hora del primero', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    [$examen, $estudiante] = ingresoFixture();

    verificarIngreso($this, $auxiliar, $examen, qrJson($estudiante->codigo_sis))->assertOk();
    $segundo = verificarIngreso($this, $auxiliar, $examen, qrJson($estudiante->codigo_sis));

    $segundo->assertStatus(409)
        ->assertJsonPath('resultado', 'RECHAZADO_YA_INGRESO')
        ->assertJsonStructure(['detalles' => ['primer_ingreso']]);
})->group('grupo1');

it('TC-HU12-4: el intento duplicado deja un registro RECHAZADO_YA_INGRESO y un solo PERMITIDO', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    [$examen, $estudiante] = ingresoFixture();

    verificarIngreso($this, $auxiliar, $examen, qrJson($estudiante->codigo_sis))->assertOk();
    verificarIngreso($this, $auxiliar, $examen, qrJson($estudiante->codigo_sis))->assertStatus(409);

    $filtro = fn (string $resultado) => DB::table('logs_asistencias')
        ->where('id_examen', $examen->id)->where('id_estudiante', $estudiante->id)
        ->where('resultado', $resultado)->count();

    expect($filtro('PERMITIDO'))->toBe(1);
    expect($filtro('RECHAZADO_YA_INGRESO'))->toBe(1);
})->group('grupo1');

it('TC-HU12-6: registra el ingreso con la hora del servidor, ignorando cualquier hora enviada por el dispositivo', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    [$examen, $estudiante] = ingresoFixture();

    Carbon::setTestNow(Carbon::parse('2026-01-01 12:00:00', 'UTC'));

    DB::table('examen_auxiliar')->updateOrInsert(
        ['id_examen' => $examen->id, 'id_auxiliar' => $auxiliar->id],
        ['id' => (string) Str::uuid(), 'estado' => 'Aceptada', 'created_at' => now(), 'updated_at' => now()]
    );
    Sanctum::actingAs($auxiliar, ['role:auxiliar']);

    $this->postJson("/api/examenes/{$examen->id}/verificar-ingreso", [
        'qr_data' => qrJson($estudiante->codigo_sis),
        'hora_dispositivo' => '2000-01-01 00:00:00',
    ])->assertOk();

    $escaneo = DB::table('logs_asistencias')
        ->where('id_examen', $examen->id)->where('id_estudiante', $estudiante->id)
        ->value('fecha_escaneo');

    $ingreso = DB::table('estudiante_examen')
        ->where('id_examen', $examen->id)->where('id_estudiante', $estudiante->id)
        ->value('fecha_ingreso');

    expect($escaneo)->toBe('2026-01-01 08:00:00');
    expect($ingreso)->toBe('2026-01-01 08:00:00');
})->group('grupo1');

it('TC-HU12-7: el ingreso único por estudiante-examen está garantizado por un índice único parcial en la BD', function () {
    $examen = Examen::factory()->create();
    $estudiante = Estudiante::factory()->create();

    $fila = fn (string $resultado) => [
        'id' => (string) Str::uuid(), 'id_examen' => $examen->id, 'id_estudiante' => $estudiante->id,
        'codigo_sis_escaneado' => $estudiante->codigo_sis, 'resultado' => $resultado,
        'mensaje' => 'fila de prueba', 'fecha_escaneo' => now(),
    ];

    DB::table('logs_asistencias')->insert($fila('PERMITIDO'));
    
    DB::table('logs_asistencias')->insert($fila('RECHAZADO_YA_INGRESO'));
    DB::table('logs_asistencias')->insert($fila('RECHAZADO_YA_INGRESO'));

    expect(fn () => DB::transaction(fn () => DB::table('logs_asistencias')->insert($fila('PERMITIDO'))))
        ->toThrow(QueryException::class, 'logs_asistencias_unico_ingreso');
})->group('grupo1');

it('TC-HU12-8: cada intento de ingreso queda consultable identificando al usuario que lo ejecutó', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    [$examen, $estudiante] = ingresoFixture();

    verificarIngreso($this, $auxiliar, $examen, qrJson($estudiante->codigo_sis))->assertOk();

    expect(LogAuditoria::where('user_id', $auxiliar->id)->exists())->toBeTrue();
})->group('grupo1');

// ---------------- extras que exponen bugs de VerificacionController ----------------

it('bonus: un QR de otra materia responde 403 RECHAZADO_MATERIA_INCORRECTA', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    [$examen, $estudiante] = ingresoFixture();

    $response = verificarIngreso(
        $this, $auxiliar, $examen,
        qrJson($estudiante->codigo_sis, 'Materia que no es de este examen')
    );

    $response->assertStatus(403)->assertJsonPath('resultado', 'RECHAZADO_MATERIA_INCORRECTA');
})->group('grupo1');

it('bonus (manual): el ingreso manual de un estudiante habilitado responde 200 y queda en logs_asistencias', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    [$examen, $estudiante] = ingresoFixture();

    DB::table('examen_auxiliar')->insert([
        'id' => (string) Str::uuid(), 'id_examen' => $examen->id, 'id_auxiliar' => $auxiliar->id, 'estado' => 'Aceptada',
    ]);
    Sanctum::actingAs($auxiliar, ['role:auxiliar']);

    $this->postJson("/api/examenes/{$examen->id}/registro-manual", [
        'id_estudiante' => $estudiante->id, 'motivo' => 'QR ilegible',
    ])->assertOk()->assertJsonPath('detalles.tipo_ingreso', 'MANUAL');

    $this->assertDatabaseHas('logs_asistencias', [
        'id_examen' => $examen->id, 'id_estudiante' => $estudiante->id, 'resultado' => 'PERMITIDO',
    ]);
})->group('grupo1');

it('bonus (manual): TC-HU12-1 también aplica al ingreso manual — debe fijar fecha_ingreso en la inscripción', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    [$examen, $estudiante] = ingresoFixture();

    DB::table('examen_auxiliar')->insert([
        'id' => (string) Str::uuid(), 'id_examen' => $examen->id, 'id_auxiliar' => $auxiliar->id, 'estado' => 'Aceptada',
    ]);
    Sanctum::actingAs($auxiliar, ['role:auxiliar']);

    $this->postJson("/api/examenes/{$examen->id}/registro-manual", [
        'id_estudiante' => $estudiante->id,
    ])->assertOk();

    $fechaIngreso = DB::table('estudiante_examen')
        ->where('id_examen', $examen->id)->where('id_estudiante', $estudiante->id)
        ->value('fecha_ingreso');

    expect($fechaIngreso)->not->toBeNull();
})->group('grupo1');

it('bonus (manual): TC-HU12-4 — un ingreso manual duplicado responde 409 y deja evidencia RECHAZADO_YA_INGRESO', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    [$examen, $estudiante] = ingresoFixture();

    DB::table('examen_auxiliar')->insert([
        'id' => (string) Str::uuid(), 'id_examen' => $examen->id, 'id_auxiliar' => $auxiliar->id, 'estado' => 'Aceptada',
    ]);
    Sanctum::actingAs($auxiliar, ['role:auxiliar']);

    $url = "/api/examenes/{$examen->id}/registro-manual";
    
    $this->postJson($url, ['id_estudiante' => $estudiante->id])->assertOk();
    $this->postJson($url, ['id_estudiante' => $estudiante->id])->assertStatus(409);

    $this->assertDatabaseHas('logs_asistencias', [
        'id_examen' => $examen->id, 'id_estudiante' => $estudiante->id, 'resultado' => 'RECHAZADO_YA_INGRESO',
    ]);
})->group('grupo1');