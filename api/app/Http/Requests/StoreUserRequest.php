<?php

namespace App\Http\Requests;

use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Solo un Administrador autenticado puede registrar nuevos usuarios
        return $this->user() instanceof Admin;
    }

    public function rules(): array
    {
        $tipo = $this->input('tipo_usuario');

        return [
            'tipo_usuario'     => ['required', 'string', 'in:admin,docente,auxiliar'],
            'ci'               => [
                'required',
                'string',
                'max:20',
                function ($attribute, $value, $fail) {
                    $ciLimpio = trim((string) $value);

                    $tablas = [
                        'admin'    => Admin::class,
                        'docente'  => Docente::class,
                        'auxiliar' => Auxiliar::class,
                    ];

                    foreach ($tablas as $modelo) {
                        if ($modelo::where('ci', $ciLimpio)->exists()) {
                            $fail('El CI ya se encuentra registrado en el sistema.');
                            return;
                        }
                    }
                },
            ],
            'ci_extension'     => [
                'nullable',
                'string',
                'max:10',
                function ($attribute, $value, $fail) {
                    $extensionLimpia = trim((string) $value);
                    if (empty($extensionLimpia)) {
                        return;
                    }

                    $tablasConExtension = [
                        'docente'  => Docente::class,
                        'auxiliar' => Auxiliar::class,
                    ];

                    foreach ($tablasConExtension as $modelo) {
                        if ($modelo::where('ci_extension', $extensionLimpia)->exists()) {
                            $fail('La extensión de CI ya se encuentra registrada en el sistema.');
                            return;
                        }
                    }
                },
            ],
            'nombre'           => ['required', 'string', 'max:100'],
            'apellido_paterno' => ['required', 'string', 'max:100'],
            'apellido_materno' => ['nullable', 'string', 'max:100'],
            'password'         => ['required', 'string', 'min:8', 'max:64'],
            'activo'           => ['nullable', 'boolean'],

            // Email obligatorio para docente y auxiliar con dominio institucional estricto
            'email'            => [
                in_array($tipo, ['docente', 'auxiliar']) ? 'required' : 'nullable',
                'string',
                'max:150',
                'regex:/^[a-zA-Z0-9._%+-]+@(est\.umss\.edu|gmail\.com)$/i',
                function ($attribute, $value, $fail) {
                    $emailLimpio = trim((string) $value);
                    if (empty($emailLimpio)) {
                        return;
                    }

                    $tablasConEmail = [
                        'docente'  => Docente::class,
                        'auxiliar' => Auxiliar::class,
                    ];

                    foreach ($tablasConEmail as $modelo) {
                        if ($modelo::where('email', $emailLimpio)->exists()) {
                            $fail('El correo electrónico ya se encuentra registrado en el sistema.');
                            return;
                        }
                    }
                },
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'email.regex'    => 'El correo debe ser institucional.',
            'email.required' => 'El correo electrónico es obligatorio.',
        ];
    }
}