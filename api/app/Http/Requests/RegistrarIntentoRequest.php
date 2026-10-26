<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class RegistrarIntentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Puede venir por ID de estudiante, o por Código SIS, o por CI
            'id_estudiante' => 'nullable|uuid|exists:estudiantes,id',
            'codigo_sis'    => 'required_without_all:id_estudiante,ci|nullable|string|max:20',
            'ci'            => 'required_without_all:id_estudiante,codigo_sis|nullable|string|max:20',
            'ci_extension'  => 'nullable|string|max:10',
            'fecha_hora'    => 'nullable|date',
            'motivo'        => 'nullable|string|max:255',
            'observacion'   => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'codigo_sis.required_without_all' => 'Debe ingresar al menos un identificador (Código SIS, Carnet de Identidad o ID de estudiante).',
            'ci.required_without_all'         => 'Debe ingresar al menos un identificador (Código SIS, Carnet de Identidad o ID de estudiante).',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Errores de validación en la solicitud.',
            'errors'  => $validator->errors(),
        ], 422));
    }
}