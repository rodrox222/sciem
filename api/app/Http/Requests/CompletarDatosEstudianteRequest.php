<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class CompletarDatosEstudianteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $idEstudiante = $this->route('id') ?? $this->user()?->id;

        return [
            // Numérico, longitud válida y estrictamente único
            'ci' => [
                'required',
                'string',
                'regex:/^[0-9]{5,10}$/',
                Rule::unique('estudiantes', 'ci')->ignore($idEstudiante),
            ],
            // Extensiones departamentales estándar de Bolivia
            'ci_extension' => [
                'nullable',
                'string',
                'max:10',
                'in:CB,LP,SC,OR,PT,TJ,CH,BE,PD',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'ci.required'     => 'El número de Carnet de Identidad (CI) es obligatorio.',
            'ci.regex'        => 'El formato del CI es inválido (debe contener entre 5 y 10 dígitos numéricos sin letras ni símbolos).',
            'ci.unique'       => 'El CI ingresado ya pertenece a otro estudiante registrado en el sistema.',
            'ci_extension.in' => 'La extensión debe ser válida (ej. CB, LP, SC, OR, PT, TJ, CH, BE, PD).',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Errores de validación.',
            'errors'  => $validator->errors(),
        ], 422));
    }
}