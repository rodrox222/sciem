<?php

namespace App\Http\Requests;

use App\Models\Docente;
use Illuminate\Foundation\Http\FormRequest;

class StoreNoticiaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $esDocente = $this->user() instanceof Docente;

        return [
            'titulo' => 'required|string|max:255',
            'contenido' => 'required|string',
            'publico_objetivo' => 'nullable|string|in:Todos,Docentes,Estudiantes',
            'es_publica' => 'boolean',
            'id_examen' => [$esDocente ? 'required' : 'nullable', 'uuid', 'exists:examenes,id'],
            'id_materia' => 'nullable|uuid|exists:materias,id',
            'materia_id' => 'nullable|uuid|exists:materias,id',
        ];
    }

    public function messages(): array
    {
        return [
            'id_examen.required' => 'Como docente, debes vincular obligatoriamente la noticia a un examen.',
        ];
    }
}