<?php

namespace Database\Seeders;

use App\Models\Aula;
use App\Models\Docente;
use App\Models\Examen;
use App\Models\Materia;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ExaCargaMasivaSeeder extends Seeder
{
    public function run(): void
    {
        $docente = Docente::where('email', 'diegoherrera4900@gmail.com')->first();

        if (!$docente) {
            $this->command->error('No se encontró el docente diegoherrera4900@gmail.com');
            return;
        }

        $materia = Materia::firstOrCreate(
            ['nombre' => 'Taller de Ingeniería de Software'],
            ['id' => (string) Str::uuid()]
        );

        $aula = Aula::firstOrCreate(
            ['nombre' => 'Laboratorio TIS'],
            [
                'id'        => (string) Str::uuid(),
                'ubicacion' => 'Edificio FCyT',
                'estado'    => 'Disponible',
                'capacidad' => 50,
            ]
        );

        // un único examen asignado con un UUID fijo 
        $examenIdFijo = '11111111-2222-3333-4444-555555555555';

        Examen::updateOrCreate(
            ['id' => $examenIdFijo],
            [
                'nombre'     => 'Examen Parcial - Carga Masiva Pruebas',
                'id_materia' => $materia->id,
                'id_aula'    => $aula->id,
                'id_docente' => $docente->id,
                'estado'     => 'Programado',
                'fecha'      => '2026-10-20',
                'hora_ini'   => '08:15:00',
                'hora_fin'   => '10:00:00',
            ]
        );

        $this->command->info("Examen de prueba listo con UUID: {$examenIdFijo}");
    }
}