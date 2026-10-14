<?php

use Illuminate\Support\Facades\Route;

// Ruta raíz para verificación de estado y salud del backend (Health Check)
Route::get('/', function () {
    return response()->json([
        'status'  => 'online',
        'service' => 'SCIEM Backend API',
    ]);
});

// Rutas auxiliares de prueba para vistas Blade
Route::get('/test-login', function () {
    return view('test_auth');
});

Route::get('/reset-password', function () {
    return view('test-reset');
});