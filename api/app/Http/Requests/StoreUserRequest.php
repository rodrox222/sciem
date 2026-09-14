<?php

namespace App\Http\Requests;

use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Solo un Administrador autenticado puede registrar nuevos usuarios
        return $this->user() instanceof Admin;
    }

    public function rules(): array
    {
        $tipo = $this->input('tipo_usuario');

        // Determinar dinámicamente la tabla según el tipo
        $tabla = match ($tipo) {
            'docente'  => 'docente',
            'auxiliar' => 'auxiliar',
            default    => 'admin',
        };

        return [
            'tipo_usuario'     => ['required', 'string', 'in:admin,docente,auxiliar'],
            'ci'               => ['required', 'string', 'max:20', Rule::unique($tabla, 'ci')],
            'ci_extension'     => ['nullable', 'string', 'max:10'],
            'nombre'           => ['required', 'string', 'max:100'],
            'apellido_paterno' => ['required', 'string', 'max:100'],
            'apellido_materno' => ['nullable', 'string', 'max:100'],
            'password'         => ['required', 'string', 'min:8', 'max:64'],
            'activo'           => ['nullable', 'boolean'],

            // El email solo es obligatorio y validado si el tipo es docente o auxiliar
            'email' => [
                Rule::requiredIf(in_array($tipo, ['docente', 'auxiliar'])),
                'nullable',
                'string',
                'email',
                'max:150',
                Rule::when(
                    in_array($tipo, ['docente', 'auxiliar']),
                    [Rule::unique($tabla, 'email')]
                ),
            ],
        ];
    }
}
