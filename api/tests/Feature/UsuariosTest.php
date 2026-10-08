<?php

// CONFIRMADO contra código real: no existe un modelo User único. Son tres modelos/tablas
// independientes (Admin, Docente, Auxiliar), todos Authenticatable con Sanctum, PK uuid.
// El rol se infiere en AuthController::identificarYBuscarUsuario() por patrón del
// identificador (CI numérico -> Admin; @fcyt.umss.edu.bo -> Docente; @est.umss.edu -> Auxiliar).
// Ruta real: Route::apiResource('users', UserController::class) -> POST/PUT/DELETE /users{,/…}.
//
// GAP CONOCIDO (pendiente de que el equipo lo corrija, no es un error de este test):
// StoreUserRequest valida el correo con /^[a-zA-Z0-9._%+-]+@(est\.umss\.edu|gmail\.com)$/i —
// NO acepta @fcyt.umss.edu.bo, aunque AuthController sí reconoce ese dominio para login de
// Docente. El equipo confirmó que es un bug de coordinación a resolver; el test de registro
// de Docente con correo @fcyt.umss.edu.bo fallará hasta que se corrija ese regex.
//
// GAP CONOCIDO: ni `admin.ci`, `docente.ci` ni `auxiliar.ci` tienen constraint UNIQUE a nivel
// de base de datos (confirmado por el schema dump). La unicidad de CI across las 3 tablas
// HOY solo existe en el closure de StoreUserRequest — por eso el test de unicidad se hace
// vía la API (comportamiento esperado), no vía un insert directo a Eloquent/DB.

use App\Models\Admin;
use App\Models\Docente;
use App\Models\Auxiliar;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function crearAdmin(array $overrides = []): Admin
{
    return Admin::factory()->create(array_merge(['activo' => true], $overrides));
}

function datosDocenteValidos(array $overrides = []): array
{
    return array_merge([
        'tipo_usuario'     => 'docente',
        'ci'               => '8451231',
        'nombre'           => 'Juan',
        'apellido_paterno' => 'Pérez',
        'apellido_materno' => 'Rojas',
        'email'            => 'jperez@fcyt.umss.edu.bo', // ver GAP: hoy el regex lo rechaza
        'password'         => 'Test#2026',
    ], $overrides);
}

// --- Validaciones de formulario (TC-HU1-3 a TC-HU1-11) ---

it('TC-HU1-3: rechaza registro con campo nombre vacío', function () {
    $admin = crearAdmin();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/users', datosDocenteValidos(['nombre' => '']));

    $response->assertStatus(422)->assertJsonValidationErrors('nombre');
})->group('grupo1');

it('TC-HU1-4: rechaza registro con campo apellido_paterno vacío', function () {
    $admin = crearAdmin();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/users', datosDocenteValidos(['apellido_paterno' => '']));

    $response->assertStatus(422)->assertJsonValidationErrors('apellido_paterno');
})->group('grupo1');

it('TC-HU1-5: rechaza registro con campo ci vacío', function () {
    $admin = crearAdmin();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/users', datosDocenteValidos(['ci' => '']));

    $response->assertStatus(422)->assertJsonValidationErrors('ci');
})->group('grupo1');

it('TC-HU1-6: rechaza registro de docente/auxiliar con correo vacío', function () {
    $admin = crearAdmin();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/users', datosDocenteValidos(['email' => '']));

    $response->assertStatus(422)->assertJsonValidationErrors('email');
})->group('grupo1');

it('TC-HU1-7: rechaza registro con CI ya existente en cualquiera de las 3 tablas', function () {
    $admin = crearAdmin(['ci' => '8451231']);
    Docente::factory()->create(['ci' => '9000001']);

    // Intenta crear un Auxiliar con el mismo CI que el Admin ya existente.
    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/users', [
        'tipo_usuario' => 'auxiliar', 'ci' => '8451231', 'nombre' => 'Pedro',
        'apellido_paterno' => 'Gómez', 'email' => 'pgomez@est.umss.edu', 'password' => 'Test#2026',
    ]);

    $response->assertStatus(422)->assertJsonFragment(['message' => 'El CI ya se encuentra registrado en el sistema.']);
})->group('grupo1');

it('TC-HU1-8: rechaza registro con correo ya existente', function () {
    $admin = crearAdmin();
    // Se usa @est.umss.edu (dominio que el regex de StoreUserRequest sí acepta hoy) para que
    // el único error posible sea la duplicidad; con @fcyt.umss.edu.bo el test pasaría por el
    // bug del regex y no probaría nada sobre el correo duplicado.
    Docente::factory()->create(['email' => 'jperez@est.umss.edu']);

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/users', datosDocenteValidos([
        'ci' => '6456789', 'email' => 'jperez@est.umss.edu',
    ]));

    $response->assertStatus(422)
        ->assertJsonPath('errors.email.0', 'El correo electrónico ya se encuentra registrado en el sistema.');
})->group('grupo1');

it('TC-HU1-9: rechaza registro con formato de correo inválido', function () {
    $admin = crearAdmin();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/users', datosDocenteValidos(['email' => 'usuario@']));

    $response->assertStatus(422)->assertJsonValidationErrors('email');
})->group('grupo1');

it('TC-HU1-10: rechaza registro con contraseña menor a 8 caracteres', function () {
    $admin = crearAdmin();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/users', datosDocenteValidos(['password' => 'Ab1#23']));

    $response->assertStatus(422)->assertJsonValidationErrors('password');
})->group('grupo1');

it('TC-HU1-11: rechaza registro sin tipo_usuario (rol) seleccionado', function () {
    $admin = crearAdmin();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/users', datosDocenteValidos(['tipo_usuario' => '']));

    $response->assertStatus(422)->assertJsonValidationErrors('tipo_usuario');
})->group('grupo1');

// --- Seguridad / RBAC / contraseñas (TC-HU1-19, 23, 24) ---

it('TC-HU1-19: rechaza en backend el registro de usuarios ejecutado por un Docente (solo Admin puede)', function () {
    $docente = Docente::factory()->create();

    // StoreUserRequest::authorize() exige `$this->user() instanceof Admin`.
    $response = $this->actingAs($docente, 'sanctum')->postJson('/api/users', datosDocenteValidos());

    $response->assertStatus(403);
})->group('grupo1');

it('TC-HU1-23: almacena la contraseña cifrada, nunca en texto plano', function () {
    $admin = crearAdmin();

    $this->actingAs($admin, 'sanctum')->postJson('/api/users', datosDocenteValidos([
        'email' => 'docente.hash@est.umss.edu', // dominio que el regex sí acepta hoy
    ]))->assertCreated();

    $docente = Docente::where('ci', '8451231')->first();
    expect($docente)->not->toBeNull();
    expect($docente->password)->not->toBe('Test#2026');
    expect(Hash::check('Test#2026', $docente->password))->toBeTrue();
})->group('grupo1');

it('TC-HU1-24: valida el rol en cada petición al backend (no solo en la primera)', function () {
    $auxiliar = Auxiliar::factory()->create();

    // UpdateUserRequest/destroy exigen Admin; probamos dos peticiones consecutivas distintas.
    $this->actingAs($auxiliar, 'sanctum')->putJson('/api/users/' . (string) \Illuminate\Support\Str::uuid(), ['nombre' => 'X'])
        ->assertStatus(403);
    $this->actingAs($auxiliar, 'sanctum')->deleteJson('/api/users/' . (string) \Illuminate\Support\Str::uuid())
        ->assertStatus(403);
})->group('grupo1');

// --- Unicidad a nivel de base de datos (TC-HU1-21, TC-HU1-22) ---

it('TC-HU1-21: el CI es UNIQUE a nivel de base de datos', function () {
    // GAP CONFIRMADO (schema dump): no existe UNIQUE sobre admin.ci / docente.ci / auxiliar.ci;
    // la unicidad hoy solo vive en el closure de StoreUserRequest. Este test afirma el
    // comportamiento acordado, por eso FALLA hasta que el equipo agregue el constraint.
    // (Un UNIQUE por tabla cubre la unicidad dentro de la tabla, no entre las 3 tablas.)
    crearAdmin(['ci' => '8451231']);

    expect(fn () => DB::transaction(fn () => Admin::factory()->create(['ci' => '8451231'])))
        ->toThrow(\Illuminate\Database\QueryException::class);
})->group('grupo1');

it('TC-HU1-22: el correo de Docente/Auxiliar es UNIQUE a nivel de base de datos', function () {
    Docente::factory()->create(['email' => 'jperez001@fcyt.umss.edu.bo']);

    expect(fn () => Docente::factory()->create(['email' => 'jperez001@fcyt.umss.edu.bo']))
        ->toThrow(\Illuminate\Database\QueryException::class);
})->group('grupo1');
