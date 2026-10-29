<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UsersSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Administrador
        DB::table('admin')->updateOrInsert(
            ['ci' => '1234567'],
            [
                'id'               => (string) Str::uuid(),
                'ci_extension'     => null,
                'nombre'           => 'Admin',
                'apellido_paterno' => 'General',
                'apellido_materno' => null,
                'password'         => Hash::make('qwerasdf'),
                'activo'           => DB::raw('true'),
                'created_at'       => now(),
                'updated_at'       => now(),
            ]
        );

        // 2. Docentes
        DB::table('docente')->updateOrInsert(
            ['email' => 'docente@fcyt.umss.edu.bo'],
            [
                'id'                => 'e2510d30-530c-449f-992c-423fb9ef5e93',
                'ci'                => '11111111',
                'ci_extension'      => null,
                'nombre'            => 'jackson',
                'apellido_paterno'  => 'Orellana',
                'apellido_materno'  => 'mamani',
                'email_verified_at' => now(),
                'password'          => Hash::make('docente123'),
                'activo'            => DB::raw('true'),
                'created_at'        => now(),
                'updated_at'        => now(),
            ]
        );

        DB::table('docente')->updateOrInsert(
            ['email' => 'diegoherrera4900@gmail.com'],
            [
                'id'                => (string) Str::uuid(),
                'ci'                => '7654321',
                'ci_extension'      => null,
                'nombre'            => 'diego fernando',
                'apellido_paterno'  => 'herrera',
                'apellido_materno'  => 'cachi',
                'email_verified_at' => now(),
                'password'          => Hash::make('coks7554'),
                'activo'            => DB::raw('true'),
                'created_at'        => now(),
                'updated_at'        => now(),
            ]
        );

        DB::table('docente')->updateOrInsert(
            ['email' => 'barrigabermudezxavier@gmail.com'],
            [
                'id'                => (string) Str::uuid(),
                'ci'                => '22222222',
                'ci_extension'      => null,
                'nombre'            => 'xavier',
                'apellido_paterno'  => 'barriga',
                'apellido_materno'  => 'bermudez',
                'email_verified_at' => now(),
                'password'          => Hash::make('12345678'),
                'activo'            => DB::raw('true'),
                'created_at'        => now(),
                'updated_at'        => now(),
            ]
        );

        DB::table('docente')->updateOrInsert(
            ['email' => 'kleverulloa69@gmail.com'],
            [
                'id'                => (string) Str::uuid(),
                'ci'                => '33333333',
                'ci_extension'      => null,
                'nombre'            => 'klever jhosmar',
                'apellido_paterno'  => 'ulloa',
                'apellido_materno'  => 'mariscal',
                'email_verified_at' => now(),
                'password'          => Hash::make('12345678'),
                'activo'            => DB::raw('true'),
                'created_at'        => now(),
                'updated_at'        => now(),
            ]
        );

        DB::table('docente')->updateOrInsert(
            ['email' => 'miguel.a.vargas.bo@gmail.com'],
            [
                'id'                => (string) Str::uuid(),
                'ci'                => '44444444',
                'ci_extension'      => null,
                'nombre'            => 'miguel',
                'apellido_paterno'  => 'vargas',
                'apellido_materno'  => 'bo',
                'email_verified_at' => now(),
                'password'          => Hash::make('12345678'),
                'activo'            => DB::raw('true'),
                'created_at'        => now(),
                'updated_at'        => now(),
            ]
        );

        DB::table('docente')->updateOrInsert(
            ['email' => 'isnadojamir19@gmail.com'],
            [
                'id'                => (string) Str::uuid(),
                'ci'                => '55555555',
                'ci_extension'      => null,
                'nombre'            => 'kevin jamir',
                'apellido_paterno'  => 'isnado',
                'apellido_materno'  => 'apodaca',
                'email_verified_at' => now(),
                'password'          => Hash::make('12345678'),
                'activo'            => DB::raw('true'),
                'created_at'        => now(),
                'updated_at'        => now(),
            ]
        );

        DB::table('docente')->updateOrInsert(
            ['email' => 'revollofernando001@gmail.com'],
            [
                'id'                => (string) Str::uuid(),
                'ci'                => '66666666',
                'ci_extension'      => null,
                'nombre'            => 'diego fernando',
                'apellido_paterno'  => 'revollo',
                'apellido_materno'  => 'lopez',
                'email_verified_at' => now(),
                'password'          => Hash::make('12345678'),
                'activo'            => DB::raw('true'),
                'created_at'        => now(),
                'updated_at'        => now(),
            ]
        );
        
        // 3. Estudiantes con rol de Auxiliar
        $auxiliaresSeed = [
            [
                'codigo_sis'          => '11111111',
                'email_institucional' => '11111111@est.umss.edu',
                'ci'                  => '111111110',
                'nombre'              => 'du',
                'apellido_paterno'    => 'gutierrez',
                'apellido_materno'    => 'lopez',
            ],
            [
                'codigo_sis'          => '22222222',
                'email_institucional' => '22222222@est.umss.edu',
                'ci'                  => '222222220',
                'nombre'              => 'dudu',
                'apellido_paterno'    => 'gutierrez',
                'apellido_materno'    => 'lopez',
            ],
            [
                'codigo_sis'          => '33333333',
                'email_institucional' => '33333333@est.umss.edu',
                'ci'                  => '333333330',
                'nombre'              => 'edu',
                'apellido_paterno'    => 'gutierrez',
                'apellido_materno'    => 'lopez',
            ],
        ];

        foreach ($auxiliaresSeed as $aux) {
            DB::table('estudiantes')->updateOrInsert(
                ['email_institucional' => $aux['email_institucional']],
                [
                    'id'                       => (string) Str::uuid(),
                    'codigo_sis'               => $aux['codigo_sis'],
                    'ci'                       => $aux['ci'],
                    'ci_extension'             => null,
                    'nombre'                   => $aux['nombre'],
                    'apellido_paterno'         => $aux['apellido_paterno'],
                    'apellido_materno'         => $aux['apellido_materno'],
                    'password'                 => Hash::make('SMG43210'),
                    'primer_acceso_completado' => DB::raw('true'),
                    'activo'                   => DB::raw('true'),
                    'es_auxiliar'              => DB::raw('true'),
                    'created_at'               => now(),
                    'updated_at'               => now(),
                ]
            );
        }

        // Obtener los IDs (UUID) de los 3 auxiliares
        $idAuxiliar1 = DB::table('estudiantes')->where('email_institucional', '11111111@est.umss.edu')->value('id');
        $idAuxiliar2 = DB::table('estudiantes')->where('email_institucional', '22222222@est.umss.edu')->value('id');
        $idAuxiliar3 = DB::table('estudiantes')->where('email_institucional', '33333333@est.umss.edu')->value('id');
    }
}