<?php

namespace App\Http\Middleware;

use App\Services\AccesoExamen;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OperacionExamen
{
    public function handle(Request $request, Closure $next)
    {
        $id = $request->route('id') ?? $request->route('id_examen');
        $examen = AccesoExamen::buscar($id);

        $this->verificarAcceso($request, $examen);

        // Un único orden de bloqueo para QR, manual, sincronización y expulsiones.
        return DB::transaction(function () use ($request, $next, $id) {
            DB::table('examenes')->where('id', $id)->lockForUpdate()->first();
            $examen = AccesoExamen::buscar($id);
            
            $this->verificarAcceso($request, $examen);

            if (! $request->is('api/examenes/*/sincronizar-asistencias')) {
                abort_unless(AccesoExamen::enHorario($examen), 422, 'La operación solo está disponible durante el horario del examen.');
            }

            return $next($request);
        }, 3);
    }

    /**
     * Valida si el usuario actual tiene acceso al examen (Docente, Admin o Auxiliar asignado).
     */
    private function verificarAcceso(Request $request, $examen): void
    {
        $user = $request->user();

        if (AccesoExamen::permite($request, $examen)) {
            return;
        }

        if ($user && !empty($user->es_auxiliar)) {
            $tablaAuxiliar = DB::getSchemaBuilder()->hasTable('examen_auxiliares')
                ? 'examen_auxiliares'
                : 'examen_auxiliar';

            $esAuxiliarAsignado = DB::table($tablaAuxiliar)
                ->where('id_examen', $examen->id)
                ->where('id_auxiliar', $user->id)
                ->whereIn('estado', ['Activo', 'Aceptada'])
                ->exists();

            if ($esAuxiliarAsignado) {
                return;
            }
        }

        abort(403, 'No tiene acceso a este examen con su rol actual.');
    }
}