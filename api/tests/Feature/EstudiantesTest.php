<?php

use App\Models\Admin;
use App\Models\Examen;
use App\Models\Estudiante;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function estudianteParaInscribir(array $overrides = []) {
    return array_merge([
        'nombre' => 'María', 'apellido_paterno' => 'Gómez',
        'codigo_sis' => '202300001', 'ci' => '7654321',
        'email_institucional' => '202300001@est.umss.edu',
    ], $overrides);
}

it('TC-HU7-4: rechaza inscripción con campo nombre vacío', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson(
        "/api/examenes/{$examen->id}/estudiantes",
        estudianteParaInscribir(['nombre' => ''])
    );

    $response->assertStatus(422)->assertJsonValidationErrors('nombre');
})->group('grupo1');

it('TC-HU7-5: rechaza inscripción con campo apellido_paterno vacío', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson(
        "/api/examenes/{$examen->id}/estudiantes",
        estudianteParaInscribir(['apellido_paterno' => ''])
    );

    $response->assertStatus(422)->assertJsonValidationErrors('apellido_paterno');
})->group('grupo1');

it('TC-HU7-6: rechaza inscripción con campo codigo_sis vacío', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson(
        "/api/examenes/{$examen->id}/estudiantes",
        estudianteParaInscribir(['codigo_sis' => ''])
    );

    $response->assertStatus(422)->assertJsonValidationErrors('codigo_sis');
})->group('grupo1');

it('TC-HU7-7 (V2): permite inscripción con carnet de identidad (ci) vacío (Ahora es opcional)', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();

    // En V2, el CI del estudiante pasó a ser opcional (responde 200 en lugar de 422)
    $response = $this->actingAs($admin, 'sanctum')->postJson(
        "/api/examenes/{$examen->id}/estudiantes",
        estudianteParaInscribir(['ci' => ''])
    );

    $response->assertOk();
})->group('grupo1');

it('TC-HU7-8: rechaza inscripción con correo institucional de formato inválido', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson(
        "/api/examenes/{$examen->id}/estudiantes",
        estudianteParaInscribir(['email_institucional' => 'estudiante@est.umss.edu']) // Debe ser numérico
    );

    $response->assertStatus(422)->assertJsonValidationErrors('email_institucional');
})->group('grupo1');

it('TC-HU7-11 (V2): inscripción con código SIS ya existente actualiza al estudiante (Idempotencia)', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    
    // Inscribimos por primera vez
    $this->actingAs($admin, 'sanctum')->postJson("/api/examenes/{$examen->id}/estudiantes", estudianteParaInscribir([
        'codigo_sis' => '202312345'
    ]))->assertOk();

    // V2: Volver a enviar el mismo SIS no lanza error, sino que hace un UpdateOrCreate (retorna 200)
    $response = $this->actingAs($admin, 'sanctum')->postJson("/api/examenes/{$examen->id}/estudiantes", estudianteParaInscribir([
        'codigo_sis' => '202312345',
        'nombre' => 'María Actualizada'
    ]));

    $response->assertOk();
    $this->assertDatabaseHas('estudiantes', ['codigo_sis' => '202312345', 'nombre' => 'María Actualizada']);
})->group('grupo1');