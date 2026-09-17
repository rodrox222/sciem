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
            'ci'                  => ['required', 'string', 'max:20'],
            'ci_extension'        => ['nullable', 'string', 'max:10'],
            'nombre'              => ['required', 'string', 'max:100'],
            'apellido_paterno'    => ['required', 'string', 'max:100'],
            'apellido_materno'    => ['nullable', 'string', 'max:100'],
            'email_institucional' => ['required', 'email', 'max:150', 'unique:estudiantes,email_institucional'],
            'activo'              => ['nullable', 'boolean'],
        ];
    }
}