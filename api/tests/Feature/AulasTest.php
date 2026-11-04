<?php
use App\Models\Admin;
use App\Models\Aula;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('TC-HU4-3 (V2): permite registrar aulas con el mismo nombre', function () {
    conRol($this, Admin::factory()->create(['activo' => true]), 'admin')->postJson('/api/aulas', ['nombre' => 'A-101', 'ubicacion' => 'Bloque B', 'capacidad' => 30])->assertStatus(201);
})->group('grupo1');

test('TC-HU4-4: rechaza registro de aula con capacidad negativa', function () {
    conRol($this, Admin::factory()->create(['activo' => true]), 'admin')->postJson('/api/aulas', ['nombre' => 'A-102', 'ubicacion' => 'Bloque A', 'capacidad' => 0])->assertStatus(422);
})->group('grupo1');

test('TC-HU4-5: rechaza registro con ubicación vacía', function () {
    conRol($this, Admin::factory()->create(['activo' => true]), 'admin')->postJson('/api/aulas', ['nombre' => 'A-104', 'ubicacion' => '', 'capacidad' => 35])->assertStatus(422);
})->group('grupo1');

test('TC-HU4-12: el estado Mantenimiento se puede aplicar', function () {
    $aula = Aula::factory()->create(['estado' => 'Disponible']);
    conRol($this, Admin::factory()->create(['activo' => true]), 'admin')->putJson("/api/aulas/{$aula->id}", ['estado' => 'Mantenimiento'])->assertOk();
})->group('grupo1');