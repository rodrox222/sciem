<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\LogAuditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ConfiguracionSistemaController extends Controller
{
    /**
     * GET /api/configuracion/inactividad
     * Retorna los minutos configurados para timeout de inactividad.
     */
    public function getTiempoInactividad(): JsonResponse
    {
        $config = DB::table('configuraciones_sistema')
            ->where('clave', 'tiempo_inactividad_minutos')
            ->first();

        $minutos = $config ? (int) $config->valor : 5;

        return response()->json([
            'clave'   => 'tiempo_inactividad_minutos',
            'minutos' => $minutos,
        ], 200);
    }

    /**
     * PUT /api/configuracion/inactividad
     * Modifica el límite de minutos y audita con snapshot reversible.
     */
    public function updateTiempoInactividad(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'minutos' => ['required', 'integer', 'min:1', 'max:120'],
        ], [
            'minutos.required' => 'Debe ingresar el tiempo en minutos.',
            'minutos.integer'  => 'El tiempo debe ser un número entero.',
            'minutos.min'      => 'El tiempo mínimo de inactividad es de 1 minuto.',
            'minutos.max'      => 'El tiempo máximo permitido es de 120 minutos.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validación fallida.',
                'errors'  => $validator->errors()
            ], 422);
        }

        $nuevosMinutos = (string) $request->input('minutos');

        $configPrevio = DB::table('configuraciones_sistema')
            ->where('clave', 'tiempo_inactividad_minutos')
            ->first();

        $valorAnterior = $configPrevio ? $configPrevio->valor : '5';

        DB::table('configuraciones_sistema')->updateOrInsert(
            ['clave' => 'tiempo_inactividad_minutos'],
            [
                'valor'      => $nuevosMinutos,
                'updated_at' => now(),
            ]
        );

        $this->registrarAuditoria($request, 'CONFIGURACION_INACTIVIDAD_ACTUALIZADA', [
            'target_type'        => 'configuraciones_sistema',
            'target_id'          => 'tiempo_inactividad_minutos',
            'valores_anteriores' => ['valor' => $valorAnterior],
            'valores_nuevos'     => ['valor' => $nuevosMinutos],
        ]);

        return response()->json([
            'message' => 'Límite de inactividad actualizado correctamente.',
            'minutos' => (int) $nuevosMinutos,
        ], 200);
    }

    private function registrarAuditoria(Request $request, string $accion, array $detalles = []): void
    {
        $user = $request->user();
        if (!$user) return;

        $rol = match (get_class($user)) {
            Admin::class    => 'admin',
            Docente::class  => 'docente',
            Auxiliar::class => 'auxiliar',
            default         => 'desconocido',
        };

        $nombreCompleto = trim("{$user->nombre} {$user->apellido_paterno} {$user->apellido_materno}");

        LogAuditoria::create([
            'user_type'         => get_class($user),
            'user_id'           => $user->id,
            'rol_en_el_momento' => $rol,
            'usuario_nombre'    => $nombreCompleto !== '' ? $nombreCompleto : $user->nombre,
            'usuario_email'     => $user->email ?? null,
            'modulo'            => 'CONFIGURACION',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}