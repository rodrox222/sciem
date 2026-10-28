<?php

// CONFIRMADO: GET /api/examenes/{id_examen}/asistencias
// VerificacionController@listarAsistencias retorna solo los ingresos con resultado = 'PERMITIDO'.
// Incluye detalles como el método (MANUAL o QR).

use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\LogAsistencia;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Carbon\Carbon;

uses(RefreshDatabase::class);

it('TC-HU16-1: listar asistencias devuelve exclusivamente registros con resultado PERMITIDO', function () {
    $docente = Docente::factory()->create();
    $examen = Examen::factory()->create(['id_docente' => $docente->id]);
    $estudiante1 = Estudiante::factory()->create();
    $estudiante2 = Estudiante::factory()->create();

    // Ingreso Exitoso
    LogAsistencia::create([
        'id' => (string) Str::uuid(),
        'id_examen' => $examen->id,
        'id_estudiante' => $estudiante1->id,
        'codigo_sis_escaneado' => $estudiante1->codigo_sis,
        'resultado' => 'PERMITIDO',
        'mensaje' => 'Ingreso autorizado',
        'fecha_escaneo' => Carbon::now('America/La_Paz')->subMinutes(5)
    ]);

    // Ingreso Rechazado (No debe salir en la lista del panel de monitoreo principal)
    LogAsistencia::create([
        'id' => (string) Str::uuid(),
        'id_examen' => $examen->id,
        'id_estudiante' => $estudiante2->id,
        'codigo_sis_escaneado' => $estudiante2->codigo_sis,
        'resultado' => 'RECHAZADO_INHABILITADO',
        'mensaje' => 'No habilitado',
        'fecha_escaneo' => Carbon::now('America/La_Paz')
    ]);

    $response = $this->actingAs($docente, 'sanctum')
        ->getJson("/api/examenes/{$examen->id}/asistencias");

    $response->assertStatus(200)
        ->assertJsonPath('total_ingresados', 1)
        ->assertJsonPath('asistencias.0.estudiante_id', $estudiante1->id)
        ->assertJsonPath('asistencias.0.metodo', 'QR'); // Por defecto si el payload no dice MANUAL
})->group('grupo1');

it('TC-HU16-2: el panel de monitoreo identifica si el ingreso fue manual', function () {
    $docente = Docente::factory()->create();
    $examen = Examen::factory()->create(['id_docente' => $docente->id]);
    $estudiante = Estudiante::factory()->create();

    LogAsistencia::create([
        'id' => (string) Str::uuid(),
        'id_examen' => $examen->id,
        'id_estudiante' => $estudiante->id,
        'codigo_sis_escaneado' => $estudiante->codigo_sis,
        'resultado' => 'PERMITIDO',
        'mensaje' => 'Ingreso manual autorizado',
        'payload_qr_recibido' => ['tipo_ingreso' => 'MANUAL'],
        'fecha_escaneo' => Carbon::now('America/La_Paz')
    ]);

    $response = $this->actingAs($docente, 'sanctum')
        ->getJson("/api/examenes/{$examen->id}/asistencias");

    $response->assertStatus(200)
        ->assertJsonPath('asistencias.0.metodo', 'MANUAL');
})->group('grupo1');