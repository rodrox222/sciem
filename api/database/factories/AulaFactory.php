<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Aula>
 */
class AulaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nombre'    => 'A-' . $this->faker->unique()->numberBetween(100, 999),
            'ubicacion' => $this->faker->randomElement(['Bloque A', 'Bloque B', 'Bloque C']) . ' - Piso ' . $this->faker->numberBetween(1, 4),
            'estado'    => 'Disponible', // valores reales: Disponible|Mantenimiento|Ocupada
            'capacidad' => $this->faker->numberBetween(20, 60),
        ];
    }

    public function enMantenimiento(): static
    {
        return $this->state(fn (array $attributes) => ['estado' => 'Mantenimiento']);
    }
}
