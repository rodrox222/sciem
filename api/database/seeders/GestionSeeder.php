<?php

namespace Database\Seeders;

use App\Models\Aula;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Gestion;
use App\Models\Materia;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GestionSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        // 1. Gestión anterior cerrada: 1-2026
        $gestion1 = Gestion::where('codigo', '1-2026')->first();
        if (!$gestion1) {
            $id1 = (string) Str::uuid();
            DB::table('gestiones')->insert([
                'id'           => $id1,
                'anio'         => 2026,
                'periodo'      => 1,
                'codigo'       => '1-2026',
                'fecha_inicio' => '2026-02-24',
                'fecha_fin'    => '2026-07-05',
                'activo'       => DB::raw('false'),
                'cerrado_en'   => '2026-07-06 18:00:00',
                'created_at'   => $now,
                'updated_at'   => $now,
            ]);
            $gestion1 = Gestion::find($id1);
        }

        // 2. Asegurar gestión activa 2-2026 y vincular exámenes sin gestión (ej. ExamenSeeder2)
        $gestion2 = Gestion::where('codigo', '2-2026')->first();
        if ($gestion2) {
            DB::table('examenes')
                ->whereNull('id_gestion')
                ->update(['id_gestion' => $gestion2->id]);
        }

        // 3. Crear 2 exámenes de ejemplo en el semestre anterior 1-2026
        $materia1 = Materia::where('nombre', 'Introducción a la Programación')->first() ?? Materia::first();
        $materia2 = Materia::where('nombre', 'Cálculo I')->first() ?? $materia1;
        $aula1 = Aula::where('nombre', 'Aula 691B')->orWhere('nombre', 'Aula 691-B')->first() ?? Aula::first();
        $aula2 = Aula::where('nombre', 'Aula 692B')->orWhere('nombre', 'Aula 692-B')->first() ?? $aula1;
        $docente = Docente::where('email', 'docente@fcyt.umss.edu.bo')->first() ?? Docente::first();

        if (!$gestion1 || !$materia1 || !$aula1 || !$docente) {
            return;
        }

        $ejemplos = [
            [
                'nombre'     => 'Primer Parcial - Introducción a la Programación (1-2026)',
                'id_materia' => $materia1->id,
                'id_aula'    => $aula1->id,
                'id_docente' => $docente->id,
                'id_gestion' => $gestion1->id,
                'estado'     => 'Terminado',
                'fecha'      => '2026-04-14',
                'hora_ini'   => '08:15:00',
                'hora_fin'   => '10:00:00',
            ],
            [
                'nombre'     => 'Examen Final - Cálculo I (1-2026)',
                'id_materia' => $materia2->id,
                'id_aula'    => $aula2->id,
                'id_docente' => $docente->id,
                'id_gestion' => $gestion1->id,
                'estado'     => 'Terminado',
                'fecha'      => '2026-06-25',
                'hora_ini'   => '10:15:00',
                'hora_fin'   => '12:00:00',
            ],
        ];

        $estudiantes = Estudiante::take(3)->get();

        foreach ($ejemplos as $data) {
            $examen = Examen::updateOrCreate(
                ['nombre' => $data['nombre']],
                array_merge(['id' => (string) Str::uuid()], $data)
            );

            if ($estudiantes->isNotEmpty() && $examen->estudiantes()->count() === 0) {
                $syncData = [];
                foreach ($estudiantes as $est) {
                    $syncData[$est->id] = [
                        'estado'        => 'Habilitado',
                        'motivo_estado' => null,
                        'created_at'    => $now,
                        'updated_at'    => $now,
                    ];
                }
                $examen->estudiantes()->syncWithoutDetaching($syncData);
            }
        }
    }
}
