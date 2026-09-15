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
            'nombre'    => ['required', 'string', 'max:50'],
            'ubicacion' => ['required', 'string', 'max:100'],
            'estado'    => ['nullable', 'string', Rule::in(['Disponible', 'Mantenimiento', 'Ocupada'])],
            'capacidad' => ['required', 'integer', 'min:1', 'max:32767'],
        ];
    }
}