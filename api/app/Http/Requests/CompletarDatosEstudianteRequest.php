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

        // Normalizar la extensión: null si viene vacía, o en mayúsculas sin espacios
        $extension = !empty($this->ci_extension) ? strtoupper(trim($this->ci_extension)) : null;

        return [
            // El CI solo es único en combinación con su complemento/extensión
            'ci' => [
                'required',
                'string',
                'regex:/^[0-9]{5,10}$/',
                Rule::unique('estudiantes', 'ci')
                    ->where(function ($query) use ($extension) {
                        return $query->where('ci_extension', $extension);
                    })
                    ->ignore($idEstudiante),
            ],
            // Complemento alfanumérico SEGIP (ej: 1A, KLH)
            'ci_extension' => [
                'nullable',
                'string',
                'max:5',
                'regex:/^[a-zA-Z0-9]+$/',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'ci.required'        => 'El número de Carnet de Identidad (CI) es obligatorio.',
            'ci.regex'           => 'El formato del CI es inválido (debe contener entre 5 y 10 dígitos numéricos sin letras ni símbolos).',
            'ci.unique'          => 'El CI ingresado con esa extensión ya pertenece a otro estudiante registrado en el sistema.',
            'ci_extension.regex' => 'El complemento del CI debe ser alfanumérico (ej. 1A, 5H).',
            'ci_extension.max'   => 'El complemento no debe superar los 5 caracteres.',
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