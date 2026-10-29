<?php

namespace App\Services;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

final class AsistenciaExamen
{
    // Nómina actual + primer PERMITIDO. El pivote queda como proyección de escritura.
    public static function nomina(?string $id = null): Builder
    {
        $ingresos = DB::table('logs_asistencias')->select('id_examen', 'id_estudiante')
            ->selectRaw('MIN(fecha_escaneo) AS fecha_ingreso')->where('resultado', 'PERMITIDO')
            ->when($id, fn ($q) => $q->where('id_examen', $id))->groupBy('id_examen', 'id_estudiante');

        return DB::query()->fromSub(
            DB::table('estudiante_examen as ins')->leftJoinSub($ingresos, 'i', fn ($j) => $j->on('i.id_examen', '=', 'ins.id_examen')->on('i.id_estudiante', '=', 'ins.id_estudiante'))
                ->when($id, fn ($q) => $q->where('ins.id_examen', $id))
                ->select('ins.id_examen', 'ins.id_estudiante', 'ins.estado', 'ins.motivo_estado', 'i.fecha_ingreso'),
            'ee'
        );
    }
}
