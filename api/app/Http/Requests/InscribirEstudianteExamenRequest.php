<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InscribirEstudianteExamenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'codigo_sis'          => ['required', 'string', 'max:20'],
            'ci'                  => ['required', 'string', 'max:20'],
            'ci_extension'        => ['nullable', 'string', 'max:10'],
            'nombre'              => ['required', 'string', 'max:100'],
            'apellido_paterno'    => ['required', 'string', 'max:100'],
            'apellido_materno'    => ['nullable', 'string', 'max:100'],
            'email_institucional' => [
                'required',
                'string',
                'max:150',
                'regex:/^[0-9]+@est\.umss\.edu$/i',
            ],
            'estado'              => ['nullable', 'string', Rule::in(['Habilitado', 'Inhabilitado'])],
        ];
    }

    public function messages(): array
    {
        return [
            'email_institucional.regex' => 'El correo debe tener código numérico antes de @est.umss.edu.',
        ];
    }
}