<?php

use App\Models\Admin;
use App\Models\Docente;
use App\Models\Auxiliar;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function crearAdmin($attrs = []) {
    return Admin::factory()->create($attrs);
}

function datosDocenteValidos($overrides = []) {
    return array_merge([
        'tipo_usuario' => 'docente',
        'ci' => '1234567',
        'nombre' => 'Juan',
        'apellido_paterno' => 'Perez',
        'email' => 'juan@est.umss.edu',
        'password' => 'Password#123'
    ], $overrides);
}

// Helper universal para evitar el bug de Sanctum::actingAs en Pest
if (!function_exists('conRol')) {
    function conRol($testCase, $usuario, $rol) {
        $token = $usuario->createToken('test', ["role:{$rol}"])->plainTextToken;
        return $testCase->withHeader('Authorization', "Bearer {$token}");
    }
}

test('TC-HU1-3: rechaza registro con campo nombre vacío', function () {
    $admin = crearAdmin();
    
    conRol($this, $admin, 'admin')
        ->postJson('/api/users', datosDocenteValidos(['nombre' => '']))
        ->assertStatus(422)
        ->assertJsonValidationErrors('nombre');
})->group('grupo1');

test('TC-HU1-4: rechaza registro con campo apellido_paterno vacío', function () {
    $admin = crearAdmin();
    
    conRol($this, $admin, 'admin')
        ->postJson('/api/users', datosDocenteValidos(['apellido_paterno' => '']))
        ->assertStatus(422)
        ->assertJsonValidationErrors('apellido_paterno');
})->group('grupo1');

test('TC-HU1-5: rechaza registro con campo ci vacío', function () {
    $admin = crearAdmin();
    
    conRol($this, $admin, 'admin')
        ->postJson('/api/users', datosDocenteValidos(['ci' => '']))
        ->assertStatus(422)
        ->assertJsonValidationErrors('ci');
})->group('grupo1');

test('TC-HU1-6: rechaza registro de docente/auxiliar con correo vacío', function () {
    $admin = crearAdmin();
    
    conRol($this, $admin, 'admin')
        ->postJson('/api/users', datosDocenteValidos(['email' => '']))
        ->assertStatus(422)
        ->assertJsonValidationErrors('email');
})->group('grupo1');

test('TC-HU1-7: rechaza registro con CI ya existente validando CI + Extensión (V2)', function () {
    $admin = crearAdmin(['ci' => '8451231']);
    
    conRol($this, $admin, 'admin')
        ->postJson('/api/users', datosDocenteValidos(['ci' => '8451231']))
        ->assertStatus(422)
        ->assertJsonFragment([
            'message' => 'El CI con la extensión indicada ya se encuentra registrado en el sistema.'
        ]);
})->group('grupo1');

test('TC-HU1-8: rechaza registro con correo ya existente', function () {
    $admin = crearAdmin();
    Docente::factory()->create(['email' => 'jperez@est.umss.edu']);
    
    conRol($this, $admin, 'admin')
        ->postJson('/api/users', datosDocenteValidos(['email' => 'jperez@est.umss.edu']))
        ->assertStatus(422)
        ->assertJsonPath('errors.email.0', 'El correo electrónico ya se encuentra registrado en el sistema.');
})->group('grupo1');

test('TC-HU1-9: rechaza registro con formato de correo inválido', function () {
    $admin = crearAdmin();
    
    conRol($this, $admin, 'admin')
        ->postJson('/api/users', datosDocenteValidos(['email' => 'usuario@']))
        ->assertStatus(422)
        ->assertJsonValidationErrors('email');
})->group('grupo1');

test('TC-HU1-10: rechaza registro con contraseña menor a 8 caracteres', function () {
    $admin = crearAdmin();
    
    conRol($this, $admin, 'admin')
        ->postJson('/api/users', datosDocenteValidos(['password' => 'Ab1#23']))
        ->assertStatus(422)
        ->assertJsonValidationErrors('password');
})->group('grupo1');

test('TC-HU1-11: rechaza registro sin tipo_usuario (rol) seleccionado', function () {
    $admin = crearAdmin();
    
    conRol($this, $admin, 'admin')
        ->postJson('/api/users', datosDocenteValidos(['tipo_usuario' => '']))
        ->assertStatus(422)
        ->assertJsonValidationErrors('tipo_usuario');
})->group('grupo1');

test('TC-HU1-19: rechaza en backend el registro de usuarios ejecutado por un Docente (solo Admin puede)', function () {
    $docente = Docente::factory()->create();
    
    conRol($this, $docente, 'docente')
        ->postJson('/api/users', datosDocenteValidos())
        ->assertStatus(403);
})->group('grupo1');

test('TC-HU1-23: almacena la contraseña cifrada, nunca en texto plano', function () {
    $admin = crearAdmin();
    
    conRol($this, $admin, 'admin')
        ->postJson('/api/users', datosDocenteValidos(['ci' => '777888', 'email' => 'hash@est.umss.edu']))
        ->assertCreated();

    $docente = Docente::where('ci', '777888')->first();
    expect($docente->password)->not->toBe('Password#123');
})->group('grupo1');

test('TC-HU1-24: valida el rol en cada petición al backend', function () {
    $auxiliar = Auxiliar::factory()->create();
    
    conRol($this, $auxiliar, 'auxiliar')
        ->postJson('/api/users', datosDocenteValidos())
        ->assertStatus(403);
})->group('grupo1');