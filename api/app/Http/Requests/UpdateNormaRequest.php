<?php

namespace App\Http\Requests;

use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateNormaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $esAdmin = $this->user() instanceof Admin;

        return [
            'titulo'      => ['sometimes', 'required', 'string', 'max:150'],
            'descripcion' => ['sometimes', 'required', 'string'],
            'tipo'        => [
                'sometimes',
                'required',
                'string',
                Rule::in($esAdmin ? ['General', 'Particular'] : ['Particular']),
            ],
        ];
    }
}