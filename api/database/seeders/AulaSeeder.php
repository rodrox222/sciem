<?php

namespace Database\Seeders;

use App\Models\Aula;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AulaSeeder extends Seeder
{
    public function run(): void
    {
        $bloques = [
            [
                'numero'    => 690,
                'ubicacion' => 'Edificio Multiacadémico - Planta Baja',
            ],
            [
                'numero'    => 691,
                'ubicacion' => 'Edificio Multiacadémico - Primer Piso',
            ],
            [
                'numero'    => 692,
                'ubicacion' => 'Edificio Multiacadémico - Segundo Piso',
            ],
            [
                'numero'    => 693,
                'ubicacion' => 'Edificio Multiacadémico - Tercer Piso',
            ],
        ];

        $letras = ['A', 'B', 'C', 'D', 'E', 'F'];

        foreach ($bloques as $bloque) {
            foreach ($letras as $letra) {
                $nombreConGuion = "Aula {$bloque['numero']}-{$letra}";
                $nombreSinGuion = "Aula {$bloque['numero']}{$letra}";

                Aula::firstOrCreate(
                    ['nombre' => $nombreSinGuion],
                    [
                        'id'        => (string) Str::uuid(),
                        'ubicacion' => $bloque['ubicacion'],
                        'estado'    => 'Disponible',
                        'capacidad' => 50,
                    ]
                );
            }
        }
    }
}