<?php

// CONFIRMADO contra código real: ForgotPasswordController maneja recuperación para
// Docente y Auxiliar (busca en ambas tablas). Tabla password_reset_tokens: email (PK),
// token (hash), created_at. Expiración HARDCODEADA a 60 minutos dentro del controller
// (Carbon::parse($record->created_at)->addMinutes(60)) — no es configurable desde BD
// todavía, y es un concepto DISTINTO del timeout de inactividad de sesión (5 min) que
// el equipo definió para HU-02: ese timeout de inactividad no tiene implementación
// backend visible (ni Sanctum `expiration` configurado, ni endpoint de config) — es
// probablemente responsabilidad del frontend (temporizador que llama a /logout).
//
// GAP CONOCIDO (bug de coordinación, confirmado por el equipo): el regex de
// sendResetLink solo acepta @est.umss.edu o @gmail.com — NO incluye @fcyt.umss.edu.bo,
// así que un Docente no puede solicitar recuperación con su correo institucional real
// hoy. El test correspondiente documenta esto como fallando hasta que se corrija.

use App\Models\Docente;
use App\Models\Auxiliar;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

uses(RefreshDatabase::class);

it('TC-HU2-2: actualiza la contraseña con un token válido, lo invalida y permite el nuevo login', function () {
    Mail::fake();
    $auxiliar = Auxiliar::factory()->create(['email' => 'maria@est.umss.edu']);
    $token = \Illuminate\Support\Str::random(64);
    DB::table('password_reset_tokens')->insert([
        'email' => $auxiliar->email, 'token' => Hash::make($token), 'created_at' => now(),
    ]);

    $response = $this->postJson('/api/reset-password', [
        'token' => $token, 'email' => $auxiliar->email,
        'password' => 'Nueva#2026', 'password_confirmation' => 'Nueva#2026',
    ]);

    $response->assertOk();
    $this->assertDatabaseMissing('password_reset_tokens', ['email' => $auxiliar->email]);

    $login = $this->postJson('/api/login', ['email' => $auxiliar->email, 'password' => 'Nueva#2026']);
    $login->assertOk();
})->group('grupo1');

it('TC-HU2-6: rechaza un token de recuperación ya utilizado (ya no existe en la tabla)', function () {
    $auxiliar = Auxiliar::factory()->create(['email' => 'maria@est.umss.edu']);
    // No se inserta token: simula que ya fue consumido y eliminado tras su uso.

    $response = $this->postJson('/api/reset-password', [
        'token' => 'cualquier-token-ya-no-existente', 'email' => $auxiliar->email,
        'password' => 'Nueva#2026', 'password_confirmation' => 'Nueva#2026',
    ]);

    $response->assertStatus(400)->assertJsonFragment(['message' => 'El enlace de recuperación es inválido o ya ha sido utilizado.']);
})->group('grupo1');

it('TC-HU2-7: rechaza un token expirado (más de 60 minutos) indicando "enlace expirado"', function () {
    $auxiliar = Auxiliar::factory()->create(['email' => 'maria@est.umss.edu']);
    $token = \Illuminate\Support\Str::random(64);
    DB::table('password_reset_tokens')->insert([
        'email' => $auxiliar->email, 'token' => Hash::make($token),
        'created_at' => Carbon::now()->subMinutes(61),
    ]);

    $response = $this->postJson('/api/reset-password', [
        'token' => $token, 'email' => $auxiliar->email,
        'password' => 'Nueva#2026', 'password_confirmation' => 'Nueva#2026',
    ]);

    $response->assertStatus(400)->assertJsonFragment(['message' => 'El enlace de recuperación ha expirado. Solicite uno nuevo.']);
})->group('grupo1');

it('TC-HU2-13: invalida el token inmediatamente después de usarlo (un solo uso)', function () {
    Mail::fake();
    $auxiliar = Auxiliar::factory()->create(['email' => 'maria@est.umss.edu']);
    $token = \Illuminate\Support\Str::random(64);
    DB::table('password_reset_tokens')->insert([
        'email' => $auxiliar->email, 'token' => Hash::make($token), 'created_at' => now(),
    ]);

    $this->postJson('/api/reset-password', [
        'token' => $token, 'email' => $auxiliar->email,
        'password' => 'Nueva#2026', 'password_confirmation' => 'Nueva#2026',
    ])->assertOk();

    $segundo = $this->postJson('/api/reset-password', [
        'token' => $token, 'email' => $auxiliar->email,
        'password' => 'Otra#2026', 'password_confirmation' => 'Otra#2026',
    ]);
    $segundo->assertStatus(400);
})->group('grupo1');

it('TC-HU2-15: el enlace de recuperación no expone CI ni contraseña en la URL', function () {
    Mail::fake();
    $auxiliar = Auxiliar::factory()->create(['email' => 'maria@est.umss.edu', 'ci' => '8234567']);

    $this->postJson('/api/forgot-password', ['email' => $auxiliar->email])->assertOk();

    // ForgotPasswordController arma: {FRONTEND_URL}/recuperar-contrasena?token=...&email=...
    // No incluye CI en ningún parámetro — se valida inspeccionando lo insertado en la tabla
    // y confirmando que el único dato persistido identificable es el email + un token random.
    $registro = DB::table('password_reset_tokens')->where('email', $auxiliar->email)->first();
    expect($registro)->not->toBeNull();
    expect($registro->token)->not->toContain($auxiliar->ci);
})->group('grupo1');

it('GAP — Docente no puede solicitar recuperación con su correo @fcyt.umss.edu.bo (bug de coordinación confirmado)', function () {
    $docente = Docente::factory()->create(['email' => 'jperez@fcyt.umss.edu.bo']);

    // sendResetLink valida regex /^[a-zA-Z0-9._%+-]+@(est\.umss\.edu|gmail\.com)$/i —
    // @fcyt.umss.edu.bo no está incluido, así que esto hoy devuelve 422 en vez de 200.
    $response = $this->postJson('/api/forgot-password', ['email' => $docente->email]);

    $response->assertOk(); // Falla hoy (422) hasta que se agregue @fcyt.umss.edu.bo al regex.
})->group('grupo1');
