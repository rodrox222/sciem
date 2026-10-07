<?php

// CONFIRMADO: no existe un modelo/tabla `Inscripcion` separado — la relación estudiante-examen
// vive en la tabla pivote `estudiante_examen` (estado: Habilitado|Inhabilitado vía CHECK,
// motivo_inhabilitacion). Dos controllers la tocan:
// - EstudianteController::inscribirAExamen (POST examenes/{id}/estudiantes): crea/actualiza
//   el estudiante (updateOrCreate por codigo_sis) y usa syncWithoutDetaching para vincularlo.
// - HabilitacionExamenController::update (PATCH examenes/{examen}/estudiantes/{estudiante}/habilitacion,
//   SIN restricción de rol más allá de estar autenticado): cambia el estado vía CambiarHabilitacionRequest
//   (estado required in:Habilitado,Inhabilitado; motivo_inhabilitacion required_if estado=Inhabilitado).
//
// GAPS CONFIRMADOS en inscribirAExamen (afectan TC-HU9-6 y TC-HU9-7 tal como están escritos
// en Qase): usa `syncWithoutDetaching`, que NO rechaza una re-inscripción — simplemente
// re-sincroniza el pivot sin error. Y usa `updateOrCreate`, por lo que un "estudiante
// inexistente" nunca se rechaza: se crea sobre la marcha. Tampoco valida `estudiante.activo`
// en ningún punto. Los tres comportamientos contradicen AC6/AC7 de HU-09 tal como se
// redactaron — quedan como pendientes visibles, no ocultos.

use App\Models\Admin;
use App\Models\Examen;
use App\Models\Estudiante;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('TC-HU9-6: rechaza asociar a un estudiante ya inscrito en el mismo examen', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    $estudiante = Estudiante::factory()->create(['codigo_sis' => '202312345']);
    $examen->estudiantes()->attach($estudiante->id, ['estado' => 'Habilitado']);

    $response = $this->actingAs($admin, 'sanctum')->postJson("/api/examenes/{$examen->id}/estudiantes", [
        'codigo_sis' => '202312345', 'ci' => $estudiante->ci, 'nombre' => $estudiante->nombre,
        'apellido_paterno' => $estudiante->apellido_paterno, 'email_institucional' => $estudiante->email_institucional,
    ]);

    $response->assertStatus(422); // GAP: hoy devuelve 200 (syncWithoutDetaching no rechaza)
})->group('grupo1');

it('TC-HU9-7: rechaza asociar a un estudiante con estado inactivo en el catálogo', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    $inactivo = Estudiante::factory()->create(['activo' => false, 'codigo_sis' => '202312999']);

    $response = $this->actingAs($admin, 'sanctum')->postJson("/api/examenes/{$examen->id}/estudiantes", [
        'codigo_sis' => '202312999', 'ci' => $inactivo->ci, 'nombre' => $inactivo->nombre,
        'apellido_paterno' => $inactivo->apellido_paterno, 'email_institucional' => $inactivo->email_institucional,
    ]);

    $response->assertStatus(422); // GAP: inscribirAExamen no revisa `activo` en ningún punto
})->group('grupo1');

it('bonus: rechaza inhabilitar sin motivo (CambiarHabilitacionRequest::required_if)', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    $estudiante = Estudiante::factory()->create();
    $examen->estudiantes()->attach($estudiante->id, ['estado' => 'Habilitado']);

    $response = $this->actingAs($admin, 'sanctum')->patchJson(
        "/api/examenes/{$examen->id}/estudiantes/{$estudiante->id}/habilitacion",
        ['estado' => 'Inhabilitado']
    );

    $response->assertStatus(422)->assertJsonValidationErrors('motivo_inhabilitacion');
})->group('grupo1');

it('bonus: habilita/inhabilita correctamente y almacena el motivo', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    $estudiante = Estudiante::factory()->create();
    $examen->estudiantes()->attach($estudiante->id, ['estado' => 'Habilitado']);

    $response = $this->actingAs($admin, 'sanctum')->patchJson(
        "/api/examenes/{$examen->id}/estudiantes/{$estudiante->id}/habilitacion",
        ['estado' => 'Inhabilitado', 'motivo_inhabilitacion' => 'No presentó documentación.']
    );

    $response->assertOk();
    $this->assertDatabaseHas('estudiante_examen', [
        'id_examen' => $examen->id, 'id_estudiante' => $estudiante->id,
        'estado' => 'Inhabilitado', 'motivo_inhabilitacion' => 'No presentó documentación.',
    ]);
})->group('grupo1');
