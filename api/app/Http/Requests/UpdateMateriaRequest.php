<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMateriaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => [
                'sometimes',
                'required',
                'string',
                'max:150',
                Rule::unique('materias', 'nombre')
                    ->whereNull('deleted_at')
                    ->ignore($this->route('id') ?? $this->route('materia')),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre de la materia es obligatorio.',
            'nombre.max'      => 'El nombre de la materia no puede superar los 150 caracteres.',
            'nombre.unique'   => 'Ya existe otra materia registrada con ese nombre.',
        ];
    }
}
