<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        //comprueba que la petición traiga un token valido caso contrario no permite el acceso a la ruta
        //return true;
        return $this->user() && ($this->user()->rol_id === 1 || optional($this->user()->role)->nombre === 'administrador');
    }

    public function rules(): array
    {
        return [
            'ci'       => ['required', 'digits_between:5,15', 'unique:users,ci'],
            'nombre'   => ['required', 'string', 'max:100'],
            'apellido' => ['required', 'string', 'max:100'],
            'email'    => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:64'],
            'rol_id'   => ['required', 'integer', 'exists:roles,id'],
            'activo'   => ['nullable', 'boolean'],
        ];
    }
}
