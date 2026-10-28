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
        AccesoExamen::autorizar($request, $examen);

        // Un único orden de bloqueo para QR, manual, sincronización y expulsiones.
        return DB::transaction(function () use ($request, $next, $id) {
            DB::table('examenes')->where('id', $id)->lockForUpdate()->first();
            $examen = AccesoExamen::buscar($id);
            AccesoExamen::autorizar($request, $examen);
            if (! $request->is('api/examenes/*/sincronizar-asistencias')) {
                abort_unless(AccesoExamen::enHorario($examen), 422, 'La operación solo está disponible durante el horario del examen.');
            }

            return $next($request);
        }, 3);
    }
}
