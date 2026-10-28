<?php

// CONFIRMADO: GET /api/examenes/{idExamen}/intentos-no-autorizados
// PARCHE APLICADO: El auxiliar se simula como Estudiante (es_auxiliar=true)
// para cumplir con la Foreign Key de `examen_auxiliar` -> `estudiantes`.

use App\Models\Estudiante;
use App\Models\Examen;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function qrFalso(string $sis, ?string $materia = null): string {
    return json_encode(array_filter(['sis' => $sis, 'materia' => $materia], fn ($v) => $v !== null));
}

function asignarAuxiliar(Estudiante $auxiliar, Examen $examen) {
    DB::table('examen_auxiliar')->insert([
        'id' => (string) Str::uuid(),
        'id_examen' => $examen->id,
        'id_auxiliar' => $auxiliar->id,
        'estado' => 'Aceptada',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    Sanctum::actingAs($auxiliar, ['role:auxiliar']);
}

it('TC-HU13-1: listar intentos no autorizados devuelve los registros ordenados por fecha', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    $examen = Examen::factory()->create();
    $estudiante = Estudiante::factory()->create();

    asignarAuxiliar($auxiliar, $examen);

    // Simulamos un intento de ingreso de alguien no inscrito
    $this->postJson("/api/examenes/{$examen->id}/verificar-ingreso", [
            'qr_data' => qrFalso($estudiante->codigo_sis)
        ])->assertStatus(403);

    // Consultamos la lista de intentos
    $response = $this->getJson("/api/examenes/{$examen->id}/intentos-no-autorizados");

    $response->assertOk()
        ->assertJsonPath('data.0.tipo_intento', 'NO_INSCRITO')
        ->assertJsonPath('data.0.estudiante.codigo_sis', $estudiante->codigo_sis);
})->group('grupo1');

it('TC-HU13-4: un QR ajeno al sistema registra el intento como NO_REGISTRADO', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    $examen = Examen::factory()->create();

    asignarAuxiliar($auxiliar, $examen);

    $this->postJson("/api/examenes/{$examen->id}/verificar-ingreso", [
            'qr_data' => qrFalso('999999999')
        ])->assertStatus(403);

    $this->assertDatabaseHas('intentos_no_autorizados', [
        'id_examen' => $examen->id,
        'tipo_intento' => 'NO_REGISTRADO'
    ]);
})->group('grupo1');

it('TC-HU13-8: registra en auditoría cada vez que ocurre un intento no autorizado', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true]);
    $examen = Examen::factory()->create();
    $estudiante = Estudiante::factory()->create(); // No inscrito

    asignarAuxiliar($auxiliar, $examen);

    $this->postJson("/api/examenes/{$examen->id}/verificar-ingreso", [
            'qr_data' => qrFalso($estudiante->codigo_sis)
        ]);

    $this->assertDatabaseHas('logs_auditoria', [
        'user_id' => $auxiliar->id,
        'modulo' => 'INTENTOS_NO_AUTORIZADOS',
        'accion' => 'INTENTO_NO_AUTORIZADO_REGISTRADO'
    ]);
})->group('grupo1');