<?php

// CONFIRMADO: POST /api/examenes/{idExamen}/estudiantes/carga-masiva
// Validaciones de Request: archivo requerido, mimes:csv,txt,xlsx,xls, max:20480.
// Lógica del Controller:
// - Ignora filas sin SIS válido o vacías.
// - Ignora estudiantes ya inscritos.
// - Todo o nada: usa DB::transaction.
// - Retorna 422 si no hay registros válidos nuevos.
// GAP CONFIRMADO: El límite de archivo en request es 20480 (20MB) pero el acuerdo de negocio era 5MB.
// SUPUESTO: El archivo CSV usa comas y respeta las columnas a partir de la celda '#'.

use App\Models\Admin;
use App\Models\Docente;
use App\Models\Examen;
use App\Models\Estudiante;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function generarCsvValido(): string {
    return "#,SIS,Apellidos,Nombres,Email\n"
         . "1,202600001,Perez,Juan,202600001@est.umss.edu\n"
         . "2,202600002,Gomez,Maria,202600002@est.umss.edu\n";
}

it('TC-HU8-1: carga masiva exitosa inserta nuevos estudiantes y los inscribe al examen', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    $csv = generarCsvValido();
    $archivo = UploadedFile::fake()->createWithContent('estudiantes.csv', $csv);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/examenes/{$examen->id}/estudiantes/carga-masiva", [
            'archivo' => $archivo
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('total_insertados', 2);

    $this->assertDatabaseHas('estudiantes', ['codigo_sis' => '202600001']);
    $this->assertDatabaseHas('estudiantes', ['codigo_sis' => '202600002']);
    
    $estudiante = Estudiante::where('codigo_sis', '202600001')->first();
    $this->assertDatabaseHas('estudiante_examen', [
        'id_examen' => $examen->id,
        'id_estudiante' => $estudiante->id,
        'estado' => 'Habilitado' // Habilitado por defecto si no hay prerrequisitos
    ]);
})->group('grupo1');

it('TC-HU8-2: rechaza archivos con formato no soportado (ej. PDF)', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    $archivo = UploadedFile::fake()->createWithContent('documento.pdf', 'fake pdf content');

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/examenes/{$examen->id}/estudiantes/carga-masiva", [
            'archivo' => $archivo
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('archivo');
})->group('grupo1');

it('TC-HU8-3: retorna 422 si el archivo no contiene estudiantes nuevos o todos ya están inscritos', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    
    // Inscribir previamente al estudiante
    $estudiante = Estudiante::factory()->create(['codigo_sis' => '202600001']);
    $examen->estudiantes()->attach($estudiante->id, ['estado' => 'Habilitado', 'ajuste_manual' => false]);

    $csv = "#,SIS,Apellidos,Nombres,Email\n1,202600001,Perez,Juan,202600001@est.umss.edu\n";
    $archivo = UploadedFile::fake()->createWithContent('duplicados.csv', $csv);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/examenes/{$examen->id}/estudiantes/carga-masiva", [
            'archivo' => $archivo
        ]);

    $response->assertStatus(422)
        ->assertJsonPath('error_type', 'SIN_REGISTROS_NUEVOS');
})->group('grupo1');

it('TC-HU8-4: un docente no titular no puede realizar carga masiva en un examen ajeno', function () {
    $docenteAjeno = Docente::factory()->create();
    $examen = Examen::factory()->create(); // Crea su propio docente internamente
    $archivo = UploadedFile::fake()->createWithContent('estudiantes.csv', generarCsvValido());

    $response = $this->actingAs($docenteAjeno, 'sanctum')
        ->postJson("/api/examenes/{$examen->id}/estudiantes/carga-masiva", [
            'archivo' => $archivo
        ]);

    $response->assertStatus(403)
        ->assertJsonPath('error_type', 'DOCENTE_NO_AUTORIZADO');
})->group('grupo1');