<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ConfiguracionSistemaSeeder extends Seeder
{
    public function run(): void
    {
        $configuraciones = [
            [
                'id'          => (string) Str::uuid(),
                'clave'       => 'tiempo_inactividad_minutos',
                'valor'       => '5',
                'descripcion' => 'Tiempo límite de inactividad de sesión en minutos antes del cierre automático.',
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
        ];

        foreach ($configuraciones as $config) {
            DB::table('configuraciones_sistema')->updateOrInsert(
                ['clave' => $config['clave']],
                [
                    'id'          => $config['id'],
                    'valor'       => $config['valor'],
                    'descripcion' => $config['descripcion'],
                    'updated_at'  => now(),
                ]
            );
        }
    }
}
