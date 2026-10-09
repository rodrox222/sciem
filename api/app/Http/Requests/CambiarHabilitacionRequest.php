<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CambiarHabilitacionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'estado'        => ['required', 'string', 'in:Habilitado,Inhabilitado'],
            'motivo_estado' => ['required', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'estado.in'              => 'El estado debe ser Habilitado o Inhabilitado.',
            'motivo_estado.required' => 'Debe ingresar un motivo al cambiar manualmente el estado del estudiante.',
        ];
    }
}