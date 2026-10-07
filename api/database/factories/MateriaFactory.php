<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Materia>
 */
class MateriaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nombre' => $this->faker->unique()->randomElement([
                'Cálculo I', 'Cálculo II', 'Física I', 'Física II', 'Álgebra Lineal',
                'Programación I', 'Programación II', 'Estructuras de Datos',
                'Base de Datos I', 'Sistemas Operativos',
            ]) . ' ' . $this->faker->unique()->numberBetween(1, 1000), // sufijo para unicidad en tests
        ];
    }
}
