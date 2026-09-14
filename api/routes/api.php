<?php

use Illuminate\Http\Request;
use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ForgotPasswordController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\AulaController;
use App\Http\Controllers\ExamenController;
use App\Http\Controllers\MateriaController;


// Rutas públicas
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLink']);
Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword']);

// Rutas protegidas (requieren token Bearer)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    
    Route::get('/me', function (Request $request) {
        $user = $request->user();

        $rol = match (get_class($user)) {
            Admin::class    => 'admin',
            Docente::class  => 'docente',
            Auxiliar::class => 'auxiliar',
            default         => null,
        };

        return response()->json([
            'id'               => $user->id,
            'ci'               => $user->ci,
            'ci_extension'     => $user->ci_extension,
            'nombre'           => $user->nombre,
            'apellido_paterno' => $user->apellido_paterno,
            'apellido_materno' => $user->apellido_materno,
            'email'            => $user->email ?? null,
            'rol'              => $rol,
            'activo'           => $user->activo,
            'ultimo_acceso'    => $user->ultimo_acceso,
        ]);
    });

    Route::middleware('role:admin,administrador')->group(function () {
        Route::apiResource('users', UserController::class);

        Route::get('roles', function () {
            return response()->json([
                ['id' => 'admin', 'nombre' => 'Administrador'],
                ['id' => 'docente', 'nombre' => 'Docente'],
                ['id' => 'auxiliar', 'nombre' => 'Auxiliar'],
            ]);
        });
    });

    // Lectura de aulas (admin, docente, auxiliar)
    Route::middleware('role:admin,administrador,docente,auxiliar')->group(function () {
        Route::get('aulas', [AulaController::class, 'index']);
        Route::get('aulas/{id}', [AulaController::class, 'show']);
    });

    // Modificación de aulas (admin y docente)
    Route::middleware('role:admin,administrador,docente')->group(function () {
        Route::post('aulas', [AulaController::class, 'store']);
        Route::put('aulas/{id}', [AulaController::class, 'update']);
        Route::delete('aulas/{id}', [AulaController::class, 'destroy']);
    });

    // Lectura de exámenes (admin, docente y auxiliar)
    Route::middleware('role:admin,administrador,docente,auxiliar')->group(function () {
        Route::get('examenes', [ExamenController::class, 'index']);
        Route::get('examenes/{id}', [ExamenController::class, 'show']);
    });

    // Escritura de exámenes (solo admin y docente)
    Route::middleware('role:admin,administrador,docente')->group(function () {
        Route::post('examenes', [ExamenController::class, 'store']);
        Route::put('examenes/{id}', [ExamenController::class, 'update']);
        Route::delete('examenes/{id}', [ExamenController::class, 'destroy']);
    });

    // Lectura de materias (admin, docente, auxiliar)
    Route::middleware('role:admin,administrador,docente,auxiliar')->group(function () {
        Route::get('materias', [MateriaController::class, 'index']);
        Route::get('materias/{id}', [MateriaController::class, 'show']);
    });

    // Escritura de materias (admin y docente)
    Route::middleware('role:admin,administrador,docente')->group(function () {
        Route::post('materias', [MateriaController::class, 'store']);
        Route::put('materias/{id}', [MateriaController::class, 'update']);
        Route::delete('materias/{id}', [MateriaController::class, 'destroy']);
    });

});
