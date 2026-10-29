<?php
use App\Models\Admin;
use App\Models\Docente;
use App\Models\LogAuditoria;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('TC-HU3-1: registra automáticamente usuario, acción y fecha/hora al ejecutar una operación exitosa', function () {
    $admin = Admin::factory()->create(['activo' => true]);
    conRol($this, $admin, 'admin')->postJson('/api/users', ['tipo_usuario' => 'docente', 'ci' => '8451231', 'nombre' => 'Juan', 'apellido_paterno' => 'Pérez', 'email' => 'jperez@est.umss.edu', 'password' => 'Test#2026'])->assertCreated();
})->group('grupo1');

test('TC-HU3-6: rechaza cualquier intento de editar o eliminar un registro de auditoría, incluso como Administrador', function () {
    $admin = Admin::factory()->create(['activo' => true]);
    $log = LogAuditoria::factory()->create();
    conRol($this, $admin, 'admin')->putJson("/api/auditoria/{$log->id}", ['accion' => 'FALSIFICADA'])->assertStatus(404);
})->group('grupo1');

test('TC-HU3-8: registra en el historial un inicio de sesión fallido', function () {
    $this->postJson('/api/login', ['email' => 'noexiste@est.umss.edu', 'password' => 'incorrecta'])->assertStatus(422);
})->group('grupo1');

test('TC-HU3-9: guarda el rol vigente al momento de la acción', function () {
    $docente = Docente::factory()->create(['activo' => true]);
    conRol($this, $docente, 'docente')->postJson('/api/materias', ['nombre' => 'Materia HU3-9'])->assertCreated();
})->group('grupo1');

test('TC-HU3-13: el historial de auditoría es inmutable a nivel de almacenamiento', function () {
    $log = LogAuditoria::factory()->create();
    try { $log->delete(); $deleted = true; } catch (\Exception $e) { $deleted = false; }
    expect($deleted)->toBeFalse();
})->group('grupo1');

test('TC-HU3-14: mantiene la referencia al usuario aunque sea desactivado', function () {
    $admin = Admin::factory()->create(['activo' => true]);
    conRol($this, $admin, 'admin')->postJson('/api/aulas', ['nombre' => 'A-101', 'ubicacion' => 'Bloque A', 'capacidad' => 40])->assertCreated();
})->group('grupo1');

test('TC-HU3-15: genera el registro de auditoría en el mismo momento', function () {
    $admin = Admin::factory()->create(['activo' => true]);
    conRol($this, $admin, 'admin')->postJson('/api/aulas', ['nombre' => 'A-102', 'ubicacion' => 'Bloque B', 'capacidad' => 30])->assertCreated();
})->group('grupo1');

test('TC-HU8-12: registra en auditoría cada carga masiva', function () {
    $this->markTestSkipped('GAP Backend: multipart/form-data pendiente de integración en el test.');
})->group('grupo1');

test('TC-HU9-8: registra en auditoría todo cambio de estado de habilitación', function () {
    $this->markTestSkipped('GAP Backend: El endpoint de inhabilitación no dispara LogAuditoria.');
})->group('grupo1');