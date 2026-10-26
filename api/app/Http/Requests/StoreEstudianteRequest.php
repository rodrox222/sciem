<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEstudianteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'codigo_sis'          => ['required', 'string', 'max:20', 'unique:estudiantes,codigo_sis'],
            'ci'                  => ['nullable', 'string', 'max:20'],
            'ci_extension'        => ['nullable', 'string', 'max:10'],
            'nombre'              => ['required', 'string', 'max:100'],
            'apellido_paterno'    => ['required', 'string', 'max:100'],
            'apellido_materno'    => ['nullable', 'string', 'max:100'],
            'email_institucional' => [
                'required',
                'string',
                'max:150',
                'regex:/^[0-9]+@est\.umss\.edu$/i', // Solo dígitos antes de @est.umss.edu
                'unique:estudiantes,email_institucional',
            ],
            'activo'              => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'email_institucional.regex' => 'El correo debe ser institucional con formato numérico válido (ej. 202104589@est.umss.edu).',
            'email_institucional.unique' => 'Este correo institucional ya está registrado.',
        ];
    }
}