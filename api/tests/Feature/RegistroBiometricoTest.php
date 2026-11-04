<?php

use App\Models\Estudiante;
use App\Models\Examen;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

if (!function_exists('conRol')) {
    function conRol($testCase, $usuario, $rol) {
        $token = $usuario->createToken('test', ["role:{$rol}"])->plainTextToken;
        return $testCase->withHeader('Authorization', "Bearer {$token}");
    }
}

test('estudiante puede completar su CI', function () {
    $estudiante = Estudiante::factory()->create(['ci' => null]);

    $response = conRol($this, $estudiante, 'estudiante')
        ->postJson('/api/estudiante/completar-datos', [
            'ci' => '1234567',
            'ci_extension' => 'CB'
        ]);

    $response->assertStatus(200)
             ->assertJsonPath('success', true);
    
    $this->assertDatabaseHas('estudiantes', ['id' => $estudiante->id, 'ci' => '1234567']);
})->group('grupo1');

test('estudiante puede subir foto de verificacion', function () {
    Storage::fake('public');
    $estudiante = Estudiante::factory()->create();
    $foto = UploadedFile::fake()->image('perfil.jpg', 600, 600);

    $response = conRol($this, $estudiante, 'estudiante')
        ->postJson('/api/estudiante/foto', [
            'foto' => $foto
        ]);

    $response->assertStatus(200);
    $this->assertNotNull($estudiante->fresh()->foto_perfil_url);
})->group('grupo1');

test('estudiante sin perfil completo no puede generar QR', function () {
    $estudiante = Estudiante::factory()->create(['ci' => null, 'foto_perfil_url' => null]);
    $examen = Examen::factory()->create();
    $examen->estudiantes()->attach($estudiante->id, ['estado' => 'Habilitado']);

    $response = conRol($this, $estudiante, 'estudiante')
        ->postJson("/api/estudiante/examenes/{$examen->id}/qr-token");

    $response->assertStatus(403)
             ->assertJsonPath('error_type', 'REGISTRO_INCOMPLETO');
})->group('grupo1');