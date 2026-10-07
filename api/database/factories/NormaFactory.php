<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Norma>
 */
class NormaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'titulo'      => $this->faker->sentence(3),
            'descripcion' => $this->faker->sentence(10),
            // Valores reales (CHECK constraint en BD): General|Particular. Solo Admin crea
            // 'General' vía POST /normas; 'Particular' se crea vía el flujo de examen.
            'tipo'        => 'General',
        ];
    }

    public function particular(): static
    {
        return $this->state(fn (array $attributes) => ['tipo' => 'Particular']);
    }
}
