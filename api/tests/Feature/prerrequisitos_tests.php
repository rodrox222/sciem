<?php

use App\Models\Admin;
use App\Models\Docente;
use App\Models\Examen;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('docente titular puede crear un prerrequisito para su examen', function () {
    $docente = Docente::factory()->create();
    $examen = Examen::factory()->create(['id_docente' => $docente->id]);

    Sanctum::actingAs($docente, ['role:docente']);
    $response = $this->postJson("/api/examenes/{$examen->id}/prerrequisitos", [
        'titulo' => 'Carnet Universitario',
        'descripcion' => 'Obligatorio'
    ]);

    $response->assertStatus(201);
    $this->assertDatabaseHas('prerrequisitos_examen', ['titulo' => 'Carnet Universitario']);
})->group('grupo1');

test('docente no titular no puede crear prerrequisitos en examen ajeno', function () {
    $docenteTitular = Docente::factory()->create();
    $docenteIntruso = Docente::factory()->create();
    $examen = Examen::factory()->create(['id_docente' => $docenteTitular->id]);

    Sanctum::actingAs($docenteIntruso, ['role:docente']);
    $response = $this->postJson("/api/examenes/{$examen->id}/prerrequisitos", [
        'titulo' => 'Requisito Ilegal',
    ]);

    $response->assertStatus(403);
})->group('grupo1');