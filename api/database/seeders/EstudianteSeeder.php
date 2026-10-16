<?php

namespace Database\Seeders;

use App\Models\Estudiante;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class EstudianteSeeder extends Seeder
{
    public function run(): void
    {
        $estudiantes = [
            [
                'id'                  => (string) Str::uuid(),
                'codigo_sis'          => '202104512',
                'ci'                  => '8765431',
                'ci_extension'        => 'CB',
                'nombre'              => 'Carlos',
                'apellido_paterno'    => 'Torrico',
                'apellido_materno'    => 'Rojas',
                'email_institucional' => '202104512@est.umss.edu',
                'activo'              => true,
            ],
            [
                'id'                  => (string) Str::uuid(),
                'codigo_sis'          => '202209123',
                'ci'                  => '9123847',
                'ci_extension'        => 'LP',
                'nombre'              => 'Mariana',
                'apellido_paterno'    => 'Vargas',
                'apellido_materno'    => 'Flores',
                'email_institucional' => '202209123@est.umss.edu',
                'activo'              => true,
            ],
            [
                'id'                  => (string) Str::uuid(),
                'codigo_sis'          => '202301641',
                'ci'                  => '7654129',
                'ci_extension'        => null,
                'nombre'              => 'Rodrigo',
                'apellido_paterno'    => 'Fernandez',
                'apellido_materno'    => 'Gomez',
                'email_institucional' => '202301641@est.umss.edu',
                'activo'              => true,
            ],
            [
                'id'                  => (string) Str::uuid(),
                'codigo_sis'          => '202400000',
                'ci'                  => '44455878',
                'ci_extension'        => null,
                'nombre'              => 'Matias',
                'apellido_paterno'    => 'Vargas',
                'apellido_materno'    => 'Mamani',
                'email_institucional' => '202400000@est.umss.edu',
                'activo'              => true,
            ],
        ];

        foreach ($estudiantes as $estudiante) {
            Estudiante::updateOrCreate(
                ['codigo_sis' => $estudiante['codigo_sis']],
                $estudiante
            );
        }
    }
}