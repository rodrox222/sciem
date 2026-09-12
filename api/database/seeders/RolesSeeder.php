<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolesSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('roles')->insertOrIgnore([
            [
                'id' => 1,
                'nombre' => 'administrador',
                'descripcion' => 'Configuración general, datos maestros y gestión de usuarios',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 2,
                'nombre' => 'docente',
                'descripcion' => 'Supervisión académica, monitoreo en tiempo real e incidencias',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 3,
                'nombre' => 'control_ingreso',
                'descripcion' => 'Validación de identidad y registro de acceso en puerta',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
