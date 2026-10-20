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
            'prioridad' => 'nullable|string|in:Normal,Alta,Urgente',
            'publico_objetivo' => 'nullable|string|in:Todos,Docentes,Estudiantes',
            'es_publica' => 'boolean',
        ];
    }
}