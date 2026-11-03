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
        // Obtener la materia creada por MateriaSeeder
        $materia = Materia::where('nombre', 'Introducción a la Programación')
            ->orWhere('nombre', 'ilike', 'Introduccion a la programacion')
            ->firstOrFail();

        // Obtener el aula creada por AulaSeeder
        $aula = Aula::where('nombre', 'Aula 691B')
            ->orWhere('nombre', 'Aula 691-B')
            ->firstOrFail();

        // Obtener o crear docente de prueba
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

        // Crear o actualizar el Examen
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

        // Asignar estudiantes
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