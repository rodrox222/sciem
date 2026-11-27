<?php

namespace App\Http\Requests;

use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() instanceof Admin;
    }

    public function rules(): array
    {
        $routeParam = $this->route('user') ?? $this->route('id') ?? $this->route('uuid');
        $userId = is_object($routeParam) ? ($routeParam->id ?? (string) $routeParam) : (string) $routeParam;

        $ciLimpio = $this->filled('ci') ? trim((string) $this->input('ci')) : null;
        $extensionLimpia = $this->has('ci_extension') ? trim((string) $this->input('ci_extension')) : null;

        return [
            'tipo_usuario'     => [
                'sometimes',
                'string',
                'in:admin,docente,auxiliar',
                function ($attribute, $value, $fail) use ($userId) {
                    if ($value === 'admin') {
                        $adminExistente = Admin::first();
                        if ($adminExistente && (string) $adminExistente->id !== (string) $userId) {
                            $fail('Ya existe un administrador en el sistema. No se permite asignar el rol de administrador a otro usuario.');
                        }
                    }
                },
            ],
            'ci'               => [
                'sometimes',
                'required',
                'string',
                'max:20',
                function ($attribute, $value, $fail) use ($userId, $ciLimpio, $extensionLimpia) {
                    $tablas = [
                        'admin'      => Admin::class,
                        'docente'    => Docente::class,
                        'auxiliar'   => Auxiliar::class,
                        'estudiante' => Estudiante::class,
                    ];

                    foreach ($tablas as $modelo) {
                        $query = $modelo::where('ci', $ciLimpio);

                        // Comprobar la combinación exacta con ci_extension
                        if ($extensionLimpia !== null && $extensionLimpia !== '') {
                            $query->whereRaw('UPPER(ci_extension) = ?', [strtoupper($extensionLimpia)]);
                        } else {
                            $query->where(function ($q) {
                                $q->whereNull('ci_extension')->orWhere('ci_extension', '');
                            });
                        }

                        // Ignorar al propio usuario en edición
                        if (!empty($userId)) {
                            $query->where('id', '!=', $userId);
                        }

                        if ($query->exists()) {
                            $fail('El CI con la extensión indicada ya se encuentra registrado en el sistema.');
                            return;
                        }
                    }
                },
            ],
            'ci_extension'     => ['nullable', 'string', 'max:10'],
            'nombre'           => ['sometimes', 'required', 'string', 'max:100'],
            'apellido_paterno' => ['sometimes', 'required', 'string', 'max:100'],
            'apellido_materno' => ['nullable', 'string', 'max:100'],
            'password'         => ['nullable', 'string', 'min:8', 'max:64'],
            'activo'           => ['sometimes', 'boolean'],
            'email'            => [
                'nullable',
                'string',
                'max:150',
                'regex:/^[a-zA-Z0-9._%+-]+@(fcyt\.umss\.edu\.bo|est\.umss\.edu|gmail\.com)$/i',
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
            'materias_ids'     => ['nullable', 'array'],
            'materias_ids.*'   => ['uuid', 'exists:materias,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.regex' => 'El correo electrónico ingresado no es un correo permitido.',
        ];
    }
}