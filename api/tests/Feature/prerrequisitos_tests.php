<?php

// CONFIRMADO: POST /api/examenes/{examenId}/prerrequisitos
// PATCH /api/prerrequisitos/{prerrequisitoId}/estudiantes/{estudianteId}
// Lógica de Negocio Confirmada: 
// - Crear un prerrequisito inactiva automáticamente a todos los inscritos que no tengan ajuste manual.
// - Cumplir todos los prerrequisitos habilita al estudiante (si no tiene ajuste manual).
// GAP CONFIRMADO: Un Administrador cambiando el estado de un prerrequisito genera error 500 por FK a `docente`.

use App\Models\Admin;
use App\Models\Docente;
use App\Models\Examen;
use App\Models\Estudiante;
use App\Models\PrerrequisitoExamen;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('TC-HU9-10: agregar un prerrequisito cambia el estado de inscritos a Inhabilitado (sin ajuste manual)', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    $estudiante = Estudiante::factory()->create();
    
    // Nace Habilitado sin ajuste manual
    $examen->estudiantes()->attach($estudiante->id, [
        'estado' => 'Habilitado', 'ajuste_manual' => false
    ]);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/examenes/{$examen->id}/prerrequisitos", [
            'titulo' => 'Matricula pagada',
            'descripcion' => 'Debe tener matricula al dia'
        ]);

    $response->assertStatus(201);
    
    $pivot = DB::table('estudiante_examen')
        ->where('id_examen', $examen->id)
        ->where('id_estudiante', $estudiante->id)
        ->first();
        
    expect($pivot->estado)->toBe('Inhabilitado');
})->group('grupo1');

it('TC-HU9-11: marcar cumplimiento de todos los prerrequisitos habilita al estudiante automáticamente', function () {
    $docente = Docente::factory()->create();
    $examen = Examen::factory()->create(['id_docente' => $docente->id]);
    $estudiante = Estudiante::factory()->create();
    
    $prerreq = PrerrequisitoExamen::create([
        'id' => (string) \Illuminate\Support\Str::uuid(),
        'id_examen' => $examen->id,
        'titulo' => 'Prueba Documental',
    ]);

    $examen->estudiantes()->attach($estudiante->id, [
        'estado' => 'Inhabilitado', 'ajuste_manual' => false
    ]);

    $response = $this->actingAs($docente, 'sanctum')
        ->patchJson("/api/prerrequisitos/{$prerreq->id}/estudiantes/{$estudiante->id}", [
            'cumplido' => true
        ]);

    $response->assertStatus(200);

    $pivot = DB::table('estudiante_examen')
        ->where('id_examen', $examen->id)
        ->where('id_estudiante', $estudiante->id)
        ->first();
        
    expect($pivot->estado)->toBe('Habilitado');
})->group('grupo1');

it('TC-HU9-12: GAP - Admin registrando cumplimiento da error 500 por violar FK a la tabla docente', function () {
    // Falla documentada en H-11: modificado_por_docente_id intenta guardar el id del admin actual
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    $estudiante = Estudiante::factory()->create();
    
    $prerreq = PrerrequisitoExamen::create([
        'id' => (string) \Illuminate\Support\Str::uuid(),
        'id_examen' => $examen->id,
        'titulo' => 'Prueba Admin',
    ]);

    $examen->estudiantes()->attach($estudiante->id, [
        'estado' => 'Inhabilitado', 'ajuste_manual' => false
    ]);

    // La transacción arroja excepción SQL al intentar persistir
    expect(fn () => 
        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/prerrequisitos/{$prerreq->id}/estudiantes/{$estudiante->id}", [
                'cumplido' => true
            ])
    )->toThrow(\Illuminate\Database\QueryException::class);
})->group('grupo1');