<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Admin>
 */
class AdminFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            // Tabla `admin` NO tiene columna email (confirmado por el schema) — no incluirla aquí.
            'ci'               => $this->faker->unique()->numerify('#######'),
            'ci_extension'     => null,
            'nombre'           => $this->faker->firstName(),
            'apellido_paterno' => $this->faker->lastName(),
            'apellido_materno' => $this->faker->lastName(),
            'password'         => static::$password ??= Hash::make('password'),
            'activo'           => true,
            'ultimo_acceso'    => null,
        ];
    }

    public function inactivo(): static
    {
        return $this->state(fn (array $attributes) => ['activo' => false]);
    }
}
