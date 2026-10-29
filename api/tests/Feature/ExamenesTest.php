<?php

use App\Models\Admin;
use App\Models\Aula;
use App\Models\Docente;
use App\Models\Examen;
use App\Models\Materia;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function examenBase(array $overrides = []) {
    return array_merge([
        'nombre' => 'Examen Parcial 1',
        'id_materia' => Materia::factory()->create()->id,
        'fecha' => now()->addDay()->toDateString(),
        'hora_ini' => '08:00',
        'hora_fin' => '09:30',
        'id_aula' => Aula::factory()->create()->id,
        'id_docente' => Docente::factory()->create()->id,
    ], $overrides);
}

it('TC-HU6-4: rechaza registro por solapamiento de aula y horario', function () {
    $admin = Admin::factory()->create();
    $aula = Aula::factory()->create();
    $fecha = now()->addDay()->toDateString();

    $this->actingAs($admin, 'sanctum')->postJson('/api/examenes', examenBase([
        'id_aula' => $aula->id, 'fecha' => $fecha, 'hora_ini' => '08:00', 'hora_fin' => '09:30',
    ]))->assertCreated();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/examenes', examenBase([
        'id_aula' => $aula->id, 'fecha' => $fecha, 'hora_ini' => '09:00', 'hora_fin' => '10:00',
    ]));

    $response->assertStatus(422)->assertJsonValidationErrors('hora_ini');
})->group('grupo1');

it('TC-HU6-5 (V2): permite registro de examen con fecha anterior (Exámenes retroactivos/históricos)', function () {
    $admin = Admin::factory()->create();
    
    // En V2 se flexibilizó la creación de exámenes pasados (la API retorna 201).
    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/examenes', examenBase([
        'fecha' => now()->subDay()->toDateString()
    ]));

    $response->assertStatus(201);
})->group('grupo1');

it('TC-HU6-6: rechaza registro de examen con hora_fin igual o anterior a hora_ini', function () {
    $admin = Admin::factory()->create();

    $this->actingAs($admin, 'sanctum')->postJson('/api/examenes', examenBase([
        'hora_ini' => '10:00', 'hora_fin' => '10:00',
    ]))->assertStatus(422);

    $this->actingAs($admin, 'sanctum')->postJson('/api/examenes', examenBase([
        'hora_ini' => '10:00', 'hora_fin' => '09:00',
    ]))->assertStatus(422);
})->group('grupo1');

it('TC-HU6-7 (V2): permite registro de examen sin normas asociadas (Las normas son opcionales al crear)', function () {
    $admin = Admin::factory()->create();
    
    // En V2, el array de normas ya no es estrictamente obligatorio para inicializar el examen.
    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/examenes', examenBase());

    $response->assertStatus(201);
})->group('grupo1');

it('TC-HU6-8: rechaza registro de examen sin seleccionar un aula', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/examenes', examenBase([
        'id_aula' => null
    ]));

    $response->assertStatus(422)->assertJsonValidationErrors('id_aula');
})->group('grupo1');

it('TC-HU6-11 (V2): permite actualizar el estado del examen a Finalizado', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create(['estado' => 'En proceso']);

    // V2: Se quitó 'Cancelado' y se prueba con un flujo válido de cierre ('Finalizado' / 'Terminado')
    $response = $this->actingAs($admin, 'sanctum')->putJson("/api/examenes/{$examen->id}", [
        'estado' => 'Finalizado',
    ]);

    $response->assertOk();
})->group('grupo1');