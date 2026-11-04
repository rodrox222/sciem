<?php
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
uses(RefreshDatabase::class);

test('docente asigna auxiliar exitosamente', function () {
    $docente = Docente::factory()->create();
    $examen = Examen::factory()->create(['id_docente' => $docente->id]);
    $estudiante = Estudiante::factory()->create(['email_institucional' => 'auxiliar@est.umss.edu']);

    conRol($this, $docente, 'docente')->postJson("/api/examenes/{$examen->id}/auxiliares", ['email' => 'auxiliar@est.umss.edu'])->assertStatus(201);
    $this->assertDatabaseHas('examen_auxiliar', ['id_auxiliar' => $estudiante->id, 'estado' => 'Activo']);
})->group('grupo1');

test('docente desactiva auxiliar de su examen', function () {
    $docente = Docente::factory()->create();
    $examen = Examen::factory()->create(['id_docente' => $docente->id]);
    $auxiliar = Estudiante::factory()->create();
    DB::table('examen_auxiliar')->insert(['id' => \Str::uuid(), 'id_examen' => $examen->id, 'id_auxiliar' => $auxiliar->id, 'estado' => 'Activo']);

    conRol($this, $docente, 'docente')->deleteJson("/api/examenes/{$examen->id}/auxiliares/{$auxiliar->id}")->assertStatus(200);
})->group('grupo1');

test('falla al asignar como auxiliar a un estudiante ya inscrito para rendir', function () {
    $docente = Docente::factory()->create();
    $examen = Examen::factory()->create(['id_docente' => $docente->id]);
    $estudiante = Estudiante::factory()->create(['email_institucional' => 'alumno@est.umss.edu']);
    $examen->estudiantes()->attach($estudiante->id, ['estado' => 'Habilitado']);

    conRol($this, $docente, 'docente')->postJson("/api/examenes/{$examen->id}/auxiliares", ['email' => 'alumno@est.umss.edu'])->assertStatus(422);
})->group('grupo1');