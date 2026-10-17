<?php

namespace Database\Seeders;

use App\Models\Estudiante;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

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
                'codigo_sis'          => '20202020',
                'ci'                  => '8765431',
                'ci_extension'        => 'CB',
                'nombre'              => 'goku',
                'apellido_paterno'    => 'mamani',
                'apellido_materno'    => 'cr7',
                'email_institucional' => '20202020@est.umss.edu',
                'activo'              => true,
                'password'            => Hash::make('12345678'), // Solo Mamani tiene contraseña manual
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