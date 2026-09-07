<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ci'       => 'required|string|max:20|unique:users,ci',
            'nombre'   => 'required|string|max:100',
            'apellido' => 'required|string|max:100',
            'email'    => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'rol_id'   => 'required|integer|exists:roles,id',
            'activo'   => 'nullable|boolean',
        ];
    }
}
