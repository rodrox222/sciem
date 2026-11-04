<?php
use App\Models\Estudiante;
use App\Models\Examen;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
uses(RefreshDatabase::class);

test('auxiliar activo puede descargar padron', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true, 'activo' => true]);
    $examen = Examen::factory()->create();
    DB::table('examen_auxiliar')->insert(['id' => \Str::uuid(), 'id_examen' => $examen->id, 'id_auxiliar' => $auxiliar->id, 'estado' => 'Activo']);
    conRol($this, $auxiliar, 'auxiliar')->getJson("/api/examenes/{$examen->id}/descargar-padron")->assertStatus(200);
})->group('grupo1');

test('auxiliar sincroniza asistencias permitidas', function () {
    $auxiliar = Estudiante::factory()->create(['es_auxiliar' => true, 'activo' => true]);
    $examen = Examen::factory()->create(['fecha' => now()->toDateString(), 'hora_ini' => '00:00', 'hora_fin' => '23:59']);
    $estudiante = Estudiante::factory()->create(['activo' => true]);
    DB::table('examen_auxiliar')->insert(['id' => \Str::uuid(), 'id_examen' => $examen->id, 'id_auxiliar' => $auxiliar->id, 'estado' => 'Activo']);
    $examen->estudiantes()->attach($estudiante->id, ['estado' => 'Habilitado']);
    
    conRol($this, $auxiliar, 'auxiliar')->postJson("/api/examenes/{$examen->id}/sincronizar-asistencias", [
        'asistencias' => [['id_estudiante' => $estudiante->id, 'codigo_sis' => $estudiante->codigo_sis, 'fecha_ingreso' => now()->toIso8601String(), 'resultado' => 'PERMITIDO']]
    ])->assertStatus(200);
})->group('grupo1');