<?php

use Illuminate\Support\Facades\Route;

$resolveSpaIndex = static function (): ?string {
    $candidates = [
        public_path('index.html'),
        dirname(base_path()) . DIRECTORY_SEPARATOR . 'public_html' . DIRECTORY_SEPARATOR . 'index.html',
        !empty($_SERVER['DOCUMENT_ROOT']) ? rtrim($_SERVER['DOCUMENT_ROOT'], '/\\') . DIRECTORY_SEPARATOR . 'index.html' : null,
    ];

    foreach ($candidates as $path) {
        if ($path && is_file($path)) {
            return $path;
        }
    }

    return null;
};

// Ruta raíz: sirve el frontend compilado si existe index.html, o el Health Check de la API
Route::get('/', function () use ($resolveSpaIndex) {
    if ($indexHtml = $resolveSpaIndex()) {
        return response(file_get_contents($indexHtml), 200)
            ->header('Content-Type', 'text/html; charset=UTF-8');
    }

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


Route::fallback(function () use ($resolveSpaIndex) {
    if (request()->is('api/*')) {
        return response()->json(['message' => 'Ruta de API no encontrada.'], 404);
    }

    if ($indexHtml = $resolveSpaIndex()) {
        return response(file_get_contents($indexHtml), 200)
            ->header('Content-Type', 'text/html; charset=UTF-8');
    }

    abort(404);
});