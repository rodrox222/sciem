<?php
use App\Models\Admin;
use App\Models\Docente;
use App\Models\Norma;
use Illuminate\Foundation\Testing\RefreshDatabase;
uses(RefreshDatabase::class);

test('TC-HU5-3: rechaza norma con descripción vacía', function () {
    conRol($this, Admin::factory()->create(['activo' => true]), 'admin')->postJson('/api/normas', ['titulo' => 'Norma', 'descripcion' => '', 'tipo' => 'General'])->assertStatus(422);
})->group('grupo1');

test('TC-HU5-4: rechaza norma sin tipo', function () {
    conRol($this, Admin::factory()->create(['activo' => true]), 'admin')->postJson('/api/normas', ['titulo' => 'Norma', 'descripcion' => 'Desc', 'tipo' => null])->assertStatus(422);
})->group('grupo1');

test('TC-HU5-10: rechaza registro espacios', function () {
    conRol($this, Admin::factory()->create(['activo' => true]), 'admin')->postJson('/api/normas', ['titulo' => 'Norma', 'descripcion' => '   ', 'tipo' => 'General'])->assertStatus(422);
})->group('grupo1');

test('TC-HU5-18: valida backend no vacía', function () {
    conRol($this, Admin::factory()->create(['activo' => true]), 'admin')->postJson('/api/normas', ['titulo' => 'Norma', 'descripcion' => '    ', 'tipo' => 'General'])->assertStatus(422);
})->group('grupo1');

test('bonus: rechaza que Docente cree norma General', function () {
    conRol($this, Docente::factory()->create(['activo' => true]), 'docente')->postJson('/api/normas', ['titulo' => 'Intento', 'descripcion' => 'Desc', 'tipo' => 'General'])->assertStatus(403);
})->group('grupo1');

test('bonus: el tipo de una norma no puede cambiarse', function () {
    $norma = Norma::factory()->create(['tipo' => 'General']);
    conRol($this, Admin::factory()->create(['activo' => true]), 'admin')->putJson("/api/normas/{$norma->id}", ['tipo' => 'Particular'])->assertStatus(422);
})->group('grupo1');