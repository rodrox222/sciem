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
            ['nombre' => 'Introduccion a la programacion'],
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

       $docente = Docente::where('email', 'docente@fcyt.umss.edu.bo')->first();

        if (!$docente) {
            $docente = Docente::create([
                'id'                => (string) Str::uuid(),
                'email'             => 'docente@fcyt.umss.edu.bo',
                'ci'                => '11111111',
                'ci_extension'      => null,
                'nombre'            => 'jackson',
                'apellido_paterno'  => 'Orellana',
                'apellido_materno'  => 'mamani',
                'email_verified_at' => now(),
                'password'          => Hash::make('docente123'),
                'activo'            => true,
            ]);
        }

        // Crear el Examen
        $examen = Examen::updateOrCreate(
            ['nombre' => 'segundo parcial'],
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

       $estudiantes = Estudiante::take(2)->get();

        $syncData = [];
        foreach ($estudiantes as $estudiante) {
            $syncData[$estudiante->id] = [
                'estado'        => 'Habilitado',
                'motivo_estado' => null,
                'created_at'    => now(),
                'updated_at'    => now(),
            ];
        }

        if (!empty($syncData)) {
            $examen->estudiantes()->sync($syncData);
        }
    }
}