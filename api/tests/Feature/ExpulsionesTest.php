<?php

// CONFIRMADO: POST /api/examenes/{id}/expulsiones
// Lógica de negocio confirmada:
// - Requiere id_estudiante y motivo.
// - El estudiante debe estar inscrito en el examen.
// - Registra en 'expulsiones' y genera un log en 'logs_auditoria'.

use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('TC-HU15-1: registrar una expulsión exitosamente guarda el motivo y la auditoría', function () {
    $docente = Docente::factory()->create();
    $examen = Examen::factory()->create(['id_docente' => $docente->id]);
    $estudiante = Estudiante::factory()->create();
    
    // Inscribir estudiante
    $examen->estudiantes()->attach($estudiante->id, [
        'estado' => 'Habilitado', 'ajuste_manual' => false
    ]);

    $response = $this->actingAs($docente, 'sanctum')
        ->postJson("/api/examenes/{$examen->id}/expulsiones", [
            'id_estudiante' => $estudiante->id,
            'motivo' => 'Uso de dispositivo móvil durante el examen.'
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('expulsion.motivo', 'Uso de dispositivo móvil durante el examen.');

    // Verificar en la tabla de expulsiones
    $this->assertDatabaseHas('expulsiones', [
        'id_examen' => $examen->id,
        'id_estudiante' => $estudiante->id,
        'expulsado_por_id' => $docente->id
    ]);

    // Verificar el log de auditoría
    $this->assertDatabaseHas('logs_auditoria', [
        'user_id' => $docente->id,
        'modulo' => 'EXPULSIONES',
        'accion' => 'EXPULSION_REGISTRADA'
    ]);
})->group('grupo1');

it('TC-HU15-3: rechaza expulsar a un estudiante que no está inscrito en el examen', function () {
    $docente = Docente::factory()->create();
    $examen = Examen::factory()->create(['id_docente' => $docente->id]);
    $ajeno = Estudiante::factory()->create(); // No inscrito

    $response = $this->actingAs($docente, 'sanctum')
        ->postJson("/api/examenes/{$examen->id}/expulsiones", [
            'id_estudiante' => $ajeno->id,
            'motivo' => 'Intento de suplantación.'
        ]);

    $response->assertStatus(422)
        ->assertJsonPath('message', 'El estudiante no está inscrito en este examen.');
})->group('grupo1');

it('TC-HU15-4: rechaza registrar una expulsión sin proveer un motivo', function () {
    $docente = Docente::factory()->create();
    $examen = Examen::factory()->create(['id_docente' => $docente->id]);
    $estudiante = Estudiante::factory()->create();
    $examen->estudiantes()->attach($estudiante->id);

    $response = $this->actingAs($docente, 'sanctum')
        ->postJson("/api/examenes/{$examen->id}/expulsiones", [
            'id_estudiante' => $estudiante->id,
            'motivo' => '' // Vacío
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('motivo');
})->group('grupo1');