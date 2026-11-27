<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAulaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // La autorización de rol se gestiona en la ruta/middleware
    }

    public function rules(): array
    {
        return [
            'nombre'    => [
                'required',
                'string',
                'max:50',
                Rule::unique('aulas', 'nombre')->whereNull('deleted_at'),
            ],
            'ubicacion' => ['required', 'string', 'max:100'],
            'estado'    => ['nullable', 'string', Rule::in(['Disponible', 'Mantenimiento', 'Ocupada'])],
            'capacidad' => ['required', 'integer', 'min:1', 'max:32767'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required'    => 'El código o nombre del ambiente es obligatorio.',
            'nombre.max'         => 'El código o nombre del ambiente no puede superar los 50 caracteres.',
            'nombre.unique'      => 'Ya existe un ambiente registrado con ese código o nombre.',
            'ubicacion.required' => 'La ubicación del ambiente es obligatoria.',
            'ubicacion.max'      => 'La ubicación no puede superar los 100 caracteres.',
            'estado.in'          => 'El estado debe ser Disponible, Mantenimiento u Ocupada.',
            'capacidad.required' => 'La capacidad del ambiente es obligatoria.',
            'capacidad.integer'  => 'La capacidad debe ser un número entero.',
            'capacidad.min'      => 'La capacidad mínima debe ser 1 estudiante.',
            'capacidad.max'      => 'La capacidad máxima permitida es 32767.',
        ];
    }
}
