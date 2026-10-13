<?php

namespace App\Http\Requests;

use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() instanceof Admin;
    }

    public function rules(): array
    {
        // 1. Obtener el ID del usuario de la ruta de forma segura (sea string, uuid u objeto)
        $routeParam = $this->route('user') ?? $this->route('id') ?? $this->route('uuid');
        $userId = is_object($routeParam) ? ($routeParam->id ?? (string) $routeParam) : (string) $routeParam;

        return [
            'tipo_usuario'     => ['sometimes', 'string', 'in:admin,docente,auxiliar'],
            'ci'               => [
                'sometimes',
                'nullable',
                'string',
                'max:20',
                function ($attribute, $value, $fail) use ($userId) {
                    $ciLimpio = trim((string) $value);

                    $tablas = [
                        'admin'    => Admin::class,
                        'docente'  => Docente::class,
                        'auxiliar' => Auxiliar::class,
                    ];

                    foreach ($tablas as $modelo) {
                        $query = $modelo::where('ci', $ciLimpio);

                        // Ignorar al propio usuario que se está editando
                        if (!empty($userId)) {
                            $query->where('id', '!=', $userId);
                        }

                        if ($query->exists()) {
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
                function ($attribute, $value, $fail) use ($userId) {
                    $extensionLimpia = trim((string) $value);
                    if (empty($extensionLimpia)) {
                        return;
                    }

                    $tablasConExtension = [
                        'docente'  => Docente::class,
                        'auxiliar' => Auxiliar::class,
                    ];

                    foreach ($tablasConExtension as $modelo) {
                        $query = $modelo::where('ci_extension', $extensionLimpia);

                        // Ignorar al propio usuario que se está editando
                        if (!empty($userId)) {
                            $query->where('id', '!=', $userId);
                        }

                        if ($query->exists()) {
                            $fail('La extensión de CI ya se encuentra registrada en el sistema.');
                            return;
                        }
                    }
                },
            ],
            'nombre'           => ['sometimes', 'required', 'string', 'max:100'],
            'apellido_paterno' => ['sometimes', 'required', 'string', 'max:100'],
            'apellido_materno' => ['nullable', 'string', 'max:100'],
            'password'         => ['nullable', 'string', 'min:8', 'max:64'],
            'activo'           => ['sometimes', 'boolean'],
            'email'            => [
                'nullable',
                'string',
                'email',
                'max:150',
                function ($attribute, $value, $fail) use ($userId) {
                    $emailLimpio = trim((string) $value);
                    if (empty($emailLimpio)) {
                        return;
                    }

                    $tablasConEmail = [
                        'docente'  => Docente::class,
                        'auxiliar' => Auxiliar::class,
                    ];

                    foreach ($tablasConEmail as $modelo) {
                        $query = $modelo::where('email', $emailLimpio);

                        // Ignorar al propio usuario que se está editando
                        if (!empty($userId)) {
                            $query->where('id', '!=', $userId);
                        }

                        if ($query->exists()) {
                            $fail('El correo electrónico ya se encuentra registrado en el sistema.');
                            return;
                        }
                    }
                },
            ],
        ];
    }
}