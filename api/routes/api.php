<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Cache;
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
use App\Http\Controllers\ConfiguracionSistemaController;
use App\Http\Controllers\IntentoNoAutorizadoController;
use App\Http\Controllers\AuxiliarModuloController;
use App\Http\Controllers\ExpulsionController;
use App\Http\Controllers\MonitoreoController;
use App\Http\Controllers\ReporteEstadisticoController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AuxiliarOfflineController;
use App\Models\Admin;
use App\Models\Docente;
use App\Models\Auxiliar;
use Illuminate\Support\Facades\Artisan;
use App\Http\Controllers\NoticiaController;

// --- RUTAS PÚBLICAS ---
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLink']);
Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword']);
Route::get('noticias', [NoticiaController::class, 'index']);

// Comprobación ligera de conectividad para el temporizador de sesión.
// No revela información interna ni requiere autenticación.
Route::get('health', fn () => response()->noContent());

Route::get('examenes', [ExamenController::class, 'index']);


Route::get('/seed-render-now', function () {
    Artisan::call('db:seed', ['--force' => true]);
    return response()->json([
        'output'         => Artisan::output(),
        'total_docentes' => \App\Models\Docente::count(),
        'docente'        => \App\Models\Docente::first(),
    ]);
});

// --- RUTAS PROTEGIDAS (Sanctum) ---
Route::middleware('auth:sanctum')->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index']);
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

    // Endpoint de roles estático para selectores
    Route::get('roles', function () {
        return response()->json([
            ['id' => 'admin', 'nombre' => 'Administrador'],
            ['id' => 'docente', 'nombre' => 'Docente'],
            ['id' => 'auxiliar', 'nombre' => 'Auxiliar'],
        ]);
    });

    // Catálogo directo y compatible con PostgreSQL nativo
    Route::middleware('role:admin,administrador,docente')->get('docentes', function () {
        $docentes = Cache::remember('catalogo_docentes_activos', 600, function () {
            return \Illuminate\Support\Facades\DB::table('docente')
                ->whereRaw('activo is true')
                ->orderBy('nombre', 'asc')
                ->select(['id', 'nombre', 'apellido_paterno', 'apellido_materno'])
                ->get();
        });

        return response()->json($docentes);
    });

    // --- ADMINISTRACIÓN ---
    Route::middleware('role:admin,administrador')->group(function () {
        Route::get('dashboard/stats', function () {
            $totalUsuarios = \App\Models\Admin::count() 
                           + \App\Models\Docente::count() 
                           + \App\Models\Auxiliar::count();

            $totalAulasDisponibles = \App\Models\Aula::where('estado', 'Disponible')->count();
            $totalExamenesActivos  = \App\Models\Examen::where('estado', 'Programado')->count();
            $totalEstudiantes      = \App\Models\Estudiante::count();

            return response()->json([
                'users'    => $totalUsuarios,
                'rooms'    => $totalAulasDisponibles,
                'exams'    => $totalExamenesActivos,
                'students' => $totalEstudiantes,
            ]);
        });

        Route::apiResource('users', UserController::class);
        Route::get('auditoria', [AuditoriaController::class, 'index']);

        // Parámetro de inactividad de sesión
        Route::get('configuracion/inactividad', [ConfiguracionSistemaController::class, 'getTiempoInactividad']);
        Route::put('configuracion/inactividad', [ConfiguracionSistemaController::class, 'updateTiempoInactividad']);
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

    Route::middleware('role:admin,administrador,docente,auxiliar')->group(function () {
        Route::get('mis-examenes', [ExamenController::class, 'misExamenes']);
        Route::get('examenes/{id}', [ExamenController::class, 'show']);
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
        Route::get('estudiantes/buscar', [EstudianteController::class, 'buscar']);
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
        Route::get('examenes/{examen}/estudiantes', [HabilitacionExamenController::class, 'index']);
        Route::get('examenes/{examen}/prerrequisitos', [PrerrequisitoController::class, 'index']);
        Route::get('examenes/{examen}/estudiantes/{estudiante}/motivo', [HabilitacionExamenController::class, 'motivoInhabilitacion']);
    });

    Route::middleware('role:admin,administrador,docente')->group(function () {
        Route::post('examenes/{examen}/prerrequisitos', [PrerrequisitoController::class, 'store']);
        Route::patch('prerrequisitos/{prerrequisito}/estudiantes/{estudiante}', [PrerrequisitoController::class, 'toggleCumplimiento']);
        Route::patch('examenes/{examen}/estudiantes/{estudiante}/habilitacion', [HabilitacionExamenController::class, 'update']);
        Route::get('examenes/{examen}/estudiantes/{estudiante}/prerrequisitos', [PrerrequisitoController::class, 'prerrequisitosPorEstudiante']);
    });

    // --- HU 10: ESCANEO QR Y CONTROL DE ACCESO ---
    Route::middleware('role:admin,administrador,docente,auxiliar')->group(function () {
        Route::post('examenes/{id}/verificar-ingreso', [VerificacionController::class, 'verificarIngreso']);
    });

    // --- HU 15: REGISTRO Y CONSULTA DE EXPULSIONES ---
    Route::middleware('role:admin,administrador,docente,auxiliar')->group(function () {
        Route::get(
            'examenes/{id}/expulsiones',
            [ExpulsionController::class, 'index']
        );

        Route::post(
            'examenes/{id}/expulsiones',
            [ExpulsionController::class, 'store']
        );
        Route::patch(
            'examenes/{id}/expulsiones/{expulsionId}',
            [ExpulsionController::class, 'updateMotivo']
        );
    });

    Route::middleware('role:admin,administrador,docente,auxiliar')->group(function () {
        Route::post('/examenes/{id}/registro-manual', [VerificacionController::class, 'registrarIngresoManual']);
});

    Route::middleware('role:admin,administrador,docente')->group(function () {
        Route::get('/examenes/{id}/asistencias', [VerificacionController::class, 'listarAsistencias']);
    });
    // HU 13: REGISTRO Y CONSULTA DE INTENTOS NO CORRESPONDIENTES 
    Route::middleware('role:admin,administrador,docente,auxiliar')->group(function () {
        Route::get('examenes/{id_examen}/intentos-no-autorizados', [IntentoNoAutorizadoController::class, 'index']);
        Route::post('examenes/{id_examen}/escanear-ingreso', [VerificacionController::class, 'verificarIngreso']);
    });

    // MONITOREO EN TIEMPO REAL (HU16) 
    Route::middleware('role:admin,administrador,docente')
        ->get('examenes/{idExamen}/monitoreo', [MonitoreoController::class, 'resumen']);
    Route::middleware('role:admin,administrador,docente')
    ->get('examenes/{idExamen}/monitoreo/estudiantes', [MonitoreoController::class, 'estudiantes']);

    // HU 17: REPORTES ESTADÍSTICOS
    Route::middleware('role:admin,administrador,docente')
    ->get(
        'examenes/{idExamen}/reportes/estadisticas',
        [ReporteEstadisticoController::class, 'resumen']
    );

    Route::middleware('role:admin,administrador,docente')
    ->get(
        'examenes/{idExamen}/reportes/estadisticas/franjas-horarias',
        [ReporteEstadisticoController::class, 'franjasHorarias']
    );
    Route::middleware('role:admin,administrador,docente')
    ->get(
        'examenes/{idExamen}/reportes/estadisticas/descargar',
        [ReporteEstadisticoController::class, 'descargar']
    );


    // HU 18: MODULO DE ESTUDIANTES
    Route::middleware('role:estudiante')->prefix('estudiante')->group(function () {
        // Completar o cambiar CI
        Route::match(['post', 'patch'], '/completar-datos', [EstudianteController::class, 'completarDatos']);
        
        // Subir foto facial a laravel
        Route::post('/foto', [EstudianteController::class, 'subirFoto']);
        
        // Consultar exámenes inscritos y estado de habilitación
        Route::get('/mis-examenes', [EstudianteController::class, 'misExamenes']);
        
        // Generar token QR dinámico para un examen específico
        Route::post('/examenes/{idExamen}/qr-token', [EstudianteController::class, 'generarTokenQr']);

        // cambio de contraseña
        Route::put('/cambiar-password', [EstudianteController::class, 'cambiarPassword']);
    });

    //HU 19: GESTIÓN DE AUXILIARES
    Route::middleware('role:auxiliar')->prefix('auxiliar')->group(function () {
        Route::get('/mis-examenes', [AuxiliarModuloController::class, 'misExamenesAsignados']);
    });

    Route::middleware('role:admin,administrador,docente')->group(function () {
        Route::post('examenes/{id_examen}/auxiliares', [AuxiliarModuloController::class, 'invitarAuxiliar']);
        Route::get('examenes/{id_examen}/auxiliares', [AuxiliarModuloController::class, 'listarAuxiliaresExamen']);
        Route::delete('examenes/{id_examen}/auxiliares/{id_auxiliar}', [AuxiliarModuloController::class, 'desvincularAuxiliar']);
    });

    // todos tienen acceso a ver la foto del estudiante, pero solo el propio estudiante puede subirla
    Route::middleware('role:admin,administrador,docente,auxiliar,estudiante')->group(function () {
        Route::get('estudiante/foto/{idEstudiante}', [EstudianteController::class, 'verFoto']);
    });

    // modod offline
    Route::middleware('role:admin,administrador,docente,auxiliar')->group(function () {
        // Descargar padrón para la base de datos local del móvil
        Route::get('/examenes/{id}/descargar-padron', [AuxiliarOfflineController::class, 'descargarPadron']);

        // Subir lote de escaneos acumulados offline
        Route::post('/examenes/{id}/sincronizar-asistencias', [AuxiliarOfflineController::class, 'sincronizarAsistencias']);
    });

    // --- HU 14: NOTICIAS OPERATIVAS ---
    Route::middleware('role:admin,administrador,docente,auxiliar,estudiante')->group(function () {
        Route::get('noticias/internas', [NoticiaController::class, 'index']); 
    });

    Route::middleware('role:admin,administrador,docente')->group(function () {
        Route::post('noticias', [NoticiaController::class, 'store']);
        Route::put('noticias/{id}', [NoticiaController::class, 'update']);
        Route::delete('noticias/{id}', [NoticiaController::class, 'destroy']);
    });
});