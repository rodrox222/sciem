<?php

namespace Database\Factories;

use App\Models\Aula;
use App\Models\Docente;
use App\Models\Materia;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Examen>
 */
class ExamenFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nombre'     => $this->faker->randomElement(['Primer Parcial', 'Segundo Parcial', 'Examen Final']),
            'id_materia' => Materia::factory(),
            // Valores reales (CHECK constraint en BD): Programado|En proceso|Terminado.
            // 'Cancelado' aún no existe en el constraint (ver hallazgos pendientes).
            'estado'     => 'Programado',
            'fecha'      => now()->addDays($this->faker->numberBetween(1, 30))->toDateString(),
            'hora_ini'   => '08:00',
            'hora_fin'   => '09:30',
            'id_aula'    => Aula::factory(),
            'id_docente' => Docente::factory(),
        ];
    }

    public function terminado(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => 'Terminado',
            'fecha'  => now()->subDays($this->faker->numberBetween(1, 30))->toDateString(),
        ]);
    }
}
