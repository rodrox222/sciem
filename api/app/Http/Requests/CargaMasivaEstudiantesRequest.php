<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CargaMasivaEstudiantesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'archivo' => [
                'required',
                'file',
                'mimes:csv,txt',
                'max:5120', // Máximo 5MB
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'archivo.required' => 'Debe adjuntar un archivo CSV para la carga masiva.',
            'archivo.file'     => 'El elemento subido debe ser un archivo válido.',
            'archivo.mimes'    => 'El archivo debe tener formato CSV (.csv o texto delimitado).',
            'archivo.max'      => 'El archivo no debe exceder los 5 MB.',
        ];
    }
}
