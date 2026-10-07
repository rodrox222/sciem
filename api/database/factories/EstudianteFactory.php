<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Estudiante>
 */
class EstudianteFactory extends Factory
{
    public function definition(): array
    {
        // email_institucional exige SOLO dígitos antes de @est.umss.edu (regex confirmado
        // en StoreEstudianteRequest/InscribirEstudianteExamenRequest) — se usa el mismo
        // código SIS como local-part para que ambos campos queden consistentes.
        $codigoSis = $this->faker->unique()->numerify('########');

        return [
            'codigo_sis'          => $codigoSis,
            'ci'                  => $this->faker->unique()->numerify('#######'),
            'ci_extension'        => null,
            'nombre'              => $this->faker->firstName(),
            'apellido_paterno'    => $this->faker->lastName(),
            'apellido_materno'    => $this->faker->lastName(),
            'email_institucional' => $codigoSis . '@est.umss.edu',
            'activo'              => true,
        ];
    }

    public function inactivo(): static
    {
        return $this->state(fn (array $attributes) => ['activo' => false]);
    }
}
