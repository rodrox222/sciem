<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Auxiliar>
 */
class AuxiliarFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'ci'               => $this->faker->unique()->numerify('#######'),
            'ci_extension'     => null,
            'nombre'           => $this->faker->firstName(),
            'apellido_paterno' => $this->faker->lastName(),
            'apellido_materno' => $this->faker->lastName(),
            // Dominio real confirmado en AuthController para discriminar el rol al login.
            'email'            => $this->faker->unique()->numerify('########') . '@est.umss.edu',
            'email_verified_at' => now(),
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
