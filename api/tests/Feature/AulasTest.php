<?php

// CONFIRMADO: Aula (tabla aulas) — nombre, ubicacion, estado (Disponible|Mantenimiento|Ocupada,
// solo validado en StoreAulaRequest, SIN CHECK constraint en BD), capacidad (smallint, min:1).
// Decisión del equipo: el equivalente a "dado de baja" es el estado Mantenimiento.
// Rutas reales: POST/PUT/DELETE /api/aulas bajo role:admin,administrador,docente.
//
// GAP CONFIRMADO (el equipo dijo: si falla, es tarea del dev arreglarlo):
// ni StoreAulaRequest ni la tabla `aulas` tienen validación/constraint de unicidad sobre
// `nombre` — hoy se puede crear más de una aula con el mismo nombre sin que nada lo impida.
//
// GAP CONFIRMADO: ExamenController no valida solapamiento de horario/aula en ningún punto
// (ni en StoreExamenRequest/UpdateExamenRequest ni en el controller) — por eso la prueba
// de "no se puede desactivar un aula con examen programado" tampoco tiene aún una fuente
// de verdad de "exámenes programados a futuro" distinta de consultar el estado del examen
// directamente.

use App\Models\Admin;
use App\Models\Aula;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('TC-HU4-3: rechaza registro de aula con nombre ya existente', function () {
    // GAP CONFIRMADO: ni StoreAulaRequest ni la BD validan esto todavía — este test
    // fallará hoy (se creará el duplicado en vez de rechazarse). Queda así a propósito,
    // como pendiente visible para que el dev de AulaController lo corrija.
    $admin = Admin::factory()->create();
    Aula::factory()->create(['nombre' => 'A-101']);

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/aulas', [
        'nombre' => 'A-101', 'ubicacion' => 'Bloque B - Piso 1', 'capacidad' => 30,
    ]);

    $response->assertStatus(422);
})->group('grupo1');

it('TC-HU4-4: rechaza registro de aula con capacidad igual a 0 o negativa', function () {
    $admin = Admin::factory()->create();

    $this->actingAs($admin, 'sanctum')->postJson('/api/aulas', [
        'nombre' => 'A-102', 'ubicacion' => 'Bloque A - Piso 2', 'capacidad' => 0,
    ])->assertStatus(422);

    $this->actingAs($admin, 'sanctum')->postJson('/api/aulas', [
        'nombre' => 'A-103', 'ubicacion' => 'Bloque A - Piso 2', 'capacidad' => -5,
    ])->assertStatus(422);
})->group('grupo1');

it('TC-HU4-5: rechaza registro de aula con campo ubicación vacío (obligatorio por decisión del equipo)', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/aulas', [
        'nombre' => 'A-104', 'ubicacion' => '', 'capacidad' => 35,
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('ubicacion');
})->group('grupo1');

it('TC-HU4-11: GAP — el nombre de aula no es UNIQUE a nivel de base de datos', function () {
    Aula::factory()->create(['nombre' => 'A-101']);

    // Confirmado por el schema dump: aulas no tiene ningún UNIQUE constraint sobre `nombre`.
    $duplicada = Aula::factory()->make(['nombre' => 'A-101']);
    $duplicada->save(); // hoy NO lanza excepción — se documenta el gap en vez de asumirlo resuelto

    expect(Aula::where('nombre', 'A-101')->count())->toBe(2);
})->group('grupo1');

it('bonus: el estado Mantenimiento (equivalente a "dado de baja") se puede aplicar vía PUT', function () {
    $admin = Admin::factory()->create();
    $aula = Aula::factory()->create(['estado' => 'Disponible']);

    $response = $this->actingAs($admin, 'sanctum')->putJson("/api/aulas/{$aula->id}", [
        'estado' => 'Mantenimiento',
    ]);

    $response->assertOk();
    expect($aula->refresh()->estado)->toBe('Mantenimiento');
})->group('grupo1');
