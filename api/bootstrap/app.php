<?php

use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->web(append: [
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (QueryException|\PDOException $e, Request $request) {
            // Si está en local o con debug activado, mostrar el error real para no quedar a ciegas
            if (config('app.debug')) {
                return null;
            }

            if ($request->is('api/*') || $request->expectsJson()) {
                $origin = $request->header('Origin', 'https://sciem-five.vercel.app');
                return response()->json([
                    'status'  => 'error',
                    'message' => 'El servicio de base de datos no se encuentra disponible temporalmente. Intente más tarde.',
                ], 503)->withHeaders([
                    'Access-Control-Allow-Origin'      => $origin,
                    'Access-Control-Allow-Credentials' => 'true',
                ]);
            }
        });
    })->create();