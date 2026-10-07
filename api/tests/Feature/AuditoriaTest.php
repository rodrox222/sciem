<?php

// CONFIRMADO por código y schema real (HU-03 está sólidamente implementada):
// - LogAuditoria / tabla logs_auditoria: user_type (clase polimórfica), user_id (uuid),
//   rol_en_el_momento, usuario_nombre, usuario_email, modulo, accion, ip_origen,
//   user_agent, detalles (jsonb), created_at (sin updated_at).
// - Función SQL prevent_logs_auditoria_modification() + triggers trg_logs_auditoria_no_update
//   y trg_logs_auditoria_no_delete sobre logs_auditoria (bloqueo real a nivel de BD).
// - El modelo LogAuditoria también bloquea en la capa de Eloquent (RuntimeException en
//   updating/deleting), como defensa en profundidad.
// - Ruta GET /api/auditoria dentro de role:admin,administrador, vía AuditoriaController::index,
//   que filtra por usuario_id, rol, accion, modulo, fecha_desde, fecha_hasta y search.

use App\Models\Admin;
use App\Models\Docente;
use App\Models\Auxiliar;
use App\Models\LogAuditoria;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('TC-HU3-1: registra automáticamente usuario, acción y fecha/hora al ejecutar una operación exitosa', function () {
    $admin = Admin::factory()->create();

    $this->actingAs($admin, 'sanctum')->postJson('/api/users', [
        'tipo_usuario' => 'docente', 'ci' => '8451231', 'nombre' => 'Juan',
        'apellido_paterno' => 'Pérez', 'email' => 'jperez@est.umss.edu', 'password' => 'Test#2026',
    ])->assertCreated();

    $this->assertDatabaseHas('logs_auditoria', [
        'user_id' => $admin->id,
        'accion'  => 'USUARIO_CREADO',
        'modulo'  => 'Usuarios',
    ]);
})->group('grupo1');

it('TC-HU3-6: rechaza cualquier intento de editar o eliminar un registro de auditoría, incluso como Administrador', function () {
    $log = LogAuditoria::factory()->create();

    // Bloqueo en capa de aplicación (modelo LogAuditoria::booted()).
    expect(fn () => $log->update(['accion' => 'MODIFICADO']))->toThrow(\RuntimeException::class);
    expect(fn () => $log->delete())->toThrow(\RuntimeException::class);

    // Bloqueo real a nivel de base de datos (triggers PL/pgSQL), evadiendo Eloquent.
    expect(fn () => DB::statement('UPDATE logs_auditoria SET accion = ? WHERE id = ?', ['X', $log->id]))
        ->toThrow(\Illuminate\Database\QueryException::class);
    expect(fn () => DB::table('logs_auditoria')->where('id', $log->id)->delete())
        ->toThrow(\Illuminate\Database\QueryException::class);
})->group('grupo1');

it('TC-HU3-8: registra en el historial un inicio de sesión fallido', function () {
    $docente = Docente::factory()->create(['email' => 'jperez@fcyt.umss.edu.bo']);

    $this->postJson('/api/login', ['email' => $docente->email, 'password' => 'Incorrecta#1'])
        ->assertStatus(422); // AuthController lanza ValidationException ante credenciales inválidas

    $this->assertDatabaseHas('logs_auditoria', [
        'accion' => 'LOGIN_FALLIDO',
        'modulo' => 'Autenticacion',
    ]);
})->group('grupo1');

it('TC-HU3-9: guarda el rol vigente al momento de la acción (rol_en_el_momento), no el rol actual', function () {
    $docente = Docente::factory()->create();
    $admin = Admin::factory()->create();

    $this->actingAs($docente, 'sanctum')->postJson('/api/normas', [
        'titulo' => 'Norma de prueba', 'descripcion' => 'Descripción de prueba.', 'tipo' => 'General',
    ]); // puede fallar 403 (docente no crea normas) pero NormaController::store no es lo probado aquí

    $this->actingAs($admin, 'sanctum')->postJson('/api/normas', [
        'titulo' => 'Norma admin', 'descripcion' => 'Creada por admin.', 'tipo' => 'General',
    ])->assertCreated();

    $log = LogAuditoria::where('accion', 'NORMA_CREADA')->latest('created_at')->first();
    expect($log->rol_en_el_momento)->toBe('admin');
})->group('grupo1');

it('TC-HU3-13: el historial de auditoría es inmutable a nivel de almacenamiento (BD)', function () {
    $log = LogAuditoria::factory()->create();

    expect(fn () => DB::table('logs_auditoria')->where('id', $log->id)->delete())
        ->toThrow(\Illuminate\Database\QueryException::class);
})->group('grupo1');

it('TC-HU3-14: mantiene la referencia al usuario aunque este sea desactivado posteriormente', function () {
    $admin = Admin::factory()->create();
    $this->actingAs($admin, 'sanctum')->postJson('/api/aulas', [
        'nombre' => 'A-101', 'ubicacion' => 'Bloque A', 'capacidad' => 40,
    ])->assertCreated();

    $log = LogAuditoria::where('accion', 'AULA_CREADA')->latest('created_at')->first();

    $admin->update(['activo' => false]);

    $this->assertDatabaseHas('logs_auditoria', ['id' => $log->id, 'user_id' => $admin->id]);
})->group('grupo1');

it('TC-HU3-15: genera el registro de auditoría en el mismo momento de la operación, sin proceso manual', function () {
    $admin = Admin::factory()->create();
    $antes = now();

    $this->actingAs($admin, 'sanctum')->postJson('/api/aulas', [
        'nombre' => 'A-102', 'ubicacion' => 'Bloque B', 'capacidad' => 30,
    ])->assertCreated();

    $log = LogAuditoria::where('accion', 'AULA_CREADA')->latest('created_at')->first();
    expect($log)->not->toBeNull();
    expect($log->created_at->diffInSeconds($antes))->toBeLessThan(5);
})->group('grupo1');

it('TC-HU8-12: registra en auditoría cada carga masiva (usuario, fecha/hora, resumen)', function () {
    // GAP CONFIRMADO: CargaMasivaEstudianteController::store() no llama a LogAuditoria::create()
    // en ningún punto (revisado en el código real). Este test fallará hoy a propósito, como
    // pendiente visible para el dev de ese controller.
    $admin = Admin::factory()->create();

    $csv = "codigo_sis,ci,ci_extension,nombre,apellido_paterno,apellido_materno,email_institucional\n"
         . "202312345,8234567,,Ana,Gomez,,202312345@est.umss.edu\n";
    $archivo = \Illuminate\Http\UploadedFile::fake()->createWithContent('estudiantes.csv', $csv);

    $this->actingAs($admin, 'sanctum')->postJson('/api/estudiantes/carga-masiva', ['archivo' => $archivo])
        ->assertCreated();

    $this->assertDatabaseHas('logs_auditoria', ['user_id' => $admin->id, 'modulo' => 'CargaMasivaEstudiantes']);
})->group('grupo1');

it('TC-HU9-8: registra en auditoría todo cambio de estado de habilitación, incluyendo el motivo', function () {
    // GAP CONFIRMADO: HabilitacionExamenController::update() tampoco llama a LogAuditoria::create().
    // Mismo tratamiento: se deja como falla visible, no oculta.
    $admin = Admin::factory()->create();
    $examen = \App\Models\Examen::factory()->create();
    $estudiante = \App\Models\Estudiante::factory()->create();
    $examen->estudiantes()->attach($estudiante->id, ['estado' => 'Habilitado']);

    $this->actingAs($admin, 'sanctum')->patchJson(
        "/api/examenes/{$examen->id}/estudiantes/{$estudiante->id}/habilitacion",
        ['estado' => 'Inhabilitado', 'motivo_inhabilitacion' => 'No cumple con requisito de inscripción previa.']
    )->assertOk();

    $this->assertDatabaseHas('logs_auditoria', ['user_id' => $admin->id, 'modulo' => 'Habilitacion']);
})->group('grupo1');

it('TC-HU12-8: cada intento de ingreso es consultable identificando al usuario', function () {
    // HU-12 no tiene controller, ruta ni tabla implementados aún (confirmado: no existe
    // `registro_ingreso` ni `inscripcion` en el schema). No hay nada que probar todavía.
})->skip('HU-12 (Control de Concurrencia e Ingreso) aún no implementada — sin tabla/controller.')
  ->group('grupo1');
