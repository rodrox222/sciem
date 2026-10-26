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

    // Capa de aplicación (LogAuditoria::booted lanza RuntimeException antes de tocar la BD).
    expect(fn () => $log->update(['accion' => 'MODIFICADO']))->toThrow(\RuntimeException::class);
    expect(fn () => $log->delete())->toThrow(\RuntimeException::class);

    // Capa de base de datos (triggers PL/pgSQL), evadiendo Eloquent. Cada intento va en su
    // propio savepoint (DB::transaction anidado): en PostgreSQL un error deja abortada la
    // transacción del test y el statement siguiente fallaría con 25P02 aunque el trigger no
    // existiera (falso positivo). Además se exige el mensaje del trigger ("inmutables").
    expect(fn () => DB::transaction(fn () => DB::statement(
        'UPDATE logs_auditoria SET accion = ? WHERE id = ?', ['X', $log->id]
    )))->toThrow(\Illuminate\Database\QueryException::class, 'inmutables');

    expect(fn () => DB::transaction(fn () => DB::table('logs_auditoria')->where('id', $log->id)->delete()))
        ->toThrow(\Illuminate\Database\QueryException::class, 'inmutables');
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
    $admin = Admin::factory()->create();
    $docente = Docente::factory()->create();

    // 1) El Docente ejecuta una acción auditada (crear materia está permitido a docente).
    $this->actingAs($docente, 'sanctum')->postJson('/api/materias', ['nombre' => 'Materia de prueba HU3-9'])
        ->assertCreated();
    $log = LogAuditoria::where('accion', 'MATERIA_CREADA')->latest('created_at')->firstOrFail();
    expect($log->rol_en_el_momento)->toBe('docente');

    // 2) El Admin cambia al usuario de Docente a Auxiliar (UserController migra el registro de tabla).
    $this->actingAs($admin, 'sanctum')->putJson("/api/users/{$docente->id}", ['tipo_usuario' => 'auxiliar'])
        ->assertOk();
    $this->assertDatabaseHas('auxiliar', ['id' => $docente->id]);

    // 3) El registro histórico NO debe reflejar el rol nuevo.
    expect($log->refresh()->rol_en_el_momento)->toBe('docente');
})->group('grupo1');

it('TC-HU3-13: el historial de auditoría es inmutable a nivel de almacenamiento (BD)', function () {
    $log = LogAuditoria::factory()->create();

    expect(fn () => DB::transaction(fn () => DB::table('logs_auditoria')->where('id', $log->id)->delete()))
        ->toThrow(\Illuminate\Database\QueryException::class, 'inmutables');
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
    $admin = Admin::factory()->create();
    $examen = \App\Models\Examen::factory()->create();

    // Ruta vigente: POST examenes/{idExamen}/estudiantes/carga-masiva. El controller lee una plantilla
    // anclada en una celda '#' y luego SIS | Apellidos | Nombres | Email.
    $csv = "#,SIS,Apellidos,Nombres,Email\n"
         . "1,202312345,Gomez Perez,Ana,202312345@est.umss.edu\n";
    $archivo = \Illuminate\Http\UploadedFile::fake()->createWithContent('estudiantes.csv', $csv);

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/examenes/{$examen->id}/estudiantes/carga-masiva", ['archivo' => $archivo])
        ->assertCreated();

    $this->assertDatabaseHas('logs_auditoria', [
        'user_id' => $admin->id, 'modulo' => 'CARGA_MASIVA', 'accion' => 'CARGA_MASIVA_EXITOSA',
    ]);
})->group('grupo1');

it('TC-HU9-8: registra en auditoría todo cambio de estado de habilitación, incluyendo el motivo', function () {
    // GAP CONFIRMADO: HabilitacionExamenController::update() no escribe en logs_auditoria.
    // Actor Docente: con un Admin la FK de modificado_por_docente_id daría 500 antes de llegar a auditar.
    $docente = Docente::factory()->create();
    $examen = \App\Models\Examen::factory()->create();
    $estudiante = \App\Models\Estudiante::factory()->create();
    $examen->estudiantes()->attach($estudiante->id, [
        'estado' => 'Habilitado', 'motivo_estado' => null, 'ajuste_manual' => false,
    ]);

    $this->actingAs($docente, 'sanctum')->patchJson(
        "/api/examenes/{$examen->id}/estudiantes/{$estudiante->id}/habilitacion",
        ['estado' => 'Inhabilitado', 'motivo_estado' => 'Documentacion incompleta']
    )->assertOk();

    expect(
        DB::table('logs_auditoria')->where('user_id', $docente->id)
            ->whereRaw('detalles::text ilike ?', ['%Documentacion incompleta%'])->exists()
    )->toBeTrue();
})->group('grupo1');
