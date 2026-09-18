<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreNormaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'titulo'      => ['required', 'string', 'max:150'],
            'descripcion' => ['required', 'string'],
            // Las normas particulares solo se crean desde un examen.
            'tipo'        => [
                'required',
                'string',
                Rule::in(['General']),
            ],
        ];
    }
}