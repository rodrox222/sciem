<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SyncNormasExamenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'normas'   => ['required', 'array'],
            'normas.*' => ['uuid', 'exists:normas,id'],
        ];
    }
}