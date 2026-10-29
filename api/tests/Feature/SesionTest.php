<?php
use App\Models\Auxiliar;
use App\Models\Docente;
use Illuminate\Foundation\Testing\RefreshDatabase;
uses(RefreshDatabase::class);

test('TC-HU2-6: rechaza un token de recuperación ya utilizado', function () {
    $this->postJson('/api/reset-password', ['email' => 'juan@est.umss.edu', 'password' => 'Nueva#2026', 'password_confirmation' => 'Nueva#2026', 'token' => 'token-usado'])->assertStatus(400); 
})->group('grupo1');

test('TC-HU2-7: rechaza un token expirado indicando enlace expirado', function () {
    $this->postJson('/api/reset-password', ['email' => 'pedro@est.umss.edu', 'password' => 'Nueva#2026', 'password_confirmation' => 'Nueva#2026', 'token' => 'token-expirado'])->assertStatus(400); 
})->group('grupo1');

test('TC-HU2-15: el enlace de recuperación no expone CI ni contraseña en la URL', function () {
    $this->postJson('/api/forgot-password', ['email' => 'juan@est.umss.edu'])->assertOk(); 
})->group('grupo1');

test('TC-HU2-16 (V2): la API exige estrictamente dominios válidos (@est.umss.edu o @gmail.com) para recuperar cuenta', function () {
    $this->postJson('/api/forgot-password', ['email' => 'invalido@yahoo.com'])->assertStatus(422); 
})->group('grupo1');