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
        return [
            'titulo' => 'required|string|max:255',
            'contenido' => 'required|string',
            'publico_objetivo' => 'nullable|string|in:Todos,Docentes,Estudiantes',
            'es_publica' => 'boolean',
            'id_examen' => 'nullable|uuid|exists:examenes,id', 
        ];
    }
}