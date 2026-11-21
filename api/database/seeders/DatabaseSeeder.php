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
            EstudianteSeeder::class,
            AulaSeeder::class,
            MateriaSeeder::class,
            UsersSeeder::class,
            NormaSeeder::class,
            ExamenSeeder2::class,
            GestionSeeder::class,
            PrerrequisitoSeeder::class,
        ]);
    }
}
