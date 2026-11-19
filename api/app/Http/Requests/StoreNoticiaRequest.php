<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreNoticiaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $user = $this->user();
        $esDocente = $user instanceof \App\Models\Docente;

        return [
            'titulo' => 'required|string|max:255',
            'contenido' => 'required|string',
            'publico_objetivo' => [
                'nullable',
                'string',
                $esDocente ? 'in:Estudiantes,Docentes' : 'in:Todos,Docentes,Estudiantes',
            ],
            'es_publica' => 'boolean',
            'id_examen' => 'nullable|uuid|exists:examenes,id',
            'id_materia' => $esDocente ? 'required_without:materia_id|nullable|uuid|exists:materias,id' : 'nullable|uuid|exists:materias,id',
            'materia_id' => $esDocente ? 'required_without:id_materia|nullable|uuid|exists:materias,id' : 'nullable|uuid|exists:materias,id',
        ];
    }

    public function messages(): array
    {
        return [
            'publico_objetivo.in' => 'La opción "Todos" está restringida al administrador. Seleccione "Estudiantes" o "Docentes".',
            'id_materia.required_without' => 'La materia es obligatoria para los comunicados del docente.',
            'materia_id.required_without' => 'La materia es obligatoria para los comunicados del docente.',
        ];
    }
}