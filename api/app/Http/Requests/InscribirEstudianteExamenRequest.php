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
            'email_institucional' => ['required', 'email', 'max:150'],
            'estado'              => ['nullable', 'string', Rule::in(['Habilitado', 'Inhabilitado'])],
        ];
    }
}