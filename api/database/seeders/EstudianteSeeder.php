<?php

namespace Database\Seeders;

use App\Models\Estudiante;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class EstudianteSeeder extends Seeder
{
    public function run(): void
    {
        $estudiantes = [
            [
                'codigo_sis'          => '202104512',
                'nombre'              => 'Carlos',
                'apellido_paterno'    => 'Torrico',
                'apellido_materno'    => 'Rojas',
                'email_institucional' => '202104512@est.umss.edu',
                'foto_perfil_url'     => null,
            ],
            [
                'codigo_sis'          => '202209123',
                'nombre'              => 'Mariana',
                'apellido_paterno'    => 'Vargas',
                'apellido_materno'    => 'Flores',
                'email_institucional' => '202209123@est.umss.edu',
                'foto_perfil_url'     => null,
            ],
            [
                'codigo_sis'          => '202301641',
                'nombre'              => 'Rodrigo',
                'apellido_paterno'    => 'Fernandez',
                'apellido_materno'    => 'Gomez',
                'email_institucional' => '202301641@est.umss.edu',
                'foto_perfil_url'     => null,
            ],
            [
                'codigo_sis'          => '20202020',
                'nombre'              => 'geraldos',
                'apellido_paterno'    => 'mamani',
                'apellido_materno'    => 'crauz',
                'email_institucional' => '20202020@est.umss.edu',
                'foto_perfil_url'     => null,
            ],
        ];

        foreach ($estudiantes as $data) {
            $passwordPlano = Estudiante::generarPasswordPorDefecto(
                $data['codigo_sis'],
                $data['nombre'],
                $data['apellido_paterno'],
                $data['apellido_materno']
            );

            DB::table('estudiantes')->updateOrInsert(
                ['codigo_sis' => $data['codigo_sis']],
                [
                    'id'                       => DB::raw("COALESCE((SELECT id FROM estudiantes WHERE codigo_sis = '{$data['codigo_sis']}'), '" . Str::uuid() . "'::uuid)"),
                    'ci'                       => null,
                    'ci_extension'             => null,
                    'nombre'                   => $data['nombre'],
                    'apellido_paterno'         => $data['apellido_paterno'],
                    'apellido_materno'         => $data['apellido_materno'],
                    'email_institucional'      => $data['email_institucional'],
                    'foto_perfil_url'          => null,
                    'password'                 => Hash::make($passwordPlano),
                    'primer_acceso_completado' => DB::raw('false'),
                    'activo'                   => DB::raw('true'),
                    'es_auxiliar'              => DB::raw('false'),
                    'updated_at'               => now(),
                ]
            );
        }
    }
}