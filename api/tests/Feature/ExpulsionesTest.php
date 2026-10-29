<?php
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('TC-HU15-1: registrar una expulsión exitosamente guarda el motivo y la auditoría', function () {
    $docente = Docente::factory()->create();
    $examen = Examen::factory()->create(['id_docente' => $docente->id, 'fecha' => now('America/La_Paz')->toDateString(), 'hora_ini' => '00:00', 'hora_fin' => '23:59']);
    $estudiante = Estudiante::factory()->create();
    $examen->estudiantes()->attach($estudiante->id, ['estado' => 'Habilitado', 'fecha_ingreso' => now()]);
    
    DB::table('logs_asistencias')->insert([
        'id' => \Str::uuid(), 'id_examen' => $examen->id, 'id_estudiante' => $estudiante->id, 
        'codigo_sis_escaneado' => $estudiante->codigo_sis, 'resultado' => 'PERMITIDO', 'fecha_escaneo' => now(), 'mensaje' => 'OK'
    ]);

    conRol($this, $docente, 'docente')->postJson("/api/examenes/{$examen->id}/expulsiones", ['id_estudiante' => $estudiante->id, 'motivo' => 'Uso de móvil.'])
        ->assertStatus(201);
})->group('grupo1');

test('TC-HU15-3: rechaza expulsar a un estudiante que no está inscrito en el examen', function () {
    $docente = Docente::factory()->create();
    $examen = Examen::factory()->create(['id_docente' => $docente->id, 'fecha' => now('America/La_Paz')->toDateString(), 'hora_ini' => '00:00', 'hora_fin' => '23:59']);
    $ajeno = Estudiante::factory()->create();

    conRol($this, $docente, 'docente')->postJson("/api/examenes/{$examen->id}/expulsiones", ['id_estudiante' => $ajeno->id, 'motivo' => 'Suplantación.'])
        ->assertStatus(422);
})->group('grupo1');

test('TC-HU15-4: rechaza registrar una expulsión sin proveer un motivo', function () {
    $docente = Docente::factory()->create();
    $examen = Examen::factory()->create(['id_docente' => $docente->id, 'fecha' => now('America/La_Paz')->toDateString(), 'hora_ini' => '00:00', 'hora_fin' => '23:59']);
    $estudiante = Estudiante::factory()->create();

    conRol($this, $docente, 'docente')->postJson("/api/examenes/{$examen->id}/expulsiones", ['id_estudiante' => $estudiante->id, 'motivo' => ''])
        ->assertStatus(422)->assertJsonValidationErrors('motivo');
})->group('grupo1');