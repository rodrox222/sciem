<?php

namespace Database\Seeders;

use App\Models\Aula;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Materia;
use App\Models\PrerrequisitoExamen;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PrerrequisitoSeeder extends Seeder
{
    public function run(): void
    {
        // Obtener al docente institucional
        $docente = Docente::where('email', 'docente@fcyt.umss.edu.bo')->first() ?? Docente::first();

        if (!$docente) {
            $this->command->error('No se encontró ningún docente en la base de datos.');
            return;
        }

        // Asegurar Materia y Aula de prueba
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

        // Crear el Examen con UUID fijo
        $examenIdFijo = '11111111-2222-3333-4444-555555555555';

        $examen = Examen::updateOrCreate(
            ['id' => $examenIdFijo],
            [
                'nombre'     => 'examen final',
                'id_materia' => $materia->id,
                'id_aula'    => $aula->id,
                'id_docente' => $docente->id,
                'estado'     => 'Programado',
                'fecha'      => '2026-10-20',
                'hora_ini'   => '08:15:00',
                'hora_fin'   => '10:00:00',
            ]
        );

        // Asignar el estudiante auxiliar al examen ya creado
        $idEstudianteAuxiliar = DB::table('estudiantes')
            ->where('email_institucional', '202301640@est.umss.edu')
            ->value('id');

        if ($idEstudianteAuxiliar) {
            DB::table('examen_auxiliar')->updateOrInsert(
                [
                    'id_examen'   => $examen->id,
                    'id_auxiliar' => $idEstudianteAuxiliar,
                ],
                [
                    'id'               => (string) Str::uuid(),
                    'estado'           => 'Aceptada',
                    'fecha_invitacion' => now(),
                    'fecha_respuesta'  => now(),
                    'updated_at'       => now(),
                    'created_at'       => now(),
                ]
            );
        }

        // Crear los 3 Prerrequisitos para este examen
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

        // Obtener todos los estudiantes registrados
        $estudiantes = Estudiante::orderBy('codigo_sis')->get();

        $req1 = 'aaaaaaaa-1111-1111-1111-111111111111';
        $req2 = 'bbbbbbbb-2222-2222-2222-222222222222';
        $req3 = 'cccccccc-3333-3333-3333-333333333333';

        // Vincular a todos los estudiantes con cumplimiento pleno (Habilitados y sin motivo)
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

        $this->command->info("Examen con UUID {$examenIdFijo} y prerrequisitos asociados exitosamente.");
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