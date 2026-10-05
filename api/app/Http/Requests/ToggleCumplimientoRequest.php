<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ToggleCumplimientoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'cumplido' => ['required', 'boolean'],
        ];
    }
}