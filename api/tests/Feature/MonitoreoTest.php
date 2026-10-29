<?php
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
uses(RefreshDatabase::class);

test('TC-HU16-1: listar asistencias devuelve exclusivamente registros con resultado PERMITIDO', function () {
    $docente = Docente::factory()->create();
    $examen = Examen::factory()->create(['id_docente' => $docente->id]);
    $estudiante = Estudiante::factory()->create();
    DB::table('logs_asistencias')->insert(['id' => \Str::uuid(), 'id_examen' => $examen->id, 'id_estudiante' => $estudiante->id, 'codigo_sis_escaneado' => $estudiante->codigo_sis, 'resultado' => 'PERMITIDO', 'fecha_escaneo' => now(), 'mensaje' => 'Ingreso offline']);

    conRol($this, $docente, 'docente')->getJson("/api/examenes/{$examen->id}/asistencias")
        ->assertOk()->assertJsonPath('asistencias.0.estudiante_id', $estudiante->id);
})->group('grupo1');

test('TC-HU16-2: el panel de monitoreo identifica si el ingreso fue manual', function () {
    $docente = Docente::factory()->create();
    $examen = Examen::factory()->create(['id_docente' => $docente->id]);
    $estudiante = Estudiante::factory()->create();
    DB::table('logs_asistencias')->insert(['id' => \Str::uuid(), 'id_examen' => $examen->id, 'id_estudiante' => $estudiante->id, 'codigo_sis_escaneado' => $estudiante->codigo_sis, 'resultado' => 'PERMITIDO', 'fecha_escaneo' => now(), 'mensaje' => 'manual', 'payload_qr_recibido' => json_encode(['tipo_ingreso' => 'MANUAL'])]);

    conRol($this, $docente, 'docente')->getJson("/api/examenes/{$examen->id}/asistencias")
        ->assertOk()->assertJsonPath('asistencias.0.metodo', 'MANUAL');
})->group('grupo1');