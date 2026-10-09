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
        // Administrador
        DB::table('admin')->updateOrInsert(
            ['ci' => '1234567'],
            [
                'id' => (string) Str::uuid(),
                'ci_extension' => null,
                'nombre' => 'Admin',
                'apellido_paterno' => 'General',
                'apellido_materno' => null,
                'password' => Hash::make('qwerasdf'),
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Docente
        DB::table('docente')->updateOrInsert(
            ['email' => 'docente@fcyt.umss.edu.bo'],
            [
                'id' => (string) Str::uuid(),
                'ci' => '11111111',
                'ci_extension' => null,
                'nombre' => 'un docente',
                'apellido_paterno' => 'cualquier',
                'apellido_materno' => 'mamani',
                'email_verified_at' => now(),
                'password' => Hash::make('docente123'),
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        DB::table('docente')->updateOrInsert(
            ['email' => 'diegoherrera4900@gmail.com'],
            [
                'id' => (string) Str::uuid(),
                'ci' => '7654321',
                'ci_extension' => null,
                'nombre' => 'diego fernando',
                'apellido_paterno' => 'herrera',
                'apellido_materno' => 'cachi',
                'email_verified_at' => now(),
                'password' => Hash::make('coks7554'),
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        DB::table('docente')->updateOrInsert(
            ['email' => 'barrigabermudezxavier@gmail.com'],
            [
                'id' => (string) Str::uuid(),
                'ci' => '22222222',
                'ci_extension' => null,
                'nombre' => 'xavier',
                'apellido_paterno' => 'barriga',
                'apellido_materno' => 'bermudez',
                'email_verified_at' => now(),
                'password' => Hash::make('12345678'),
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );


        DB::table('docente')->updateOrInsert(
            ['email' => 'kleverulloa69@gmail.com'],
            [
                'id' => (string) Str::uuid(),
                'ci' => '33333333',
                'ci_extension' => null,
                'nombre' => 'klever jhosmar',
                'apellido_paterno' => 'ulloa',
                'apellido_materno' => 'mariscal',
                'email_verified_at' => now(),
                'password' => Hash::make('12345678'),
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        DB::table('docente')->updateOrInsert(
            ['email' => 'miguel.a.vargas.bo@gmail.com'],
            [
                'id' => (string) Str::uuid(),
                'ci' => '44444444',
                'ci_extension' => null,
                'nombre' => 'miguel',
                'apellido_paterno' => 'vargas',
                'apellido_materno' => 'bo',
                'email_verified_at' => now(),
                'password' => Hash::make('12345678'),
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        DB::table('docente')->updateOrInsert(
            ['email' => 'isnadojamir19@gmail.com'],
            [
                'id' => (string) Str::uuid(),
                'ci' => '55555555',
                'ci_extension' => null,
                'nombre' => 'kevin jamir',
                'apellido_paterno' => 'isnado',
                'apellido_materno' => 'apodaca',
                'email_verified_at' => now(),
                'password' => Hash::make('12345678'),
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        DB::table('docente')->updateOrInsert(
            ['email' => 'isnadojamir19@gmail.com'],
            [
                'id' => (string) Str::uuid(),
                'ci' => '55555555',
                'ci_extension' => null,
                'nombre' => 'kevin jamir',
                'apellido_paterno' => 'isnado',
                'apellido_materno' => 'apodaca',
                'email_verified_at' => now(),
                'password' => Hash::make('12345678'),
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        DB::table('docente')->updateOrInsert(
            ['email' => 'revollofernando001@gmail.com'],
            [
                'id' => (string) Str::uuid(),
                'ci' => '66666666',
                'ci_extension' => null,
                'nombre' => 'diego fernando',
                'apellido_paterno' => 'revollo',
                'apellido_materno' => 'lopez',
                'email_verified_at' => now(),
                'password' => Hash::make('12345678'),
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        
        // Auxiliar
        DB::table('auxiliar')->updateOrInsert(
            ['email' => '202301640@est.umss.edu'],
            [
                'id' => (string) Str::uuid(),
                'ci' => '11111111',
                'ci_extension' => null,
                'nombre' => 'auxiliar',
                'apellido_paterno' => 'ejemplo',
                'apellido_materno' => null,
                'email_verified_at' => now(),
                'password' => Hash::make('SMG43210'),
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
