<?php

// HALLAZGO ARQUITECTÓNICO IMPORTANTE (no es un simple gap, cambia el enfoque de HU-07):
// EstudianteController::store() (con StoreEstudianteRequest) existe en el código pero
// NO está enrutado en api.php — no hay POST /api/estudiantes. Tampoco existe PUT ni
// DELETE /api/estudiantes/{id}. El ÚNICO endpoint de escritura realmente alcanzable es
// POST /api/examenes/{id}/estudiantes (inscribirAExamen), que usa
// InscribirEstudianteExamenRequest y hace `Estudiante::updateOrCreate(['codigo_sis'=>...], [...])`
// + vincula al examen en la misma operación. Esto en realidad COINCIDE con la descripción
// original de HU-07 ("visualizar y modificar estos datos en el sector de exámenes
// correspondientes de la HU 6"), aunque los AC que procesamos en Qase se redactaron
// asumiendo un catálogo independiente con create/update/delete propios.
//
// Consecuencia importante: InscribirEstudianteExamenRequest NO tiene reglas `unique` en
// codigo_sis ni email_institucional (a diferencia de StoreEstudianteRequest) — un
// codigo_sis repetido no se rechaza, se trata como edición del estudiante existente
// (comportamiento updateOrCreate). Esto contradice literalmente el AC13 ("código SIS ya
// registrado" debe rechazarse) tal como está escrito. Dejo el test de TC-HU7-11 escrito
// contra el comportamiento DESEADO (rechazo) para que quede visible como pendiente de
// decisión de producto: ¿la duplicidad de codigo_sis debe seguir rechazándose en este
// flujo, o el diseño real (tratarlo como edición) es el que quieren mantener? Mientras no
// se decida, este test fallará por diseño, no por error de código.
//
// GAP CONFIRMADO (hallazgo C / punto 7): ni InscribirEstudianteExamenRequest ni la tabla
// `estudiantes` validan unicidad de `ci` en ningún punto.
// GAP: ci_extension no tiene ninguna restricción de formato (solo max:10) — "más de una
// letra o caracteres especiales" (AC15 original) no se rechaza hoy.
// GAP: no hay endpoint para eliminar/desactivar un estudiante — TC-HU7-9 (rechazar borrado
// físico si está asociado a examen) no tiene ruta real que ejercitar todavía.

use App\Models\Admin;
use App\Models\Examen;
use App\Models\Estudiante;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function estudianteParaInscribir(array $overrides = []): array
{
    return array_merge([
        'codigo_sis'          => '202312399',
        'ci'                  => '6789012',
        'nombre'              => 'Ana',
        'apellido_paterno'    => 'Gómez',
        'email_institucional' => '202312399@est.umss.edu',
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

it('TC-HU7-7: rechaza inscripción con campo carnet de identidad (ci) vacío', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson(
        "/api/examenes/{$examen->id}/estudiantes",
        estudianteParaInscribir(['ci' => ''])
    );

    $response->assertStatus(422)->assertJsonValidationErrors('ci');
})->group('grupo1');

it('TC-HU7-8: rechaza inscripción con correo institucional de formato inválido', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson(
        "/api/examenes/{$examen->id}/estudiantes",
        estudianteParaInscribir(['email_institucional' => 'estudiante@est.umss.edu']) // debe ser solo dígitos antes del @
    );

    $response->assertStatus(422)->assertJsonValidationErrors('email_institucional');
})->group('grupo1');

it('TC-HU7-9: GAP — no existe endpoint para eliminar/desactivar un estudiante', function () {
    // No hay DELETE /api/estudiantes/{id} ni PUT /api/estudiantes/{id} enrutados.
    // Se deja como pendiente explícito: hace falta decidir y construir ese endpoint
    // antes de que este TC pueda ejecutarse contra código real.
})->skip('No existe ruta de eliminación/desactivación de estudiante todavía (ver hallazgo arquitectónico).')
  ->group('grupo1');

it('TC-HU7-10: acepta un CI con ci_extension distinta como estudiante diferente', function () {
    $admin = Admin::factory()->create();
    $examenA = Examen::factory()->create();
    $examenB = Examen::factory()->create();

    $this->actingAs($admin, 'sanctum')->postJson("/api/examenes/{$examenA->id}/estudiantes", estudianteParaInscribir([
        'codigo_sis' => '202312400', 'ci' => '8234567', 'ci_extension' => null,
        'email_institucional' => '202312400@est.umss.edu',
    ]))->assertOk();

    $response = $this->actingAs($admin, 'sanctum')->postJson("/api/examenes/{$examenB->id}/estudiantes", estudianteParaInscribir([
        'codigo_sis' => '202312401', 'ci' => '8234567', 'ci_extension' => 'A',
        'nombre' => 'María', 'apellido_paterno' => 'López', 'email_institucional' => '202312401@est.umss.edu',
    ]));

    $response->assertOk();
    expect(Estudiante::where('ci', '8234567')->count())->toBe(2);
})->group('grupo1');

it('TC-HU7-11: rechaza inscripción con código SIS ya existente (pendiente de decisión de producto)', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    Estudiante::factory()->create(['codigo_sis' => '202312345']);

    $response = $this->actingAs($admin, 'sanctum')->postJson(
        "/api/examenes/{$examen->id}/estudiantes",
        estudianteParaInscribir(['codigo_sis' => '202312345'])
    );

    // Comportamiento DESEADO según AC13 (falla hoy: el controller hace updateOrCreate,
    // así que esto devuelve 200 y actualiza en vez de rechazar). Ver nota al inicio del archivo.
    $response->assertStatus(422);
})->group('grupo1');

it('TC-HU7-12: GAP — nada rechaza hoy un CI (con o sin extensión) exactamente duplicado', function () {
    $admin = Admin::factory()->create();
    $examenA = Examen::factory()->create();
    $examenB = Examen::factory()->create();
    Estudiante::factory()->create(['ci' => '8234567', 'ci_extension' => null]);

    $response = $this->actingAs($admin, 'sanctum')->postJson("/api/examenes/{$examenB->id}/estudiantes", estudianteParaInscribir([
        'codigo_sis' => '202312450', 'ci' => '8234567', 'ci_extension' => null,
        'email_institucional' => '202312450@est.umss.edu',
    ]));

    $response->assertStatus(422); // GAP: hoy se permite (200), nada valida CI duplicado
})->group('grupo1');

it('TC-HU7-13: GAP — ci_extension no valida formato (acepta más de una letra o caracteres especiales)', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')->postJson(
        "/api/examenes/{$examen->id}/estudiantes",
        estudianteParaInscribir(['ci_extension' => 'AB-1'])
    );

    $response->assertStatus(422); // GAP: hoy solo valida max:10, esto pasaría como válido
})->group('grupo1');

it('TC-HU7-14: código SIS y CI son UNIQUE a nivel de base de datos', function () {
    Estudiante::factory()->create(['codigo_sis' => '202312345', 'ci' => '8234567', 'ci_extension' => null]);

    // codigo_sis duplicado: protegido hoy por estudiantes_codigo_sis_unique.
    expect(fn () => DB::transaction(fn () => Estudiante::factory()->create([
        'codigo_sis' => '202312345', 'ci' => '7000001',
    ])))->toThrow(\Illuminate\Database\QueryException::class);

    // CI duplicado (mismo ci y misma ci_extension): GAP confirmado, no hay UNIQUE -> FALLA hoy.
    // Ojo para quien lo implemente: un UNIQUE (ci, ci_extension) normal NO bloquea duplicados
    // cuando ci_extension es NULL (en PostgreSQL los NULL se consideran distintos); en PG 15
    // se puede usar UNIQUE NULLS NOT DISTINCT (ci, ci_extension).
    expect(fn () => DB::transaction(fn () => Estudiante::factory()->create([
        'codigo_sis' => '202312460', 'ci' => '8234567', 'ci_extension' => null,
    ])))->toThrow(\Illuminate\Database\QueryException::class);
})->group('grupo1');
