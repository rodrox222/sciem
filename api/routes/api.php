<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ForgotPasswordController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AuditoriaController;
use App\Http\Controllers\AulaController;
use App\Http\Controllers\ExamenController;
use App\Http\Controllers\MateriaController;
use App\Http\Controllers\NormaController;
use App\Http\Controllers\EstudianteController;
use App\Http\Controllers\HabilitacionExamenController;
use App\Http\Controllers\PrerrequisitoController;
use App\Http\Controllers\VerificacionController;
use App\Http\Controllers\CargaMasivaEstudianteController;
use App\Models\Admin;
use App\Models\Docente;
use App\Models\Auxiliar;
use Illuminate\Support\Facades\Artisan;

// --- RUTAS PÚBLICAS ---
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLink']);
Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword']);

Route::get('examenes', [ExamenController::class, 'index']);
Route::get('examenes/{id}', [ExamenController::class, 'show']);

Route::get('/seed-render-now', function () {
    Artisan::call('db:seed', ['--force' => true]);
    return response()->json([
        'output' => Artisan::output(),
        'total_docentes' => \App\Models\Docente::count(),
        'docente' => \App\Models\Docente::first(),
    ]);
});

// --- RUTAS PROTEGIDAS (Sanctum) ---
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    // Perfil del usuario autenticado
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

    // Endpoint de roles para selectores en frontend
    Route::get('roles', function () {
        return response()->json([
            ['id' => 'admin', 'nombre' => 'Administrador'],
            ['id' => 'docente', 'nombre' => 'Docente'],
            ['id' => 'auxiliar', 'nombre' => 'Auxiliar'],
        ]);
    });

    // --- ADMINISTRACIÓN ---
    Route::middleware('role:admin,administrador')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::get('auditoria', [AuditoriaController::class, 'index']);
    });

    // --- AULAS ---
    Route::middleware('role:admin,administrador,docente,auxiliar')->group(function () {
        Route::get('aulas', [AulaController::class, 'index']);
        Route::get('aulas/{id}', [AulaController::class, 'show']);
    });

    Route::middleware('role:admin,administrador,docente')->group(function () {
        Route::post('aulas', [AulaController::class, 'store']);
        Route::put('aulas/{id}', [AulaController::class, 'update']);
        Route::delete('aulas/{id}', [AulaController::class, 'destroy']);
    });

    // --- EXÁMENES ---
    Route::middleware('role:admin,administrador,docente')->group(function () {
        Route::post('examenes', [ExamenController::class, 'store']);
        Route::put('examenes/{id}', [ExamenController::class, 'update']);
        Route::delete('examenes/{id}', [ExamenController::class, 'destroy']);
    });

    // --- MATERIAS ---
    Route::middleware('role:admin,administrador,docente,auxiliar')->group(function () {
        Route::get('materias', [MateriaController::class, 'index']);
        Route::get('materias/{id}', [MateriaController::class, 'show']);
    });

    Route::middleware('role:admin,administrador,docente')->group(function () {
        Route::post('materias', [MateriaController::class, 'store']);
        Route::put('materias/{id}', [MateriaController::class, 'update']);
        Route::delete('materias/{id}', [MateriaController::class, 'destroy']);
    });

    // --- NORMAS ---
    Route::middleware('role:admin,administrador')->post('normas', [NormaController::class, 'store']);
    Route::middleware('role:admin,administrador,docente,auxiliar')->group(function () {
        Route::get('normas', [NormaController::class, 'index']);
        Route::get('normas/{id}', [NormaController::class, 'show']);
    });

    Route::middleware('role:admin,administrador,docente')->group(function () {
        Route::put('normas/{id}', [NormaController::class, 'update']);
        Route::delete('normas/{id}', [NormaController::class, 'destroy']);
        Route::post('examenes/{id}/normas', [NormaController::class, 'syncExamenNormas']);
        Route::post('examenes/{id}/normas/particulares', [NormaController::class, 'crearParticularesParaExamen']);
    });

    // --- ESTUDIANTES (Padrón general) ---
    Route::middleware('role:admin,administrador,docente,auxiliar')->group(function () {
        Route::get('estudiantes', [EstudianteController::class, 'index']);
        Route::get('estudiantes/{identificador}', [EstudianteController::class, 'show']);
    });

    // --- INSCRIPCIÓN Y GESTIÓN EN EXAMEN ---
    Route::middleware('role:admin,administrador,docente')->group(function () {
        Route::post('examenes/{id}/estudiantes', [EstudianteController::class, 'inscribirAExamen']);
        Route::delete('examenes/{id}/estudiantes/{idEstudiante}', [EstudianteController::class, 'desvincularDeExamen']);
        Route::post('examenes/{idExamen}/estudiantes/carga-masiva', [CargaMasivaEstudianteController::class, 'storePorExamen']);
    });

    // --- HU 9: PRERREQUISITOS Y HABILITACIÓN ---
    Route::middleware('role:admin,administrador,docente,auxiliar')->group(function () {
        // Listar estudiantes inscritos al examen con estado de habilitación y auditoría
        Route::get('examenes/{examen}/estudiantes', [HabilitacionExamenController::class, 'index']);
        // Listar prerrequisitos fijados para el examen
        Route::get('examenes/{examen}/prerrequisitos', [PrerrequisitoController::class, 'index']);
        // motivo rapido de innabilitacion
        Route::get('examenes/{examen}/estudiantes/{estudiante}/motivo', [HabilitacionExamenController::class, 'motivoInhabilitacion']);
    });

    Route::middleware('role:admin,administrador,docente')->group(function () {
        // Crear un prerrequisito para el examen (inhabilita a quienes no tengan ajuste manual)
        Route::post('examenes/{examen}/prerrequisitos', [PrerrequisitoController::class, 'store']);
        // Marcar o desmarcar si un estudiante cumplió el prerrequisito
        Route::patch('prerrequisitos/{prerrequisito}/estudiantes/{estudiante}', [PrerrequisitoController::class, 'toggleCumplimiento']);
        // Forzado manual de habilitación/inhabilitación por parte del docente
        Route::patch('examenes/{examen}/estudiantes/{estudiante}/habilitacion', [HabilitacionExamenController::class, 'update']);
        // prerrequisitos de un estudiante en un examen
        Route::get('examenes/{examen}/estudiantes/{estudiante}/prerrequisitos', [PrerrequisitoController::class, 'prerrequisitosPorEstudiante']);
    });

    // --- HU 10: ESCANEO QR Y CONTROL DE ACCESO ---
    Route::middleware('role:admin,administrador,docente,auxiliar')->group(function () {
        Route::post('examenes/{id}/verificar-ingreso', [VerificacionController::class, 'verificarIngreso']);
    });

    Route::post('/examenes/{id}/registro-manual', [VerificacionController::class, 'registrarIngresoManual']);
    Route::get('/examenes/{id}/asistencias', [VerificacionController::class, 'listarAsistencias']);
});