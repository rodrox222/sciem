<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class SubirFotoEstudianteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Acepta fotos comunes tomadas por cámara/webcam hasta 5MB
            'foto' => 'required|file|mimes:jpeg,jpg,png,webp|max:5120',
        ];
    }

    public function messages(): array
    {
        return [
            'foto.required' => 'Debe enviar el archivo de la fotografía tomada.',
            'foto.file'     => 'El campo foto debe ser un archivo válido.',
            'foto.mimes'    => 'La fotografía debe estar en formato JPEG, JPG, PNG o WebP.',
            'foto.max'      => 'La fotografía no debe superar los 5 MB.',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Error de validación al cargar la imagen.',
            'errors'  => $validator->errors(),
        ], 422));
    }
}