<?php

// CONFIRMADO contra VerificacionController (HU-10/11/12) y el schema vigente:
// - POST /api/examenes/{id}/verificar-ingreso (CheckRole: admin, docente, auxiliar).
//   body: qr_data = string JSON con `sis` y, opcional, `materia`.
//   200 PERMITIDO · 400 ERROR_DATOS_INVALIDOS · 403 RECHAZADO_NO_INSCRITO /
//   RECHAZADO_INHABILITADO / RECHAZADO_MATERIA_INCORRECTA · 409 RECHAZADO_YA_INGRESO.
// - POST /api/examenes/{id}/registro-manual (solo autenticado): id_estudiante, motivo?.
// - Tabla logs_asistencias: CHECK de `resultado` = PERMITIDO | RECHAZADO_NO_INSCRITO |
//   RECHAZADO_INHABILITADO | RECHAZADO_YA_INGRESO | ERROR_DATOS_INVALIDOS;
//   `codigo_sis_escaneado` es NOT NULL; índice único parcial logs_asistencias_unico_ingreso
//   (id_examen, id_estudiante) WHERE resultado = 'PERMITIDO' = garantía de ingreso único en BD.
// - TC-HU12-5 (dos peticiones simultáneas) NO va aquí: es el Grupo 3 (k6). Dentro de la
//   transacción de RefreshDatabase no existe concurrencia real.
//
// GAPS que estos tests dejan en rojo a propósito (política acordada: lo corrige el dev):
// - TC-HU10-3: un QR inválido manda codigo_sis_escaneado = NULL a una columna NOT NULL -> 500.
// - bonus materia: 'RECHAZADO_MATERIA_INCORRECTA' no está en el CHECK -> 500 en vez de 403.
// - TC-HU12-8: nadie queda registrado como autor del intento (ni logs_asistencias ni logs_auditoria).
// - bonus manual: no fija estudiante_examen.fecha_ingreso y no deja evidencia del rechazo.
// - TC-HU10-2 (SIS): posible 500 por comparar id (uuid) con un SIS no-UUID en PostgreSQL.
// - TC-HU11-5 sin contrato: verificar-ingreso no recibe el aula del punto de control (skip).

use App\Models\Auxiliar;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\LogAuditoria;
use App\Models\Norma;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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
    return $test->actingAs($actor, 'sanctum')
        ->postJson("/api/examenes/{$examen->id}/verificar-ingreso", ['qr_data' => $qr]);
}

// ---------------- HU-10: escaneo e identificación ----------------

it('TC-HU10-1: identifica al estudiante (nombre completo y código SIS) al validar un QR válido', function () {
    $auxiliar = Auxiliar::factory()->create();
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
    $auxiliar = Auxiliar::factory()->create();
    $estudiante = Estudiante::factory()->create();

    // Si responde 500 con "invalid input syntax for type uuid", la causa probable es
    // EstudianteController::show: where('id', $identificador) con un valor que no es UUID
    // falla en PostgreSQL antes de evaluar el orWhere('codigo_sis', ...).
    $this->actingAs($auxiliar, 'sanctum')->getJson("/api/estudiantes/{$estudiante->codigo_sis}")
        ->assertOk()
        ->assertJsonPath('id', $estudiante->id);
})->group('grupo1');

it('TC-HU10-2 (CI): localiza al estudiante por carnet de identidad en la búsqueda manual', function () {
    $auxiliar = Auxiliar::factory()->create();
    $estudiante = Estudiante::factory()->create();

    $this->actingAs($auxiliar, 'sanctum')->getJson('/api/estudiantes?search=' . $estudiante->ci)
        ->assertOk()
        ->assertJsonPath('data.0.id', $estudiante->id);
})->group('grupo1');

it('TC-HU10-3: un QR con formato no esperado responde 400 ERROR_DATOS_INVALIDOS y deja registro', function () {
    $auxiliar = Auxiliar::factory()->create();
    $examen = Examen::factory()->create();

    $response = verificarIngreso($this, $auxiliar, $examen, 'esto no es un JSON');

    $response->assertStatus(400)->assertJsonPath('resultado', 'ERROR_DATOS_INVALIDOS');
    $this->assertDatabaseHas('logs_asistencias', [
        'id_examen' => $examen->id, 'resultado' => 'ERROR_DATOS_INVALIDOS',
    ]);
})->group('grupo1');

it('TC-HU10-4: informa que no existe el estudiante al buscar un código SIS inexistente', function () {
    $auxiliar = Auxiliar::factory()->create();

    $this->actingAs($auxiliar, 'sanctum')->getJson('/api/estudiantes/999999999')
        ->assertStatus(404);
})->group('grupo1');

// ---------------- HU-11: validación de habilitación y ambiente ----------------

it('TC-HU11-3: rechaza (403 RECHAZADO_NO_INSCRITO) a un estudiante sin inscripción en el examen y deja registro', function () {
    $auxiliar = Auxiliar::factory()->create();
    $examen = Examen::factory()->create();
    $ajeno = Estudiante::factory()->create();

    $response = verificarIngreso($this, $auxiliar, $examen, qrJson($ajeno->codigo_sis));

    $response->assertStatus(403)->assertJsonPath('resultado', 'RECHAZADO_NO_INSCRITO');
    $this->assertDatabaseHas('logs_asistencias', [
        'id_examen' => $examen->id, 'id_estudiante' => $ajeno->id, 'resultado' => 'RECHAZADO_NO_INSCRITO',
    ]);
})->group('grupo1');

it('TC-HU11-4: rechaza (403 RECHAZADO_INHABILITADO) mostrando el motivo de inhabilitación registrado', function () {
    $auxiliar = Auxiliar::factory()->create();
    [$examen, $estudiante] = ingresoFixture('Inhabilitado', 'Falta pago de matricula');

    $response = verificarIngreso($this, $auxiliar, $examen, qrJson($estudiante->codigo_sis));

    $response->assertStatus(403)
        ->assertJsonPath('resultado', 'RECHAZADO_INHABILITADO')
        ->assertJsonPath('detalles.motivo_inhabilitacion', 'Falta pago de matricula');
})->group('grupo1');

it('TC-HU11-5: rechaza indicando el aula correcta cuando el aula del punto de control no coincide', function () {
    // verificar-ingreso no recibe ningún dato del aula seleccionada por el personal de
    // control: no hay parámetro ni respuesta contra los cuales escribir esta prueba.
})->skip('Sin soporte en backend: verificar-ingreso no recibe el aula del punto de control.')
  ->group('grupo1');

it('TC-HU11-6: no autoriza a un estudiante habilitado solo en otro examen', function () {
    $auxiliar = Auxiliar::factory()->create();
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
    $auxiliar = Auxiliar::factory()->create();
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
    $auxiliar = Auxiliar::factory()->create();
    [$examen, $estudiante] = ingresoFixture();

    verificarIngreso($this, $auxiliar, $examen, qrJson($estudiante->codigo_sis))->assertOk();

    $fechaIngreso = DB::table('estudiante_examen')
        ->where('id_examen', $examen->id)->where('id_estudiante', $estudiante->id)
        ->value('fecha_ingreso');
    expect($fechaIngreso)->not->toBeNull();
})->group('grupo1');

it('TC-HU12-2: inserta en logs_asistencias una entrada PERMITIDO al autorizar', function () {
    $auxiliar = Auxiliar::factory()->create();
    [$examen, $estudiante] = ingresoFixture();

    verificarIngreso($this, $auxiliar, $examen, qrJson($estudiante->codigo_sis))->assertOk();

    $this->assertDatabaseHas('logs_asistencias', [
        'id_examen' => $examen->id, 'id_estudiante' => $estudiante->id, 'resultado' => 'PERMITIDO',
    ]);
})->group('grupo1');

it('TC-HU12-3: rechaza estrictamente un doble ingreso indicando la fecha/hora del primero', function () {
    $auxiliar = Auxiliar::factory()->create();
    [$examen, $estudiante] = ingresoFixture();

    verificarIngreso($this, $auxiliar, $examen, qrJson($estudiante->codigo_sis))->assertOk();
    $segundo = verificarIngreso($this, $auxiliar, $examen, qrJson($estudiante->codigo_sis));

    $segundo->assertStatus(409)
        ->assertJsonPath('resultado', 'RECHAZADO_YA_INGRESO')
        ->assertJsonStructure(['detalles' => ['primer_ingreso']]);
})->group('grupo1');

it('TC-HU12-4: el intento duplicado deja un registro RECHAZADO_YA_INGRESO y un solo PERMITIDO', function () {
    $auxiliar = Auxiliar::factory()->create();
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
    $auxiliar = Auxiliar::factory()->create();
    [$examen, $estudiante] = ingresoFixture();

    // Hora "real" del servidor: 12:00 UTC = 08:00 en America/La_Paz (UTC-4, sin horario de verano).
    Carbon::setTestNow(Carbon::parse('2026-01-01 12:00:00', 'UTC'));

    $this->actingAs($auxiliar, 'sanctum')->postJson("/api/examenes/{$examen->id}/verificar-ingreso", [
        'qr_data' => qrJson($estudiante->codigo_sis),
        'hora_dispositivo' => '2000-01-01 00:00:00', // un cliente manipulado no debe influir
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
    // El índice solo cubre PERMITIDO: los rechazos repetidos sí deben poder registrarse.
    DB::table('logs_asistencias')->insert($fila('RECHAZADO_YA_INGRESO'));
    DB::table('logs_asistencias')->insert($fila('RECHAZADO_YA_INGRESO'));

    expect(fn () => DB::transaction(fn () => DB::table('logs_asistencias')->insert($fila('PERMITIDO'))))
        ->toThrow(QueryException::class, 'logs_asistencias_unico_ingreso');
})->group('grupo1');

it('TC-HU12-8: cada intento de ingreso queda consultable identificando al usuario que lo ejecutó', function () {
    // GAP CONFIRMADO: logs_asistencias no tiene columna de usuario y VerificacionController no
    // escribe en logs_auditoria. Se exige que el actor quede en algún historial; el módulo y la
    // acción exactos los define el equipo, por eso aquí solo se pide el user_id.
    $auxiliar = Auxiliar::factory()->create();
    [$examen, $estudiante] = ingresoFixture();

    verificarIngreso($this, $auxiliar, $examen, qrJson($estudiante->codigo_sis))->assertOk();

    expect(LogAuditoria::where('user_id', $auxiliar->id)->exists())->toBeTrue();
})->group('grupo1');

// ---------------- extras que exponen bugs de VerificacionController ----------------

it('bonus: un QR de otra materia responde 403 RECHAZADO_MATERIA_INCORRECTA', function () {
    // GAP: 'RECHAZADO_MATERIA_INCORRECTA' no está en el CHECK de logs_asistencias.resultado,
    // así que registrarLog() viola el CHECK y la respuesta es 500 en vez de 403.
    $auxiliar = Auxiliar::factory()->create();
    [$examen, $estudiante] = ingresoFixture();

    $response = verificarIngreso(
        $this, $auxiliar, $examen,
        qrJson($estudiante->codigo_sis, 'Materia que no es de este examen')
    );

    $response->assertStatus(403)->assertJsonPath('resultado', 'RECHAZADO_MATERIA_INCORRECTA');
})->group('grupo1');

it('bonus (manual): el ingreso manual de un estudiante habilitado responde 200 y queda en logs_asistencias', function () {
    $auxiliar = Auxiliar::factory()->create();
    [$examen, $estudiante] = ingresoFixture();

    $this->actingAs($auxiliar, 'sanctum')->postJson("/api/examenes/{$examen->id}/registro-manual", [
        'id_estudiante' => $estudiante->id, 'motivo' => 'QR ilegible',
    ])->assertOk()->assertJsonPath('detalles.tipo_ingreso', 'MANUAL');

    $this->assertDatabaseHas('logs_asistencias', [
        'id_examen' => $examen->id, 'id_estudiante' => $estudiante->id, 'resultado' => 'PERMITIDO',
    ]);
})->group('grupo1');

it('bonus (manual): TC-HU12-1 también aplica al ingreso manual — debe fijar fecha_ingreso en la inscripción', function () {
    // GAP: registrarIngresoManual solo inserta en logs_asistencias; no actualiza el pivot
    // como sí hace verificarIngreso (QR).
    $auxiliar = Auxiliar::factory()->create();
    [$examen, $estudiante] = ingresoFixture();

    $this->actingAs($auxiliar, 'sanctum')->postJson("/api/examenes/{$examen->id}/registro-manual", [
        'id_estudiante' => $estudiante->id,
    ])->assertOk();

    $fechaIngreso = DB::table('estudiante_examen')
        ->where('id_examen', $examen->id)->where('id_estudiante', $estudiante->id)
        ->value('fecha_ingreso');
    expect($fechaIngreso)->not->toBeNull();
})->group('grupo1');

it('bonus (manual): TC-HU12-4 — un ingreso manual duplicado responde 409 y deja evidencia RECHAZADO_YA_INGRESO', function () {
    // GAP: la rama de duplicado de registrarIngresoManual responde 409 pero no registra el intento.
    $auxiliar = Auxiliar::factory()->create();
    [$examen, $estudiante] = ingresoFixture();
    $url = "/api/examenes/{$examen->id}/registro-manual";

    $this->actingAs($auxiliar, 'sanctum')->postJson($url, ['id_estudiante' => $estudiante->id])->assertOk();
    $this->actingAs($auxiliar, 'sanctum')->postJson($url, ['id_estudiante' => $estudiante->id])->assertStatus(409);

    $this->assertDatabaseHas('logs_asistencias', [
        'id_examen' => $examen->id, 'id_estudiante' => $estudiante->id, 'resultado' => 'RECHAZADO_YA_INGRESO',
    ]);
})->group('grupo1');
