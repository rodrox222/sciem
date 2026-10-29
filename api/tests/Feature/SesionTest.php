<?php

use App\Models\Auxiliar;
use App\Models\Docente;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

it('TC-HU2-6: rechaza un token de recuperación ya utilizado', function () {
    $auxiliar = Auxiliar::factory()->create(['email' => 'maria@est.umss.edu']);
    
    $response = $this->postJson('/api/reset-password', [
        'email' => $auxiliar->email,
        'password' => 'Nueva#2026',
        'password_confirmation' => 'Nueva#2026',
        'token' => 'token-usado-123' // No existe en BD
    ]);

    $response->assertStatus(422);
})->group('grupo1');

it('TC-HU2-7: rechaza un token expirado indicando enlace expirado', function () {
    $auxiliar = Auxiliar::factory()->create(['email' => 'pedro@est.umss.edu']);
    
    DB::table('password_reset_tokens')->insert([
        'email' => $auxiliar->email,
        'token' => 'token-expirado-123',
        'created_at' => now()->subMinutes(61) // Vencido
    ]);

    $response = $this->postJson('/api/reset-password', [
        'email' => $auxiliar->email,
        'password' => 'Nueva#2026',
        'password_confirmation' => 'Nueva#2026',
        'token' => 'token-expirado-123'
    ]);

    $response->assertStatus(422);
})->group('grupo1');

it('TC-HU2-15: el enlace de recuperación no expone CI ni contraseña en la URL', function () {
    $docente = Docente::factory()->create(['email' => 'juan@est.umss.edu']);
    
    $response = $this->postJson('/api/forgot-password', ['email' => $docente->email]);
    $response->assertOk();
    
    $tokenRow = DB::table('password_reset_tokens')->where('email', $docente->email)->first();
    expect($tokenRow->token)->not->toContain($docente->ci);
})->group('grupo1');

it('TC-HU2-16 (V2): la API exige estrictamente dominios válidos (@est.umss.edu o @gmail.com) para recuperar cuenta', function () {
    // En V2 el equipo de desarrollo confirmó por seguridad que @fcyt no está en el regex.
    $docente = Docente::factory()->create(['email' => 'jorge@fcyt.umss.edu.bo']);
    
    $response = $this->postJson('/api/forgot-password', ['email' => $docente->email]);
    
    // Verificamos que se aplique la regla del Request
    $response->assertStatus(422)
        ->assertJsonValidationErrors('email')
        ->assertJsonFragment(['message' => 'Solo se permiten correos validos.']);
})->group('grupo1');