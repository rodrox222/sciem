<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateExamenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre'     => ['sometimes', 'required', 'string', 'max:150'],
            'id_materia' => ['sometimes', 'required', 'uuid', 'exists:materias,id'],
            'estado'     => ['sometimes', 'required', 'string', Rule::in(['Programado', 'En proceso', 'Terminado'])],
            'fecha'      => ['sometimes', 'required', 'date_format:Y-m-d'],
            'hora_ini'   => ['sometimes', 'required', 'date_format:H:i'],
            'hora_fin'   => ['sometimes', 'required', 'date_format:H:i', 'after:hora_ini'],
            'id_aula'    => ['sometimes', 'required', 'uuid', 'exists:aulas,id'],
            'id_docente' => ['sometimes', 'required', 'uuid', 'exists:docente,id'],
        ];
    }
}