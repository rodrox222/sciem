<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\LogAuditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class ConfiguracionSistemaController extends Controller
{
    /**
     * GET /api/configuracion/inactividad
     * Retorna los minutos configurados para timeout de inactividad.
     */
    public function getTiempoInactividad(): JsonResponse
    {
        $config = DB::table('configuraciones_sistema')
            ->where('clave', 'tiempo_inactividad_minutos')
            ->first();

        $minutos = $config ? (int) $config->valor : 5;

        return response()->json([
            'clave'   => 'tiempo_inactividad_minutos',
            'minutos' => $minutos,
        ], 200);
    }

    /**
     * PUT /api/configuracion/inactividad
     * Modifica el límite de minutos y audita con snapshot reversible.
     */
    public function updateTiempoInactividad(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'minutos' => ['required', 'integer', 'min:1', 'max:120'],
        ], [
            'minutos.required' => 'Debe ingresar el tiempo en minutos.',
            'minutos.integer'  => 'El tiempo debe ser un número entero.',
            'minutos.min'      => 'El tiempo mínimo de inactividad es de 1 minuto.',
            'minutos.max'      => 'El tiempo máximo permitido es de 120 minutos.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validación fallida.',
                'errors'  => $validator->errors()
            ], 422);
        }

        $nuevosMinutos = (string) $request->input('minutos');

        $configPrevio = DB::table('configuraciones_sistema')
            ->where('clave', 'tiempo_inactividad_minutos')
            ->first();

        $valorAnterior = $configPrevio ? $configPrevio->valor : '5';

        DB::table('configuraciones_sistema')->updateOrInsert(
            ['clave' => 'tiempo_inactividad_minutos'],
            [
                'valor'      => $nuevosMinutos,
                'updated_at' => now(),
            ]
        );

        $this->registrarAuditoria($request, 'CONFIGURACION_INACTIVIDAD_ACTUALIZADA', [
            'target_type'        => 'configuraciones_sistema',
            'target_id'          => 'tiempo_inactividad_minutos',
            'valores_anteriores' => ['valor' => $valorAnterior],
            'valores_nuevos'     => ['valor' => $nuevosMinutos],
        ]);

        return response()->json([
            'message' => 'Límite de inactividad actualizado correctamente.',
            'minutos' => (int) $nuevosMinutos,
        ], 200);
    }

    /**
     * PUT /api/admin/perfil
     * Permite al Administrador ver/modificar sus propios datos desde Configuración.
     */
    public function updatePerfilAdmin(Request $request): JsonResponse
    {
        $admin = $request->user();
        if (!$admin instanceof Admin) {
            return response()->json(['message' => 'Solo el administrador puede actualizar este perfil.'], 403);
        }

        $ciLimpio = trim((string) $request->input('ci', ''));
        $extensionLimpia = trim((string) $request->input('ci_extension', ''));

        $validator = Validator::make($request->all(), [
            'ci'               => [
                'required',
                'string',
                'max:20',
                function ($attribute, $value, $fail) use ($admin, $ciLimpio, $extensionLimpia) {
                    foreach ([Admin::class, Docente::class, Auxiliar::class, Estudiante::class] as $modelo) {
                        $query = $modelo::where('ci', $ciLimpio);
                        if ($extensionLimpia !== '') {
                            $query->whereRaw('UPPER(ci_extension) = ?', [strtoupper($extensionLimpia)]);
                        } else {
                            $query->where(function ($q) {
                                $q->whereNull('ci_extension')->orWhere('ci_extension', '');
                            });
                        }

                        if ($modelo === Admin::class) {
                            $query->where('id', '!=', $admin->id);
                        }

                        if ($query->exists()) {
                            $fail('El CI con la extensión indicada ya se encuentra registrado en el sistema.');
                            return;
                        }
                    }
                },
            ],
            'ci_extension'     => ['nullable', 'string', 'max:10'],
            'nombre'           => ['required', 'string', 'max:100'],
            'apellido_paterno' => ['required', 'string', 'max:100'],
            'apellido_materno' => ['nullable', 'string', 'max:100'],
            'password'         => ['nullable', 'string', 'min:8', 'max:64', 'confirmed'],
        ], [
            'ci.required'               => 'El CI es obligatorio.',
            'nombre.required'           => 'El nombre es obligatorio.',
            'apellido_paterno.required' => 'El apellido paterno es obligatorio.',
            'password.min'              => 'La contraseña debe tener al menos 8 caracteres.',
            'password.confirmed'        => 'La confirmación de la contraseña no coincide.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validación fallida.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $valoresAnteriores = [
            'ci'               => $admin->ci,
            'ci_extension'     => $admin->ci_extension,
            'nombre'           => $admin->nombre,
            'apellido_paterno' => $admin->apellido_paterno,
            'apellido_materno' => $admin->apellido_materno,
        ];

        $admin->ci               = $ciLimpio;
        $admin->ci_extension     = $extensionLimpia !== '' ? strtoupper($extensionLimpia) : null;
        $admin->nombre           = trim((string) $request->input('nombre'));
        $admin->apellido_paterno = trim((string) $request->input('apellido_paterno'));
        $admin->apellido_materno = $request->filled('apellido_materno') ? trim((string) $request->input('apellido_materno')) : null;

        if ($request->filled('password')) {
            $admin->password = Hash::make((string) $request->input('password'));
        }

        $admin->save();

        $this->registrarAuditoria($request, 'ADMIN_PERFIL_ACTUALIZADO', [
            'target_type'        => 'admin',
            'target_id'          => $admin->id,
            'valores_anteriores' => $valoresAnteriores,
            'valores_nuevos'     => [
                'ci'               => $admin->ci,
                'ci_extension'     => $admin->ci_extension,
                'nombre'           => $admin->nombre,
                'apellido_paterno' => $admin->apellido_paterno,
                'apellido_materno' => $admin->apellido_materno,
                'password_changed' => $request->filled('password'),
            ],
        ]);

        return response()->json([
            'message' => 'Perfil de administrador actualizado correctamente.',
            'user'    => [
                'id'               => $admin->id,
                'ci'               => $admin->ci,
                'ci_extension'     => $admin->ci_extension,
                'nombre'           => $admin->nombre,
                'apellido_paterno' => $admin->apellido_paterno,
                'apellido_materno' => $admin->apellido_materno,
                'rol'              => 'admin',
            ],
        ]);
    }

    private function registrarAuditoria(Request $request, string $accion, array $detalles = []): void
    {
        $user = $request->user();
        if (!$user) return;

        $rol = match (get_class($user)) {
            Admin::class    => 'admin',
            Docente::class  => 'docente',
            Auxiliar::class => 'auxiliar',
            default         => 'desconocido',
        };

        $nombreCompleto = trim("{$user->nombre} {$user->apellido_paterno} {$user->apellido_materno}");

        LogAuditoria::create([
            'user_type'         => get_class($user),
            'user_id'           => $user->id,
            'rol_en_el_momento' => $rol,
            'usuario_nombre'    => $nombreCompleto !== '' ? $nombreCompleto : $user->nombre,
            'usuario_email'     => $user->email ?? null,
            'modulo'            => 'CONFIGURACION',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}