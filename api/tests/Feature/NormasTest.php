<?php

// CONFIRMADO: Norma (tabla normas) — titulo, descripcion, tipo (General|Particular,
// CHECK constraint en BD). POST /api/normas está restringido a role:admin,administrador
// ÚNICAMENTE (ni Docente ni Auxiliar pueden crear normas directamente) y StoreNormaRequest
// solo permite tipo='General' en ese endpoint (Rule::in(['General'])).
// Decisión del equipo (punto 9): las normas "Particular" ya no se crean desde un catálogo
// general — se agregan al momento de crear/gestionar el examen, vía el endpoint existente
// POST examenes/{id}/normas/particulares (NormaController::crearParticularesParaExamen),
// confirmado en código: solo Admin o el Docente dueño del examen pueden usarlo.
// UpdateNormaRequest: Docente solo puede dejar tipo='Particular' al editar; Admin puede
// General o Particular. NormaController::update/destroy devuelven 403 si un Docente
// intenta tocar una norma General, y lanzan ValidationException si se intenta cambiar
// el tipo de una norma ya existente (el tipo es inmutable tras creación).
//
// GAP CONFIRMADO (hallazgo A): la tabla `normas` NO tiene columna `estado`/`activo`.
// Activar/desactivar una norma (AC7, AC9, AC12 de HU-05) no tiene dónde persistirse
// todavía — no hay nada que este archivo pueda probar hasta que se agregue la columna.
//
// SUPUESTO: Laravel 11 aplica TrimStrings como middleware global por defecto, por lo que
// una descripción compuesta solo de espacios llega ya vacía a la validación y 'required'
// la rechaza. Si el equipo quitó ese middleware, TC-HU5-10 fallaría y habría que agregar
// una regla explícita (ej. una regla personalizada o `regex:/\S/`).

use App\Models\Admin;
use App\Models\Docente;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('TC-HU5-3: rechaza registro de norma con descripción vacía', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/normas', [
        'titulo' => 'Norma sin descripción', 'descripcion' => '', 'tipo' => 'General',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('descripcion');
})->group('grupo1');

it('TC-HU5-4: rechaza registro de norma sin seleccionar tipo', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/normas', [
        'titulo' => 'Norma sin tipo', 'descripcion' => 'No se permite el uso de celular.', 'tipo' => null,
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('tipo');
})->group('grupo1');

it('TC-HU5-10: rechaza registro con descripción compuesta únicamente por espacios', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/normas', [
        'titulo' => 'Norma espacios', 'descripcion' => '   ', 'tipo' => 'General',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('descripcion');
})->group('grupo1');

it('TC-HU5-18: valida en backend la descripción no vacía, evadiendo cualquier validación de cliente', function () {
    $admin = Admin::factory()->create();

    // Petición directa a la API simulando que se evadió cualquier chequeo de frontend.
    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/normas', [
        'titulo' => 'Norma evadida', 'descripcion' => '    ', 'tipo' => 'General',
    ]);

    $response->assertStatus(422);
})->group('grupo1');

it('bonus: rechaza (403) que un Docente cree una norma General directamente', function () {
    $docente = Docente::factory()->create();

    $response = $this->actingAs($docente, 'sanctum')->postJson('/api/normas', [
        'titulo' => 'Intento docente', 'descripcion' => 'No debería poder.', 'tipo' => 'General',
    ]);

    $response->assertStatus(403);
})->group('grupo1');

it('bonus: el tipo de una norma ya creada no puede cambiarse, ni siquiera por Admin', function () {
    $admin = Admin::factory()->create();
    $norma = \App\Models\Norma::factory()->create(['tipo' => 'General']);

    $response = $this->actingAs($admin, 'sanctum')->putJson("/api/normas/{$norma->id}", [
        'tipo' => 'Particular',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('tipo');
})->group('grupo1');
