<?php
use App\Models\Admin;
use App\Models\Examen;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function estudianteParaInscribir(array $overrides = []) {
    return array_merge(['codigo_sis' => '202011111', 'nombre' => 'Carlos', 'apellido_paterno' => 'Lopez', 'email_institucional' => '202011111@est.umss.edu'], $overrides);
}

test('TC-HU7-4: rechaza inscripción con campo nombre vacío', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    conRol($this, $admin, 'admin')->postJson("/api/examenes/{$examen->id}/estudiantes", estudianteParaInscribir(['nombre' => '']))->assertStatus(422);
})->group('grupo1');

test('TC-HU7-5: rechaza inscripción con campo apellido_paterno vacío', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    conRol($this, $admin, 'admin')->postJson("/api/examenes/{$examen->id}/estudiantes", estudianteParaInscribir(['apellido_paterno' => '']))->assertStatus(422);
})->group('grupo1');

test('TC-HU7-6: rechaza inscripción con campo codigo_sis vacío', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    conRol($this, $admin, 'admin')->postJson("/api/examenes/{$examen->id}/estudiantes", estudianteParaInscribir(['codigo_sis' => '']))->assertStatus(422);
})->group('grupo1');

test('TC-HU7-7 (V2): permite inscripción con carnet de identidad (ci) vacío (Ahora es opcional)', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    conRol($this, $admin, 'admin')->postJson("/api/examenes/{$examen->id}/estudiantes", estudianteParaInscribir(['ci' => '']))->assertOk();
})->group('grupo1');

test('TC-HU7-8: rechaza inscripción con correo institucional de formato inválido', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    conRol($this, $admin, 'admin')->postJson("/api/examenes/{$examen->id}/estudiantes", estudianteParaInscribir(['email_institucional' => 'estudiante@est.umss.edu']))->assertStatus(422);
})->group('grupo1');

test('TC-HU7-11 (V2): inscripción con código SIS ya existente actualiza al estudiante (Idempotencia)', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    conRol($this, $admin, 'admin')->postJson("/api/examenes/{$examen->id}/estudiantes", estudianteParaInscribir(['codigo_sis' => '202312345']))->assertOk();
    conRol($this, $admin, 'admin')->postJson("/api/examenes/{$examen->id}/estudiantes", estudianteParaInscribir(['codigo_sis' => '202312345']))->assertOk();
})->group('grupo1');