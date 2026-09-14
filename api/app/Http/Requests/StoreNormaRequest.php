<?php

namespace App\Http\Requests;

use App\Models\Admin;
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
        $esAdmin = $this->user() instanceof Admin;

        return [
            'titulo'      => ['required', 'string', 'max:150'],
            'descripcion' => ['required', 'string'],
            // Si no es admin, solo se le permite registrar normas de tipo 'Particular'
            'tipo'        => [
                'required',
                'string',
                Rule::in($esAdmin ? ['General', 'Particular'] : ['Particular']),
            ],
        ];
    }
}