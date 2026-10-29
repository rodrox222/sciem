<?php

use App\Models\Admin;
use App\Models\Examen;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('permite la carga masiva de estudiantes mediante archivo CSV', function () {
    $admin = Admin::factory()->create();
    $examen = Examen::factory()->create();
    
    $csvContent = "sis,apellidos,nombres,email\n202312345,Perez,Juan,juan@est.umss.edu";
    $archivo = UploadedFile::fake()->createWithContent('estudiantes.csv', $csvContent);

    Sanctum::actingAs($admin, ['role:admin']);
    $response = $this->postJson("/api/examenes/{$examen->id}/estudiantes/carga-masiva", [
        'archivo' => $archivo
    ]);

    $response->assertStatus(201);
    $this->assertDatabaseHas('estudiantes', [
        'codigo_sis' => '202312345'
    ]);
})->group('grupo1');