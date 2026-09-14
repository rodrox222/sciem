<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAulaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre'    => ['sometimes', 'required', 'string', 'max:50'],
            'ubicacion' => ['sometimes', 'required', 'string', 'max:100'],
            'estado'    => ['sometimes', 'required', 'string', Rule::in(['Disponible', 'Mantenimiento', 'Ocupada'])],
            'capacidad' => ['sometimes', 'required', 'integer', 'min:1', 'max:32767'],
        ];
    }
}