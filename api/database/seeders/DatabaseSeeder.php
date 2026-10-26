<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            ConfiguracionSistemaSeeder::class,
            UsersSeeder::class,
            EstudianteSeeder::class,
            ExamenSeeder2::class,
            //ExamenSeeder2::class, es para probar examenes que ya terminan su horario y no permiten más ingresos
            PrerrequisitoSeeder::class,
        ]);
    }
}
