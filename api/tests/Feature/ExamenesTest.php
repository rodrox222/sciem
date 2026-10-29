<?php
use App\Models\Admin;
use App\Models\Aula;
use App\Models\Docente;
use App\Models\Examen;
use App\Models\Materia;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function examenBase($overrides = []) {
    return array_merge(['nombre' => 'Examen Base', 'id_materia' => Materia::factory()->create()->id, 'fecha' => now()->toDateString(), 'hora_ini' => '08:00', 'hora_fin' => '09:30', 'id_aula' => Aula::factory()->create()->id, 'id_docente' => Docente::factory()->create()->id, 'estado' => 'Programado'], $overrides);
}

test('TC-HU6-4: rechaza registro por solapamiento de aula y horario', function () {
    $admin = Admin::factory()->create(['activo' => true]);
    $aula = Aula::factory()->create();
    $fecha = now()->addDay()->toDateString();

    conRol($this, $admin, 'admin')->postJson('/api/examenes', examenBase(['id_aula' => $aula->id, 'fecha' => $fecha, 'hora_ini' => '08:00', 'hora_fin' => '09:30']))->assertCreated();
    conRol($this, $admin, 'admin')->postJson('/api/examenes', examenBase(['id_aula' => $aula->id, 'fecha' => $fecha, 'hora_ini' => '09:00', 'hora_fin' => '10:00']))->assertStatus(422);
})->group('grupo1');

test('TC-HU6-5 (V2): permite registro de examen con fecha anterior', function () {
    conRol($this, Admin::factory()->create(['activo' => true]), 'admin')->postJson('/api/examenes', examenBase(['fecha' => now()->subDay()->toDateString()]))->assertStatus(201);
})->group('grupo1');

test('TC-HU6-6: rechaza registro con hora_fin anterior a hora_ini', function () {
    conRol($this, Admin::factory()->create(['activo' => true]), 'admin')->postJson('/api/examenes', examenBase(['hora_ini' => '10:00', 'hora_fin' => '09:00']))->assertStatus(422);
})->group('grupo1');

test('TC-HU6-7 (V2): permite registro de examen sin normas', function () {
    conRol($this, Admin::factory()->create(['activo' => true]), 'admin')->postJson('/api/examenes', examenBase())->assertStatus(201);
})->group('grupo1');

test('TC-HU6-8: rechaza registro sin aula', function () {
    conRol($this, Admin::factory()->create(['activo' => true]), 'admin')->postJson('/api/examenes', examenBase(['id_aula' => null]))->assertStatus(422);
})->group('grupo1');

test('TC-HU6-11 (V2): permite actualizar estado a Finalizado', function () {
    $examen = Examen::factory()->create();
    conRol($this, Admin::factory()->create(['activo' => true]), 'admin')->putJson("/api/examenes/{$examen->id}", ['estado' => 'Terminado'])->assertOk();
})->group('grupo1');