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
                    ->where(fn ($q) => $q->whereRaw('activo is true'))
                    ->ignore($this->route('id') ?? $this->route('materia')),
            ],
        ];
    }
}