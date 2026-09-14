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