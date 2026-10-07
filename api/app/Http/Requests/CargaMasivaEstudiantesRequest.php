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
                'mimes:csv,txt,xlsx,xls',
                'max:20480',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'archivo.required' => 'Debe adjuntar un archivo (CSV o Excel) para la carga masiva.',
            'archivo.file'     => 'El elemento subido debe ser un archivo válido.',
            'archivo.mimes'    => 'El archivo debe tener formato compatible (.csv, .xlsx o .xls).',
            'archivo.max'      => 'El archivo no debe exceder los 20 MB.',
        ];
    }
}