<?php

// CONFIRMADO: POST /api/incidencias
// IncidenciaController@storeIncidencia delega el registro asociando el autor polimórfico.

use App\Models\Admin;
use App\Models\Docente;
use App\Models\Auxiliar;
use App\Models\Examen;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('TC-HU14-6: un auxiliar puede registrar una incidencia vinculada a un examen', function () {
    $auxiliar = Auxiliar::factory()->create();
    $examen = Examen::factory()->create();

    $response = $this->actingAs($auxiliar, 'sanctum')->postJson('/api/incidencias', [
        'id_examen' => $examen->id,
        'descripcion' => 'Falla eléctrica en el aula A-101 durante 10 minutos.',
        'tipo' => 'Infraestructura', // Supuesto de campo basado en incidentes
        'gravedad' => 'Media'
    ]);

    // Asumimos 201 Created por el estándar del controller
    $response->assertStatus(201)
        ->assertJsonPath('message', 'Incidencia registrada exitosamente.');

    $this->assertDatabaseHas('incidencias', [
        'id_examen' => $examen->id,
        'autor_id' => $auxiliar->id,
        'autor_tipo' => Auxiliar::class
    ]);
})->group('grupo1');