<?php

namespace Tests\Feature;

use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\LogAsistencia;
use App\Models\LogAuditoria;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class ModoOfflineTest extends TestCase
{
    private Docente $docente;

    private Estudiante $auxiliar;

    private Estudiante $estudiante;

    private Examen $examen;

    private bool $transactionStarted = false;

    protected function setUp(): void
    {
        parent::setUp();

        DB::beginTransaction();
        $this->transactionStarted = true;

        $this->docente = Docente::create([
            'nombre'           => 'Docente',
            'apellido_paterno' => 'Offline',
            'ci'               => 'QA' . random_int(100000, 999999),
            'email'            => Str::uuid() . '@fcyt.umss.edu.bo',
            'password'         => Hash::make('Secret#2026'),
            'activo'           => true,
        ]);

        $this->auxiliar = Estudiante::create([
            'nombre'              => 'Auxiliar',
            'apellido_paterno'    => 'Dual',
            'codigo_sis'          => (string) random_int(100000000, 999999999),
            'email_institucional' => Str::uuid() . '@est.umss.edu',
            'activo'              => true,
            'es_auxiliar'         => true,
            'password'            => Hash::make('Secret#2026'),
        ]);

        $this->estudiante = Estudiante::create([
            'nombre'              => 'Estudiante',
            'apellido_paterno'    => 'Prueba',
            'codigo_sis'          => (string) random_int(100000000, 999999999),
            'email_institucional' => Str::uuid() . '@est.umss.edu',
            'activo'              => true,
            'es_auxiliar'         => false,
            'password'            => Hash::make('Secret#2026'),
        ]);

        $materiaId = (string) Str::uuid();
        $aulaId = (string) Str::uuid();
        DB::table('materias')->insert(['id' => $materiaId, 'nombre' => 'Materia Offline QA ' . Str::random(6)]);
        DB::table('aulas')->insert([
            'id'        => $aulaId,
            'nombre'    => 'Aula QA ' . Str::random(4),
            'ubicacion' => 'Bloque QA',
            'estado'    => 'Disponible',
            'capacidad' => 100,
        ]);

        $ahora = Carbon::now('America/La_Paz');
        $this->examen = Examen::create([
            'nombre'     => 'Examen Offline QA ' . Str::random(6),
            'id_materia' => $materiaId,
            'id_aula'    => $aulaId,
            'id_docente' => $this->docente->id,
            'estado'     => 'En proceso',
            'fecha'      => $ahora->toDateString(),
            'hora_ini'   => '00:00:00',
            'hora_fin'   => '23:59:59',
        ]);

        DB::table('estudiante_examen')->insert([
            'id_examen'     => $this->examen->id,
            'id_estudiante' => $this->estudiante->id,
            'estado'        => 'Habilitado',
            'id_auxiliar'   => $this->auxiliar->id,
        ]);

        DB::table('examen_auxiliar')->insert([
            'id'          => (string) Str::uuid(),
            'id_examen'   => $this->examen->id,
            'id_auxiliar' => $this->auxiliar->id,
            'estado'      => 'Activo',
        ]);
    }

    protected function tearDown(): void
    {
        if ($this->transactionStarted) {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
        }
        parent::tearDown();
    }

    private function autenticarComoAuxiliar(): self
    {
        $token = $this->auxiliar->createToken('test-offline', ['role:auxiliar'])->plainTextToken;

        return $this->withHeader('Authorization', "Bearer {$token}");
    }

    public function test_auxiliar_activo_puede_descargar_padron(): void
    {
        $this->autenticarComoAuxiliar()
            ->getJson("/api/examenes/{$this->examen->id}/descargar-padron")
            ->assertStatus(200)
            ->assertJsonPath('total_asignados', 1);

        DB::table('examen_auxiliar')
            ->where('id_examen', $this->examen->id)
            ->where('id_auxiliar', $this->auxiliar->id)
            ->update(['estado' => 'Inactivo']);

        $this->autenticarComoAuxiliar()
            ->getJson("/api/examenes/{$this->examen->id}/descargar-padron")
            ->assertStatus(403);
    }

    public function test_auxiliar_sincroniza_asistencia_permitida_y_registra_auditoria_y_lote(): void
    {
        $fechaIngreso = Carbon::now('America/La_Paz')->subMinutes(5);

        $this->autenticarComoAuxiliar()
            ->postJson("/api/examenes/{$this->examen->id}/sincronizar-asistencias", [
                'asistencias' => [[
                    'id_estudiante' => $this->estudiante->id,
                    'codigo_sis'    => $this->estudiante->codigo_sis,
                    'fecha_ingreso' => $fechaIngreso->toIso8601String(),
                    'resultado'     => 'PERMITIDO',
                    'motivo'        => 'Ingreso autorizado offline.',
                ]],
            ])
            ->assertStatus(200)
            ->assertJsonPath('total_procesados', 1)
            ->assertJsonPath('detalles_errores', []);

        $this->assertDatabaseHas('logs_asistencias', [
            'id_examen'     => $this->examen->id,
            'id_estudiante' => $this->estudiante->id,
            'resultado'     => 'PERMITIDO',
        ]);

        $this->assertDatabaseHas('logs_auditoria', [
            'user_id'           => $this->auxiliar->id,
            'rol_en_el_momento' => 'auxiliar',
            'usuario_email'     => $this->auxiliar->email_institucional,
            'modulo'            => 'SINCRONIZACION_OFFLINE',
            'accion'            => 'ASISTENCIA_OFFLINE_SINCRONIZADA',
        ]);

        $this->assertDatabaseHas('logs_auditoria', [
            'user_id' => $this->auxiliar->id,
            'modulo'  => 'SINCRONIZACION_OFFLINE',
            'accion'  => 'SINCRONIZACION_OFFLINE_LOTE',
        ]);
    }

    public function test_conflicto_duplicado_r3_conserva_primer_ingreso_y_registra_auditoria(): void
    {
        $primerIngreso = Carbon::now('America/La_Paz')->subMinutes(20);
        $segundoIngresoOffline = Carbon::now('America/La_Paz')->subMinutes(5);

        LogAsistencia::create([
            'id_examen'            => $this->examen->id,
            'id_estudiante'        => $this->estudiante->id,
            'codigo_sis_escaneado' => $this->estudiante->codigo_sis,
            'resultado'            => 'PERMITIDO',
            'mensaje'              => 'Ingreso online previo.',
            'fecha_escaneo'        => $primerIngreso,
        ]);

        $response = $this->autenticarComoAuxiliar()
            ->postJson("/api/examenes/{$this->examen->id}/sincronizar-asistencias", [
                'asistencias' => [[
                    'id_estudiante' => $this->estudiante->id,
                    'codigo_sis'    => $this->estudiante->codigo_sis,
                    'fecha_ingreso' => $segundoIngresoOffline->toIso8601String(),
                    'resultado'     => 'PERMITIDO',
                ]],
            ])
            ->assertStatus(200)
            ->assertJsonPath('total_procesados', 1);

        $this->assertCount(1, $response->json('detalles_errores'));
        $this->assertSame($this->estudiante->codigo_sis, $response->json('detalles_errores.0.codigo_sis'));

        $this->assertDatabaseHas('intentos_no_autorizados', [
            'id_examen'     => $this->examen->id,
            'id_estudiante' => $this->estudiante->id,
            'tipo_intento'  => 'CONFLICTO_DUPLICADO_R3',
        ]);

        $this->assertDatabaseHas('logs_auditoria', [
            'user_id' => $this->auxiliar->id,
            'modulo'  => 'INTENTOS_NO_AUTORIZADOS',
            'accion'  => 'INTENTO_OFFLINE_SINCRONIZADO',
        ]);

        $this->assertDatabaseHas('logs_auditoria', [
            'user_id'       => $this->auxiliar->id,
            'usuario_email' => $this->auxiliar->email_institucional,
            'modulo'        => 'SINCRONIZACION_OFFLINE',
            'accion'        => 'CONFLICTO_DUPLICADO_R3',
        ]);

        $this->assertDatabaseHas('logs_auditoria', [
            'user_id' => $this->auxiliar->id,
            'modulo'  => 'SINCRONIZACION_OFFLINE',
            'accion'  => 'SINCRONIZACION_OFFLINE_LOTE',
        ]);
    }

    public function test_conflicto_r3_ganador_offline_anterior_sustituye_ingreso_y_registra_auditoria(): void
    {
        $ingresoPosteriorOnline = Carbon::now('America/La_Paz')->subMinutes(2);
        $ingresoAnteriorOffline = Carbon::now('America/La_Paz')->subMinutes(15);

        $logPrevio = LogAsistencia::create([
            'id_examen'            => $this->examen->id,
            'id_estudiante'        => $this->estudiante->id,
            'codigo_sis_escaneado' => $this->estudiante->codigo_sis,
            'resultado'            => 'PERMITIDO',
            'mensaje'              => 'Ingreso online posterior.',
            'fecha_escaneo'        => $ingresoPosteriorOnline,
        ]);

        $this->autenticarComoAuxiliar()
            ->postJson("/api/examenes/{$this->examen->id}/sincronizar-asistencias", [
                'asistencias' => [[
                    'id_estudiante' => $this->estudiante->id,
                    'codigo_sis'    => $this->estudiante->codigo_sis,
                    'fecha_ingreso' => $ingresoAnteriorOffline->toIso8601String(),
                    'resultado'     => 'PERMITIDO',
                ]],
            ])
            ->assertStatus(200)
            ->assertJsonPath('total_procesados', 1)
            ->assertJsonPath('detalles_errores', []);

        $this->assertDatabaseHas('logs_asistencias', [
            'id'        => $logPrevio->id,
            'resultado' => 'RECHAZADO_YA_INGRESO',
        ]);

        $this->assertSame(
            1,
            LogAsistencia::where('id_examen', $this->examen->id)
                ->where('id_estudiante', $this->estudiante->id)
                ->where('resultado', 'PERMITIDO')
                ->count()
        );

        $this->assertDatabaseHas('logs_auditoria', [
            'user_id'       => $this->auxiliar->id,
            'usuario_email' => $this->auxiliar->email_institucional,
            'modulo'        => 'SINCRONIZACION_OFFLINE',
            'accion'        => 'OFFLINE_SYNC_R3_GANADOR',
        ]);

        $this->assertDatabaseHas('logs_auditoria', [
            'user_id' => $this->auxiliar->id,
            'modulo'  => 'SINCRONIZACION_OFFLINE',
            'accion'  => 'SINCRONIZACION_OFFLINE_LOTE',
        ]);
    }

    public function test_rechazo_conciliacion_registra_auditoria(): void
    {
        DB::table('estudiante_examen')
            ->where('id_examen', $this->examen->id)
            ->where('id_estudiante', $this->estudiante->id)
            ->update(['estado' => 'Inhabilitado']);

        $response = $this->autenticarComoAuxiliar()
            ->postJson("/api/examenes/{$this->examen->id}/sincronizar-asistencias", [
                'asistencias' => [[
                    'id_estudiante' => $this->estudiante->id,
                    'codigo_sis'    => $this->estudiante->codigo_sis,
                    'fecha_ingreso' => Carbon::now('America/La_Paz')->subMinutes(3)->toIso8601String(),
                    'resultado'     => 'PERMITIDO',
                ]],
            ])
            ->assertStatus(200)
            ->assertJsonPath('total_procesados', 0);

        $this->assertCount(1, $response->json('detalles_errores'));

        $this->assertDatabaseHas('logs_auditoria', [
            'user_id' => $this->auxiliar->id,
            'modulo'  => 'SINCRONIZACION_OFFLINE',
            'accion'  => 'RECHAZO_CONCILIACION_OFFLINE',
        ]);

        $this->assertDatabaseHas('logs_auditoria', [
            'user_id' => $this->auxiliar->id,
            'modulo'  => 'SINCRONIZACION_OFFLINE',
            'accion'  => 'SINCRONIZACION_OFFLINE_LOTE',
        ]);
    }
}