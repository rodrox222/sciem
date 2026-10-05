<?php

namespace Database\Seeders;

use App\Models\Aula;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Materia;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ExamenSeeder extends Seeder
{
    public function run(): void
    {
        // Asegurar o crear una Materia de prueba
        $materia = Materia::firstOrCreate(
            ['nombre' => 'Taller de Ingeniería de Software'],
            ['id' => (string) Str::uuid()]
        );

        // Asegurar o crear un Aula de prueba
        $aula = Aula::firstOrCreate(
            ['nombre' => 'Aula 691B'],
            [
                'id'        => (string) Str::uuid(),
                'ubicacion' => 'Edificio Nuevo FCyT - Planta Baja',
                'estado'    => 'Disponible',
                'capacidad' => 50,
            ]
        );

        // Asegurar o crear un Docente de prueba
        $docente = Docente::firstOrCreate(
            ['email' => 'docente.tis@gmail.com'],
            [
                'id'               => (string) Str::uuid(),
                'ci'               => '5421987',
                'ci_extension'     => 'CB',
                'nombre'           => 'Marco Antonio',
                'apellido_paterno' => 'Montecinos',
                'apellido_materno' => 'Choque',
                'password'         => Hash::make('password123'),
                'activo'           => true,
            ]
        );

        // Crear el Examen
        $examen = Examen::updateOrCreate(
            ['nombre' => 'Primer Examen Parcial - TIS'],
            [
                'id'         => (string) Str::uuid(),
                'id_materia' => $materia->id,
                'id_aula'    => $aula->id,
                'id_docente' => $docente->id,
                'estado'     => 'Programado',
                'fecha'      => '2026-10-15',
                'hora_ini'   => '08:15:00',
                'hora_fin'   => '10:00:00',
            ]
        );

        // asignar los estudiantes a la tabla intermedia 'estudiante_examen'
        $estudiantes = Estudiante::all();

        if ($estudiantes->count() > 0) {
            // Estudiante 1: Habilitado sin motivo
            if (isset($estudiantes[0])) {
                $examen->estudiantes()->syncWithoutDetaching([
                    $estudiantes[0]->id => [
                        'estado'                => 'Habilitado',
                        'motivo_estado' => null,
                        'created_at'            => now(),
                        'updated_at'            => now(),
                    ],
                ]);
            }

            // Estudiante 2: Habilitado sin motivo
            if (isset($estudiantes[1])) {
                $examen->estudiantes()->syncWithoutDetaching([
                    $estudiantes[1]->id => [
                        'estado'                => 'Habilitado',
                        'motivo_estado' => null,
                        'created_at'            => now(),
                        'updated_at'            => now(),
                    ],
                ]);
            }

            // Estudiante 3: Inhabilitado con motivo para pruebas
            if (isset($estudiantes[2])) {
                $examen->estudiantes()->syncWithoutDetaching([
                    $estudiantes[2]->id => [
                        'estado'                => 'Inhabilitado',
                        'motivo_estado' => 'No cumple con el 80% de asistencia mínima requerida.',
                        'created_at'            => now(),
                        'updated_at'            => now(),
                    ],
                ]);
            }
        }
    }
}