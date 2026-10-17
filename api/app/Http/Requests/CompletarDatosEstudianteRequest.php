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
            'ci' => [
                'required',
                'string',
                'max:20',
                Rule::unique('estudiantes', 'ci')
                    ->where(function ($query) {
                        return $query->where('ci_extension', $this->input('ci_extension'));
                    })
                    ->ignore($idEstudiante),
            ],
            // 'nullable' permite dejarlo vacío o no mandarlo en el JSON
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
            'ci.unique'       => 'Ya existe un estudiante registrado con este número y extensión de carnet.',
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