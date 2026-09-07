<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('user') ?? $this->route('id');

        return [
            'ci'       => ['sometimes', 'required', 'string', 'max:20', Rule::unique('users', 'ci')->ignore($userId)],
            'nombre'   => 'sometimes|required|string|max:100',
            'apellido' => 'sometimes|required|string|max:100',
            'email'    => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'password' => 'nullable|string|min:8',
            'rol_id'   => 'sometimes|required|integer|exists:roles,id',
            'activo'   => 'sometimes|boolean',
        ];
    }
}
