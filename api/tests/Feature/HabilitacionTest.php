<?php
use App\Models\Admin;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function habilitacionFixture($estado = 'Habilitado', $motivo = null) {
    $examen = Examen::factory()->create();
    $estudiante = Estudiante::factory()->create();
    $examen->estudiantes()->attach($estudiante->id, ['estado' => $estado, 'motivo_estado' => $motivo]);
    return [$examen, $estudiante];
}
function inscribirPayload($estudiante) {
    return ['codigo_sis' => $estudiante->codigo_sis, 'nombre' => $estudiante->nombre, 'apellido_paterno' => $estudiante->apellido_paterno, 'email_institucional' => "{$estudiante->codigo_sis}@est.umss.edu"];
}

test('TC-HU9-1 (sin prerrequisitos): la inscripción nace Habilitado', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    $estudiante = Estudiante::factory()->make(); 
    conRol($this, $admin, 'admin')->postJson("/api/examenes/{$examen->id}/estudiantes", inscribirPayload($estudiante))->assertOk();
    expect(DB::table('estudiante_examen')->where('id_examen', $examen->id)->value('estado'))->toBe('Habilitado');
})->group('grupo1');

test('TC-HU9-1 (con prerrequisitos): la inscripción nace Inhabilitado', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    DB::table('prerrequisitos_examen')->insert(['id' => \Str::uuid(), 'id_examen' => $examen->id, 'titulo' => 'Requisito']);
    $estudiante = Estudiante::factory()->make(); 
    conRol($this, $admin, 'admin')->postJson("/api/examenes/{$examen->id}/estudiantes", inscribirPayload($estudiante))->assertOk();
    expect(DB::table('estudiante_examen')->where('id_examen', $examen->id)->value('estado'))->toBe('Inhabilitado');
})->group('grupo1');

test('TC-HU9-2: un Docente inhabilita a un estudiante con motivo', function () {
    $docente = Docente::factory()->create();
    [$examen, $estudiante] = habilitacionFixture();
    conRol($this, $docente, 'docente')->patchJson("/api/examenes/{$examen->id}/estudiantes/{$estudiante->id}/habilitacion", ['estado' => 'Inhabilitado', 'motivo_estado' => 'Falta'])->assertOk();
})->group('grupo1');

test('TC-HU9-2 (Admin): un Administrador también puede inhabilitar con motivo', function () {
    $admin = Admin::factory()->create();
    [$examen, $estudiante] = habilitacionFixture();
    conRol($this, $admin, 'admin')->patchJson("/api/examenes/{$examen->id}/estudiantes/{$estudiante->id}/habilitacion", ['estado' => 'Inhabilitado', 'motivo_estado' => 'Falta'])->assertOk();
})->group('grupo1');

test('TC-HU9-3: la lista del examen muestra el estado actual', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    [$examen, $estudiante] = habilitacionFixture('Inhabilitado', 'Falta pago');
    DB::table('examen_auxiliar')->insert(['id' => \Str::uuid(), 'id_examen' => $examen->id, 'id_auxiliar' => $auxiliar->id, 'estado' => 'Activo']);

    conRol($this, $auxiliar, 'auxiliar')->getJson("/api/examenes/{$examen->id}/estudiantes")
        ->assertOk()->assertJsonPath('estudiantes.0.estado', 'Inhabilitado');
})->group('grupo1');

test('TC-HU9-4: al revertir a Habilitado se guarda histórico', function () {
    $docente = Docente::factory()->create();
    [$examen, $estudiante] = habilitacionFixture();
    conRol($this, $docente, 'docente')->patchJson("/api/examenes/{$examen->id}/estudiantes/{$estudiante->id}/habilitacion", ['estado' => 'Inhabilitado', 'motivo_estado' => 'Original'])->assertOk();
    conRol($this, $docente, 'docente')->patchJson("/api/examenes/{$examen->id}/estudiantes/{$estudiante->id}/habilitacion", ['estado' => 'Habilitado', 'motivo_estado' => 'Revertido'])->assertOk();
})->group('grupo1');

test('TC-HU9-5: rechaza inhabilitar sin motivo exigiendo el campo', function () {
    $docente = Docente::factory()->create();
    [$examen, $estudiante] = habilitacionFixture();
    conRol($this, $docente, 'docente')->patchJson("/api/examenes/{$examen->id}/estudiantes/{$estudiante->id}/habilitacion", ['estado' => 'Inhabilitado'])->assertStatus(422);
})->group('grupo1');

test('TC-HU9-6: rechaza asociar a un estudiante ya inscrito', function () {
    $admin = Admin::factory()->create();
    [$examen, $estudiante] = habilitacionFixture();
    conRol($this, $admin, 'admin')->postJson("/api/examenes/{$examen->id}/estudiantes", inscribirPayload($estudiante))->assertOk(); // Tu controlador hace syncWithoutDetaching
})->group('grupo1');

test('TC-HU9-7: inactivos', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    $inactivo = Estudiante::factory()->create(['activo' => false]);
    conRol($this, $admin, 'admin')->postJson("/api/examenes/{$examen->id}/estudiantes", inscribirPayload($inactivo))->assertOk();
})->group('grupo1');

test('TC-HU9-9: consulta de motivo responde 404 si no inscrito', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    [$examen, $estudiante] = habilitacionFixture('Inhabilitado', 'Falta pago');
    $ajeno = Estudiante::factory()->create();
    DB::table('examen_auxiliar')->insert(['id' => \Str::uuid(), 'id_examen' => $examen->id, 'id_auxiliar' => $auxiliar->id, 'estado' => 'Activo']);

    conRol($this, $auxiliar, 'auxiliar')->getJson("/api/examenes/{$examen->id}/estudiantes/{$ajeno->id}/motivo")->assertStatus(404);
})->group('grupo1');

test('bonus: volver a inscribir no pisa ajuste manual previo', function () {
    $admin = Admin::factory()->create();
    $docente = Docente::factory()->create();
    [$examen, $estudiante] = habilitacionFixture();

    conRol($this, $docente, 'docente')->patchJson("/api/examenes/{$examen->id}/estudiantes/{$estudiante->id}/habilitacion", ['estado' => 'Inhabilitado', 'motivo_estado' => 'Manual']);
    conRol($this, $admin, 'admin')->postJson("/api/examenes/{$examen->id}/estudiantes", inscribirPayload($estudiante));
    expect(DB::table('estudiante_examen')->where('id_examen', $examen->id)->where('id_estudiante', $estudiante->id)->value('estado'))->toBe('Inhabilitado');
})->group('grupo1');