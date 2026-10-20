<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreIncidenciaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; 
    }

    public function rules(): array
    {
        return [
            'id_examen' => 'required|uuid|exists:examenes,id',
            'id_estudiante' => 'nullable|uuid|exists:estudiantes,id',
            'id_aula_asignada' => 'nullable|uuid|exists:aulas,id',
            'tipo_incidencia' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
        ];
    }
}