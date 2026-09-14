<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExamenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre'     => ['required', 'string', 'max:150'],
            'id_materia' => ['required', 'uuid', 'exists:materias,id'],
            'estado'     => ['nullable', 'string', Rule::in(['Programado', 'En proceso', 'Terminado'])],
            'fecha'      => ['required', 'date_format:Y-m-d'],
            'hora_ini'   => ['required', 'date_format:H:i'],
            'hora_fin'   => ['required', 'date_format:H:i', 'after:hora_ini'],
            'id_aula'    => ['required', 'uuid', 'exists:aulas,id'],
            'id_docente' => ['required', 'uuid', 'exists:docente,id'],
        ];
    }
}