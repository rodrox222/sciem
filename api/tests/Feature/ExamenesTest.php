<?php

// CONFIRMADO: Examen (tabla examenes) — nombre, id_materia (exists:materias), estado
// (Programado|En proceso|Terminado, CHECK en BD — "Cancelado" está pendiente de agregar
// por el equipo), fecha (date_format Y-m-d, SIN validación de fecha mínima), hora_ini y
// hora_fin (ambos obligatorios, hora_fin solo validado con after:hora_ini), id_aula
// (exists:aulas), id_docente (exists:docente). NO existe un campo `duracion_minutos` —
// el cálculo automático de hora fin (AC9 original) es responsabilidad del FRONTEND según
// confirmó el equipo; no corresponde probarlo aquí. Las normas NO se exigen al crear el
// examen (no hay campo `normas` en StoreExamenRequest) — se asocian después vía
// POST examenes/{id}/normas o examenes/{id}/normas/particulares.
//
// GAPS CONFIRMADOS por el equipo (política: si falla, lo arregla el dev; estos tests NO
// se saltan, quedan como pendientes visibles):
// - No existe ninguna validación de solapamiento de aula/horario, ni en creación ni en
//   edición (TC-HU6-4, TC-HU6-10).
// - No existe validación de "fecha no anterior a hoy" (hallazgo nuevo, mismo criterio
//   que el equipo ya fijó para el solapamiento: se solicitó, se prueba, lo arregla el dev).
// - El estado 'Cancelado' aún no está en el CHECK constraint ni en Rule::in() de los
//   FormRequest — el test de cancelación fallará hasta que se agregue.

use App\Models\Admin;
use App\Models\Aula;
use App\Models\Docente;
use App\Models\Materia;
use App\Models\Examen;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function examenBase(array $overrides = []): array
{
    $aula = Aula::factory()->create();
    $materia = Materia::factory()->create();
    $docente = Docente::factory()->create();

    return array_merge([
        'nombre'     => 'Primer Parcial',
        'id_materia' => $materia->id,
        'fecha'      => now()->addDay()->toDateString(),
        'hora_ini'   => '08:00',
        'hora_fin'   => '09:30',
        'id_aula'    => $aula->id,
        'id_docente' => $docente->id,
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

    $response->assertStatus(422); // GAP: hoy esto se crea sin problema (falla este assert)
})->group('grupo1');

it('TC-HU6-5: rechaza registro de examen con fecha anterior a la actual', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson(
        '/api/examenes',
        examenBase(['fecha' => now()->subDay()->toDateString()])
    );

    $response->assertStatus(422); // GAP: StoreExamenRequest no valida esto hoy
})->group('grupo1');

it('TC-HU6-6: rechaza registro de examen con hora_fin igual o anterior a hora_ini', function () {
    // Equivalente real a "duración <= 0": no existe campo de duración, el modelo valida
    // hora_fin > hora_ini directamente (StoreExamenRequest: 'hora_fin' => [...,'after:hora_ini']).
    $admin = Admin::factory()->create();

    $this->actingAs($admin, 'sanctum')->postJson('/api/examenes', examenBase([
        'hora_ini' => '10:00', 'hora_fin' => '10:00',
    ]))->assertStatus(422);

    $this->actingAs($admin, 'sanctum')->postJson('/api/examenes', examenBase([
        'hora_ini' => '10:00', 'hora_fin' => '09:00',
    ]))->assertStatus(422);
})->group('grupo1');

it('TC-HU6-7: GAP — el examen se puede crear hoy sin ninguna norma asociada', function () {
    // El AC original exige al menos una norma al programar el examen, pero StoreExamenRequest
    // no tiene campo `normas` — las normas se asocian en un paso posterior y separado.
    // Este test documenta el estado real; no hay nada que "rechazar" en el POST de creación.
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/examenes', examenBase());

    $response->assertCreated(); // documenta que hoy se permite sin normas (gap de arquitectura)
})->group('grupo1');

it('TC-HU6-8: rechaza registro de examen sin seleccionar un aula', function () {
    $admin = Admin::factory()->create();
    $materia = Materia::factory()->create();
    $docente = Docente::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/examenes', [
        'nombre' => 'Sin aula', 'id_materia' => $materia->id, 'fecha' => now()->addDay()->toDateString(),
        'hora_ini' => '08:00', 'hora_fin' => '09:00', 'id_aula' => null, 'id_docente' => $docente->id,
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('id_aula');
})->group('grupo1');

it('TC-HU6-10: valida el solapamiento de aula/horario en backend antes de confirmar una edición', function () {
    $admin = Admin::factory()->create();
    $aula = Aula::factory()->create();
    $fecha = now()->addDay()->toDateString();

    $this->actingAs($admin, 'sanctum')->postJson('/api/examenes', examenBase([
        'id_aula' => $aula->id, 'fecha' => $fecha, 'hora_ini' => '08:00', 'hora_fin' => '09:30',
    ]))->assertCreated();

    $otroExamenData = $this->actingAs($admin, 'sanctum')->postJson('/api/examenes', examenBase([
        'fecha' => $fecha, 'hora_ini' => '11:00', 'hora_fin' => '12:00',
    ]))->json('examen');

    $response = $this->actingAs($admin, 'sanctum')->putJson("/api/examenes/{$otroExamenData['id']}", [
        'id_aula' => $aula->id, 'hora_ini' => '08:30', 'hora_fin' => '09:00',
    ]);

    $response->assertStatus(422); // GAP: hoy UpdateExamenRequest tampoco valida esto
})->group('grupo1');

it('bonus: cancela un examen (estado Cancelado pendiente de agregar por el equipo)', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create(['estado' => 'Programado']);

    $response = $this->actingAs($admin, 'sanctum')->putJson("/api/examenes/{$examen->id}", [
        'estado' => 'Cancelado',
    ]);

    $response->assertOk(); // Falla hoy: 'Cancelado' no está en el CHECK ni en Rule::in()
})->group('grupo1');
