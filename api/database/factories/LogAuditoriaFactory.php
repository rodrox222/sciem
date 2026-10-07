<?php

namespace Database\Factories;

use App\Models\Admin;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\LogAuditoria>
 */
class LogAuditoriaFactory extends Factory
{
    public function definition(): array
    {
        return [
            // Por defecto simula un Admin como autor; sobrescribe user_type/user_id/
            // rol_en_el_momento en el test si necesitas otro rol específico.
            'user_type'         => Admin::class,
            'user_id'           => Admin::factory(),
            'rol_en_el_momento' => 'admin',
            'usuario_nombre'    => $this->faker->name(),
            'usuario_email'     => $this->faker->unique()->safeEmail(),
            'modulo'            => $this->faker->randomElement(['Usuarios', 'Aulas', 'Normas', 'Examenes', 'Estudiantes', 'Autenticacion']),
            'accion'            => $this->faker->randomElement(['USUARIO_CREADO', 'AULA_CREADA', 'LOGIN_EXITOSO']),
            'ip_origen'         => $this->faker->ipv4(),
            'user_agent'        => $this->faker->userAgent(),
            'detalles'          => null,
            'created_at'        => now(),
        ];
    }
}
