<?php

namespace Database\Seeders;

use App\Models\Aula;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Materia;
use App\Models\PrerrequisitoExamen;
use App\Traits\DistribuyeAuxiliares;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PrerrequisitoSeeder extends Seeder
{
    use DistribuyeAuxiliares;

    public function run(): void
    {
        $docente = Docente::where('email', 'docente@fcyt.umss.edu.bo')->first() ?? Docente::first();

        if (!$docente) {
            $this->command->error('No se encontró ningún docente en la base de datos.');
            return;
        }

        $materia = Materia::firstOrCreate(
            ['nombre' => 'Elementos de programación'],
            ['id' => (string) Str::uuid()]
        );

        $aula = Aula::firstOrCreate(
            ['nombre' => 'Laboratorio TIS'],
            [
                'id'        => (string) Str::uuid(),
                'ubicacion' => 'Edificio FCyT',
                'estado'    => 'Disponible',
                'capacidad' => 50,
            ]
        );

        $examenIdFijo = '11111111-2222-3333-4444-555555555555';
        $ahora = Carbon::now('America/La_Paz');

        $examen = Examen::updateOrCreate(
            ['id' => $examenIdFijo],
            [
                'nombre'     => 'examen final',
                'id_materia' => $materia->id,
                'id_aula'    => $aula->id,
                'id_docente' => $docente->id,
                'estado'     => 'Programado',
                'fecha'      => $ahora->format('Y-m-d'),
                'hora_ini'   => $ahora->copy()->subMinutes(10)->format('H:i:s'),
                'hora_fin'   => $ahora->copy()->addHours(2)->format('H:i:s'),
            ]
        );

        // Asociar a los auxiliares disponibles
        $auxiliaresIds = DB::table('estudiantes')
            ->whereIn('email_institucional', [
                '11111111@est.umss.edu',
                '22222222@est.umss.edu',
                '33333333@est.umss.edu',
            ])
            ->pluck('id')
            ->toArray();

        foreach ($auxiliaresIds as $index => $idAuxiliar) {
            DB::table('examen_auxiliar')->updateOrInsert(
                [
                    'id_examen'   => $examen->id,
                    'id_auxiliar' => $idAuxiliar,
                ],
                [
                    'id'               => (string) Str::uuid(),
                    'estado'           => 'Activo',
                    'fecha_asignacion' => now()->addSeconds($index),
                    'created_at'       => now()->addSeconds($index),
                    'updated_at'       => now(),
                ]
            );
        }

        // Crear prerrequisitos
        $prerrequisitosData = [
            [
                'id'          => 'aaaaaaaa-1111-1111-1111-111111111111',
                'id_examen'   => $examen->id,
                'titulo'      => 'Asistencia mínima del 80%',
                'descripcion' => 'Haber asistido al menos al 80% de las clases teóricas y prácticas registradas.',
            ],
            [
                'id'          => 'bbbbbbbb-2222-2222-2222-222222222222',
                'id_examen'   => $examen->id,
                'titulo'      => 'Defensa de Sprint 1 Aprobada',
                'descripcion' => 'Aprobación satisfactoria de la entrega y sustentación del Sprint 1 del proyecto.',
            ],
            [
                'id'          => 'cccccccc-3333-3333-3333-333333333333',
                'id_examen'   => $examen->id,
                'titulo'      => 'Sin deudas en Laboratorio de Computación',
                'descripcion' => 'No registrar pendientes de devolución de material ni equipos en los laboratorios de FCyT.',
            ],
        ];

        foreach ($prerrequisitosData as $data) {
            PrerrequisitoExamen::updateOrCreate(
                ['id' => $data['id']],
                $data
            );
        }

        // Vincular a todos los estudiantes habilitados
        $estudiantes = Estudiante::where('es_auxiliar', false)->orderBy('codigo_sis')->get();

        $req1 = 'aaaaaaaa-1111-1111-1111-111111111111';
        $req2 = 'bbbbbbbb-2222-2222-2222-222222222222';
        $req3 = 'cccccccc-3333-3333-3333-333333333333';

        foreach ($estudiantes as $estudiante) {
            $this->asignarCumplimiento($req1, $estudiante->id, true, $docente->id);
            $this->asignarCumplimiento($req2, $estudiante->id, true, $docente->id);
            $this->asignarCumplimiento($req3, $estudiante->id, true, $docente->id);

            DB::table('estudiante_examen')->updateOrInsert(
                ['id_examen' => $examen->id, 'id_estudiante' => $estudiante->id],
                [
                    'estado'                    => 'Habilitado',
                    'motivo_estado'             => null,
                    'ajuste_manual'             => false,
                    'modificado_por_docente_id' => null,
                    'fecha_ajuste_manual'       => null,
                    'updated_at'                => now(),
                ]
            );
        }

        // Balancear equitativamente los alumnos entre los 3 auxiliares
        $this->redistribuirEstudiantesExamen($examen->id);

        $this->command->info("Examen con UUID {$examenIdFijo} y estudiantes balanceados entre auxiliares exitosamente.");
    }

    private function asignarCumplimiento(string $prerrequisitoId, string $estudianteId, bool $cumplido, ?string $docenteId): void
    {
        DB::table('estudiante_prerrequisito')->updateOrInsert(
            [
                'id_prerrequisito' => $prerrequisitoId,
                'id_estudiante'    => $estudianteId,
            ],
            [
                'cumplido'                => $cumplido,
                'fecha_cumplimiento'      => $cumplido ? now() : null,
                'revisado_por_docente_id' => $docenteId,
                'created_at'              => now(),
                'updated_at'              => now(),
            ]
        );
    }
}