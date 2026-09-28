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
            'estado'                => ['required', 'string', 'in:Habilitado,Inhabilitado'],
            'motivo_inhabilitacion' => [
                'required_if:estado,Inhabilitado',
                'nullable',
                'string',
                'max:500',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'estado.in'                          => 'El estado debe ser Habilitado o Inhabilitado.',
            'motivo_inhabilitacion.required_if' => 'Debe ingresar un motivo cuando se inhabilita al estudiante.',
        ];
    }
}