<?php

namespace App\Http\Controllers;

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

        $minutos = $config ? (int) $config->valor : 5; // Fallback de 5 si no existe

        return response()->json([
            'clave'   => 'tiempo_inactividad_minutos',
            'minutos' => $minutos,
        ], 200);
    }

    /**
     * PUT /api/configuracion/inactividad
     * Modifica el límite de minutos.
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

        DB::table('configuraciones_sistema')->updateOrInsert(
            ['clave' => 'tiempo_inactividad_minutos'],
            [
                'valor'      => $nuevosMinutos,
                'updated_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'Límite de inactividad actualizado correctamente.',
            'minutos' => (int) $nuevosMinutos,
        ], 200);
    }
}
