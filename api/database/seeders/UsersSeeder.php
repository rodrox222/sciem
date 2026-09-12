<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UsersSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('users')->insertOrIgnore([
            [
                'rol_id' => 1, // Administrador
                'ci' => '1234567',
                'nombre' => 'Admin',
                'apellido' => 'General',
                'email' => 'south.solutions.company@gmail.com',
                'password' => Hash::make('patitoinsano'),
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'rol_id' => 2, // docente
                'ci' => '7654321',
                'nombre' => 'diego fernando',
                'apellido' => 'herrera cachi',
                'email' => 'diegoherrera4900@gmail.com',
                'password' => Hash::make('coks7554'),
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'rol_id' => 3,
                'ci' => '11111111',
                'nombre' => 'diego 2',
                'apellido' => 'herrera 2',
                'email' => '202301640@est.umss.edu',
                'password' => Hash::make('SMG43210'),
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
