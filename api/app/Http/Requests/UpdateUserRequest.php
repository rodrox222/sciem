<?php

namespace App\Http\Requests;

use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Solo administradores pueden actualizar datos de usuarios
        return $this->user() instanceof Admin;
    }

    public function rules(): array
    {
        // Obtener el ID/UUID
        $userId = $this->route('user') ?? $this->route('id');

        // Determinar el tipo de usuario
        $tipo = $this->input('tipo_usuario', $this->route('tipo'));

        $tabla = match ($tipo) {
            'docente'  => 'docente',
            'auxiliar' => 'auxiliar',
            default    => 'admin',
        };

        return [
            'tipo_usuario'     => ['sometimes', 'string', 'in:admin,docente,auxiliar'],
            'ci'               => ['sometimes', 'required', 'string', 'max:20', Rule::unique($tabla, 'ci')->ignore($userId)],
            'ci_extension'     => ['nullable', 'string', 'max:10'],
            'nombre'           => ['sometimes', 'required', 'string', 'max:100'],
            'apellido_paterno' => ['sometimes', 'required', 'string', 'max:100'],
            'apellido_materno' => ['nullable', 'string', 'max:100'],
            'password'         => ['nullable', 'string', 'min:8', 'max:64'],
            'activo'           => ['sometimes', 'boolean'],

            // Validación de email para docente y auxiliar
            'email' => [
                in_array($tabla, ['docente', 'auxiliar']) ? 'sometimes' : 'prohibited',
                'nullable',
                'string',
                'email',
                'max:150',
                Rule::when(
                    in_array($tabla, ['docente', 'auxiliar']),
                    [Rule::unique($tabla, 'email')->ignore($userId)]
                ),
            ],
        ];
    }
}
