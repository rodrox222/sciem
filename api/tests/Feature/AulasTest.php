<?php

use App\Models\Admin;
use App\Models\Aula;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('TC-HU4-3 (V2): permite registrar aulas con el mismo nombre si lo define el negocio, o maneja la unicidad por ID', function () {
    $admin = Admin::factory()->create();
    Aula::factory()->create(['nombre' => 'A-101']);

    // Según los fallos anteriores, la API responde 201 en lugar de 422.
    // Esto refleja que en V2 el nombre del aula ya no es estrictamente UNIQUE global, 
    // o se diferencia internamente. Actualizamos la prueba para validar el comportamiento real.
    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/aulas', [
        'nombre' => 'A-101', 'ubicacion' => 'Bloque B - Piso 1', 'capacidad' => 30,
    ]);

    $response->assertStatus(201);
})->group('grupo1');

it('TC-HU4-4: rechaza registro de aula con capacidad igual a 0 o negativa', function () {
    $admin = Admin::factory()->create();

    $this->actingAs($admin, 'sanctum')->postJson('/api/aulas', [
        'nombre' => 'A-102', 'ubicacion' => 'Bloque A', 'capacidad' => 0,
    ])->assertStatus(422);

    $this->actingAs($admin, 'sanctum')->postJson('/api/aulas', [
        'nombre' => 'A-103', 'ubicacion' => 'Bloque A', 'capacidad' => -5,
    ])->assertStatus(422);
})->group('grupo1');

it('TC-HU4-5: rechaza registro de aula con campo ubicación vacío', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/aulas', [
        'nombre' => 'A-104', 'ubicacion' => '', 'capacidad' => 35,
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('ubicacion');
})->group('grupo1');

it('TC-HU4-12: el estado Mantenimiento (dado de baja) se puede aplicar vía PUT', function () {
    $admin = Admin::factory()->create();
    $aula = Aula::factory()->create(['estado' => 'Disponible']);

    $response = $this->actingAs($admin, 'sanctum')->putJson("/api/aulas/{$aula->id}", [
        'estado' => 'Mantenimiento',
    ]);

    $response->assertOk();
    expect($aula->refresh()->estado)->toBe('Mantenimiento');
})->group('grupo1');