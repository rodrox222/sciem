<?php

// CONFIRMADO: POST /api/noticias, GET /api/noticias, PUT /api/noticias/{id}, DELETE /api/noticias/{id}
// Lógica de negocio confirmada:
// - Solo Admin y Docente pueden crear noticias.
// - No se puede publicar/editar una noticia vinculada a un examen cuya hora_fin ya pasó.
// - El index filtra automáticamente noticias expiradas y respeta la visibilidad por rol.

use App\Models\Admin;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Noticia;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

uses(RefreshDatabase::class);

it('TC-HU14-1: un administrador puede publicar una noticia general pública', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/noticias', [
        'titulo' => 'Aviso General',
        'contenido' => 'Contenido del aviso para todos',
        'publico_objetivo' => 'Todos',
        'es_publica' => true
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('noticia.titulo', 'Aviso General');

    $this->assertDatabaseHas('noticias', [
        'titulo' => 'Aviso General',
        'autor_id' => $admin->id,
        'autor_tipo' => Admin::class
    ]);
})->group('grupo1');

it('TC-HU14-2: rechaza que un estudiante intente publicar una noticia', function () {
    $estudiante = Estudiante::factory()->create();

    $response = $this->actingAs($estudiante, 'sanctum')->postJson('/api/noticias', [
        'titulo' => 'Intento de Estudiante',
        'contenido' => 'No debería poder publicar',
        'publico_objetivo' => 'Todos',
        'es_publica' => false
    ]);

    $response->assertStatus(403)
        ->assertJsonPath('message', 'No tienes permisos para publicar noticias.');
})->group('grupo1');

it('TC-HU14-3: rechaza publicar una noticia para un examen que ya finalizó', function () {
    $docente = Docente::factory()->create();
    
    // Crear un examen que ya terminó (hora fin en el pasado)
    $examen = Examen::factory()->create([
        'id_docente' => $docente->id,
        'fecha' => now('America/La_Paz')->toDateString(),
        'hora_ini' => now('America/La_Paz')->subHours(3)->format('H:i'),
        'hora_fin' => now('America/La_Paz')->subHours(1)->format('H:i'), // Ya terminó
    ]);

    $response = $this->actingAs($docente, 'sanctum')->postJson('/api/noticias', [
        'titulo' => 'Aviso Tardío',
        'contenido' => 'El examen ha finalizado',
        'publico_objetivo' => 'Estudiantes',
        'es_publica' => false,
        'id_examen' => $examen->id
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('message', 'No puedes publicar una noticia para un examen que ya finalizó.');
})->group('grupo1');

it('TC-HU14-4: un docente no puede editar ni eliminar la noticia de otro docente', function () {
    $docenteAutor = Docente::factory()->create();
    $docenteAjeno = Docente::factory()->create();

    $noticia = Noticia::factory()->create([
        'autor_id' => $docenteAutor->id,
        'autor_tipo' => Docente::class,
        'titulo' => 'Noticia Original'
    ]);

    $responseEdit = $this->actingAs($docenteAjeno, 'sanctum')->putJson("/api/noticias/{$noticia->id}", [
        'titulo' => 'Intento de Edición',
        'contenido' => 'Hack'
    ]);

    $responseEdit->assertStatus(403);

    $responseDelete = $this->actingAs($docenteAjeno, 'sanctum')->deleteJson("/api/noticias/{$noticia->id}");
    $responseDelete->assertStatus(403);
})->group('grupo1');