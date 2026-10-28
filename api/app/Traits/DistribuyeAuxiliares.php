<?php

namespace App\Traits;

use Illuminate\Support\Facades\DB;

trait DistribuyeAuxiliares
{
    public function redistribuirEstudiantesExamen(string $idExamen): void
    {
        DB::transaction(function () use ($idExamen) {
            // Solo auxiliares ACTIVOS en el examen
            $auxiliares = DB::table('examen_auxiliar')
                ->where('id_examen', $idExamen)
                ->where('estado', 'Activo')
                ->orderBy('created_at', 'asc')
                ->pluck('id_auxiliar')
                ->toArray();

            $numAuxiliares = count($auxiliares);

            if ($numAuxiliares === 0) {
                DB::table('estudiante_examen')
                    ->where('id_examen', $idExamen)
                    ->update(['id_auxiliar' => null]);
                return;
            }

            $estudiantes = DB::table('estudiante_examen')
                ->where('id_examen', $idExamen)
                ->orderBy('created_at', 'asc')
                ->pluck('id_estudiante')
                ->toArray();

            $totalEstudiantes = count($estudiantes);
            if ($totalEstudiantes === 0) {
                return;
            }

            $base = intdiv($totalEstudiantes, $numAuxiliares);
            $residuo = $totalEstudiantes % $numAuxiliares;

            $offset = 0;
            foreach ($auxiliares as $index => $idAuxiliar) {
                $tamanoBloque = $base + ($index < $residuo ? 1 : 0);

                if ($tamanoBloque > 0 && $offset < $totalEstudiantes) {
                    $bloque = array_slice($estudiantes, $offset, $tamanoBloque);

                    DB::table('estudiante_examen')
                        ->where('id_examen', $idExamen)
                        ->whereIn('id_estudiante', $bloque)
                        ->update(['id_auxiliar' => $idAuxiliar]);

                    $offset += $tamanoBloque;
                }
            }
        });
    }
}