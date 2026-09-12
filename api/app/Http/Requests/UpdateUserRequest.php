<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        //return true;
        return $this->user() && ($this->user()->rol_id === 1 || optional($this->user()->role)->nombre === 'administrador');
    }

    public function rules(): array
    {
        $userId = $this->route('user') ?? $this->route('id');

        return [
            'ci'       => ['sometimes', 'required', 'digits_between:5,15', Rule::unique('users', 'ci')->ignore($userId)],
            'nombre'   => ['sometimes', 'required', 'string', 'max:100'],
            'apellido' => ['sometimes', 'required', 'string', 'max:100'],
            'email'    => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'password' => ['nullable', 'string', 'min:8', 'max:64'],
            'rol_id'   => ['sometimes', 'required', 'integer', 'exists:roles,id'],
            'activo'   => ['sometimes', 'boolean'],
        ];
    }
}
