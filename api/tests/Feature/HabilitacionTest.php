<?php

// CONFIRMADO contra el código y el schema vigentes (rama Automatizacion_Test):
// - estudiante_examen: estado (CHECK Habilitado|Inhabilitado, default 'Inhabilitado'), motivo_estado,
//   ajuste_manual, modificado_por_docente_id (FK -> docente.id), fecha_ajuste_manual, fecha_ingreso.
// - PATCH examenes/{examen}/estudiantes/{estudiante}/habilitacion (CheckRole admin|docente): exige
//   `estado` y `motivo_estado` (el 422 de la corrida anterior nombra motivo_estado).
// - GET examenes/{examen}/estudiantes -> HabilitacionExamenController@index (ya sin colisión de rutas).
// - GET examenes/{examen}/estudiantes/{estudiante}/motivo -> HabilitacionExamenController@motivoInhabilitacion.
// - EstudianteController::inscribirAExamen: estado por defecto = Inhabilitado si el examen tiene
//   prerrequisitos, Habilitado si no tiene.
//
// GAPS que estos tests dejan en rojo a propósito (política acordada: lo corrige el dev):
// - TC-HU9-2 (Admin): modificado_por_docente_id es FK a docente(id) y el controller guarda el id del
//   usuario autenticado sea quien sea; con un Admin (la ruta lo permite) la FK se viola -> 500.
// - TC-HU9-4: update() sobrescribe motivo_estado y no escribe en logs_auditoria: el motivo anterior se pierde.
// - TC-HU9-6 / TC-HU9-7: inscribirAExamen (syncWithoutDetaching + updateOrCreate) no rechaza la
//   re-inscripción ni revisa estudiantes.activo.
// - bonus: re-inscribir pisa un ajuste manual previo (resetea estado, motivo_estado y ajuste_manual).
// TC-HU9-8 (auditoría del cambio de habilitación) vive en AuditoriaTest.php.

use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function habilitacionFixture(string $estado = 'Habilitado', ?string $motivo = null): array
{
    $examen = Examen::factory()->create();
    $estudiante = Estudiante::factory()->create();
    $examen->estudiantes()->attach($estudiante->id, [
        'estado' => $estado, 'motivo_estado' => $motivo, 'ajuste_manual' => false,
    ]);

    return [$examen, $estudiante];
}

function inscribirPayload(Estudiante $e, array $overrides = []): array
{
    return array_merge([
        'codigo_sis' => $e->codigo_sis, 'ci' => $e->ci, 'nombre' => $e->nombre,
        'apellido_paterno' => $e->apellido_paterno, 'email_institucional' => $e->email_institucional,
    ], $overrides);
}

function habilitacionUrl(Examen $examen, Estudiante $estudiante): string
{
    return "/api/examenes/{$examen->id}/estudiantes/{$estudiante->id}/habilitacion";
}

it('TC-HU9-1 (sin prerrequisitos): la inscripción nace Habilitado', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    $estudiante = Estudiante::factory()->make(); // sin persistir: inscribirAExamen lo crea

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/examenes/{$examen->id}/estudiantes", inscribirPayload($estudiante))
        ->assertOk();

    expect(DB::table('estudiante_examen')->where('id_examen', $examen->id)->value('estado'))->toBe('Habilitado');
})->group('grupo1');

it('TC-HU9-1 (con prerrequisitos): la inscripción nace Inhabilitado', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    $estudiante = Estudiante::factory()->make();
    DB::table('prerrequisitos_examen')->insert([
        'id' => (string) Str::uuid(), 'id_examen' => $examen->id, 'titulo' => 'Pago de matricula',
        'created_at' => now(), 'updated_at' => now(),
    ]);

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/examenes/{$examen->id}/estudiantes", inscribirPayload($estudiante))
        ->assertOk();

    expect(DB::table('estudiante_examen')->where('id_examen', $examen->id)->value('estado'))->toBe('Inhabilitado');
})->group('grupo1');

it('TC-HU9-2: un Docente inhabilita a un estudiante con motivo y quedan guardados motivo, usuario y fecha', function () {
    $docente = Docente::factory()->create();
    [$examen, $estudiante] = habilitacionFixture();

    $this->actingAs($docente, 'sanctum')->patchJson(
        habilitacionUrl($examen, $estudiante),
        ['estado' => 'Inhabilitado', 'motivo_estado' => 'No presento documentacion.']
    )->assertOk();

    $fila = DB::table('estudiante_examen')
        ->where('id_examen', $examen->id)->where('id_estudiante', $estudiante->id)->first();

    expect($fila->estado)->toBe('Inhabilitado');
    expect($fila->motivo_estado)->toBe('No presento documentacion.');
    expect((bool) $fila->ajuste_manual)->toBeTrue();
    expect($fila->modificado_por_docente_id)->toBe($docente->id);
    expect($fila->fecha_ajuste_manual)->not->toBeNull();
})->group('grupo1');

it('TC-HU9-2 (Admin): un Administrador también puede inhabilitar con motivo', function () {
    $admin = Admin::factory()->create();
    [$examen, $estudiante] = habilitacionFixture();

    $this->actingAs($admin, 'sanctum')->patchJson(
        habilitacionUrl($examen, $estudiante),
        ['estado' => 'Inhabilitado', 'motivo_estado' => 'No presento documentacion.']
    )->assertOk();
})->group('grupo1');

it('TC-HU9-3: la lista del examen muestra el estado actual y el motivo de inhabilitación', function () {
    $auxiliar = Auxiliar::factory()->create();
    [$examen, $estudiante] = habilitacionFixture('Inhabilitado', 'Falta pago');

    $this->actingAs($auxiliar, 'sanctum')->getJson("/api/examenes/{$examen->id}/estudiantes")
        ->assertOk()
        ->assertJsonPath('estudiantes.0.estado', 'Inhabilitado')
        ->assertJsonPath('estudiantes.0.motivo_estado', 'Falta pago');
})->group('grupo1');

it('TC-HU9-4: al revertir a Habilitado el motivo anterior se conserva como histórico', function () {
    $docente = Docente::factory()->create();
    [$examen, $estudiante] = habilitacionFixture();
    $url = habilitacionUrl($examen, $estudiante);

    $this->actingAs($docente, 'sanctum')->patchJson($url, [
        'estado' => 'Inhabilitado', 'motivo_estado' => 'Motivo original',
    ])->assertOk();
    $this->actingAs($docente, 'sanctum')->patchJson($url, [
        'estado' => 'Habilitado', 'motivo_estado' => 'Reversion autorizada',
    ])->assertOk();

    // El motivo original debe seguir consultable en algún histórico (hoy se sobrescribe y no se audita).
    expect(DB::table('logs_auditoria')->whereRaw('detalles::text ilike ?', ['%Motivo original%'])->exists())->toBeTrue();
})->group('grupo1');

it('TC-HU9-5: rechaza inhabilitar sin motivo exigiendo el campo', function () {
    $docente = Docente::factory()->create();
    [$examen, $estudiante] = habilitacionFixture();

    $this->actingAs($docente, 'sanctum')->patchJson(habilitacionUrl($examen, $estudiante), [
        'estado' => 'Inhabilitado',
    ])->assertStatus(422)->assertJsonValidationErrors('motivo_estado');
})->group('grupo1');

it('TC-HU9-6: rechaza asociar a un estudiante ya inscrito en el mismo examen', function () {
    $admin = Admin::factory()->create();
    [$examen, $estudiante] = habilitacionFixture();

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/examenes/{$examen->id}/estudiantes", inscribirPayload($estudiante))
        ->assertStatus(422);
})->group('grupo1');

it('TC-HU9-7: rechaza asociar a un estudiante con estado inactivo en el catálogo', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    $inactivo = Estudiante::factory()->create(['activo' => false]);

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/examenes/{$examen->id}/estudiantes", inscribirPayload($inactivo))
        ->assertStatus(422);
})->group('grupo1');

it('TC-HU9-9: la consulta de estado y motivo responde con el valor vigente y 404 si no está inscrito', function () {
    $auxiliar = Auxiliar::factory()->create();
    [$examen, $estudiante] = habilitacionFixture('Inhabilitado', 'Falta pago');
    $ajeno = Estudiante::factory()->create();

    $this->actingAs($auxiliar, 'sanctum')
        ->getJson("/api/examenes/{$examen->id}/estudiantes/{$estudiante->id}/motivo")
        ->assertOk()
        ->assertJsonPath('estado', 'Inhabilitado')
        ->assertJsonPath('motivo_estado', 'Falta pago');

    $this->actingAs($auxiliar, 'sanctum')
        ->getJson("/api/examenes/{$examen->id}/estudiantes/{$ajeno->id}/motivo")
        ->assertStatus(404);
})->group('grupo1');

it('bonus: volver a inscribir a un estudiante no debe pisar un ajuste manual previo', function () {
    $admin = Admin::factory()->create();
    $docente = Docente::factory()->create();
    [$examen, $estudiante] = habilitacionFixture();

    $this->actingAs($docente, 'sanctum')->patchJson(habilitacionUrl($examen, $estudiante), [
        'estado' => 'Inhabilitado', 'motivo_estado' => 'Ajuste manual',
    ])->assertOk();

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/examenes/{$examen->id}/estudiantes", inscribirPayload($estudiante));

    $fila = DB::table('estudiante_examen')
        ->where('id_examen', $examen->id)->where('id_estudiante', $estudiante->id)->first();

    expect((bool) $fila->ajuste_manual)->toBeTrue();
    expect($fila->estado)->toBe('Inhabilitado');
})->group('grupo1');
