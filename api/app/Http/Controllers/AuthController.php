<?php

namespace App\Http\Controllers;

//use App\Models\User;
//use App\Models\LogAuditoria;
use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\LogAuditoria;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const IP_FALLBACK    = '127.0.0.1';

    /**
     * Inicio de sesión
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|string',
            'password' => 'required|string',
            'role'     => 'required|string|in:admin,docente,auxiliar,administrador',
        ]);

        $rolNormalizado = strtolower($request->role);
        if ($rolNormalizado === 'administrador') {
            $rolNormalizado = 'admin';
        }

        $identificador = trim($request->email);
        $user = $this->buscarUsuarioPorRol($rolNormalizado, $identificador);

        // Validar existencia y contraseña
        if (!$user || !Hash::check($request->password, $user->password)) {
            LogAuditoria::create([
                /*'user_id' => $user?->id,
                'rol_en_el_momento' => $user?->role?->nombre,
                'usuario_nombre' => trim($user->nombre.' '.$user->apellido),
                'usuario_email' => $user?->email,
                'accion' => 'LOGIN_FALLIDO',
                'modulo' => 'Autenticacion',
                'ip_origen' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'detalles' => ['email_intentado' => $request->email, 'motivo' => 'Credenciales invalidas'],
                */
                'user_type' => $user ? get_class($user) : null,
                'user_id'   => $user?->id,
                'accion' => 'LOGIN_FALLIDO',
                'ip_origen' => $request->ip() ?? self::IP_FALLBACK,
                'detalles'  => [
                    'identificador_intentado' => $identificador,
                    'rol_seleccionado'        => $rolNormalizado,
                    'motivo'                  => 'Credenciales inválidas',
                ],
            ]);

            throw ValidationException::withMessages([
                'email' => ['Las credenciales proporcionadas son incorrectas.'],
            ]);
        }

        /*if ($request->filled('role') && strcasecmp($user->role->nombre, $request->role) !== 0) {
            LogAuditoria::create([
                'user_id' => $user?->id,
                'rol_en_el_momento' => $user?->role?->nombre,
                'usuario_nombre' => trim($user->nombre.' '.$user->apellido),
                'usuario_email' => $user?->email,
                'accion' => 'LOGIN_FALLIDO',
                'modulo' => 'Autenticacion',
                'ip_origen' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'detalles' => ['email_intentado' => $request->email, 'motivo' => 'Intento de acceso denegado'],
            ]);

            throw ValidationException::withMessages([
                'email' => ["Esta cuenta pertenece al perfil '{$user->role->nombre}' y no tiene permisos para ingresar como '{$request->role}'."],
            ]);
        }

        // 3. Validar si el usuario está activo */
        // Validar estado de la cuenta
        if (!$user->activo) {
            return response()->json([
                'message' => 'Su cuenta se encuentra desactivada.',
            ], 403);
        }

        // Actualizar último acceso y generar token de Sanctum
        $user->ultimo_acceso = now();
        $user->save();

        $token = $user->createToken('auth_token')->plainTextToken;

        /*// Registrar login exitoso en logs_auditoria
        LogAuditoria::create([
                'user_id' => $user?->id,
                'rol_en_el_momento' => $user?->role?->nombre,
                'usuario_nombre' => trim($user->nombre.' '.$user->apellido),
                'usuario_email' => $user?->email,
                'accion' => 'LOGIN_EXITOSO',
                'modulo' => 'Autenticacion',
                'ip_origen' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'detalles' => ['rol' => $user->role->nombre],
            ]);*/
        // Registro en logs_auditoria
        LogAuditoria::create([
            'user_type' => get_class($user),
            'user_id'   => $user->id,
            'accion'    => 'LOGIN_EXITOSO',
            'ip_origen' => $request->ip() ?? self::IP_FALLBACK,
            'detalles'  => ['rol' => $rolNormalizado],
        ]);

        return response()->json([
            'message' => 'Inicio de sesión exitoso',
            'token'   => $token,
            'user'    => [
                'id'        => $user->id,
                'ci'        => $user->ci,
                'nombre'    => $user->nombre,
                'apellido'  => trim("{$user->apellido_paterno} {$user->apellido_materno}"),
                'email'     => $user->email ?? null,
                'rol'       => $rolNormalizado,
            ],
        ], 200);
    }

    /**
     * Cierre de sesión y revocación del token activo
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $user->currentAccessToken()->delete();

        /*// Registrar salida en la auditoría
        LogAuditoria::create([
                'user_id' => $user?->id,
                'rol_en_el_momento' => $user?->role?->nombre,
                'usuario_nombre' => trim($user->nombre.' '.$user->apellido),
                'usuario_email' => $user?->email,
                'accion' => 'LOGOUT',
                'modulo' => 'Autenticacion',
                'ip_origen' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'detalles' => ['motivo' => 'Cierre de sesion voluntario'],
            ]); */
            LogAuditoria::create([
                'user_type' => get_class($user),
                'user_id'   => $user->id,
                'accion'    => 'LOGOUT',
                'ip_origen' => $request->ip() ?? self::IP_FALLBACK,
                'detalles'  => ['motivo' => 'Cierre de sesión voluntario'],
            ]);
        }

        return response()->json([
            'message' => 'Sesión cerrada correctamente',
        ], 200);
    }

    /**
     * Localiza el usuario en su tabla
     */
    private function buscarUsuarioPorRol(string $rol, string $identificador): ?Model
    {
        return match ($rol) {
            'docente' => Docente::where('email', $identificador)
                ->orWhere('ci', $identificador)
                ->first(),

            'auxiliar' => Auxiliar::where('email', $identificador)
                ->orWhere('ci', $identificador)
                ->first(),

            'admin' => Admin::where('ci', $identificador)->first(),

            default => null,
        };
    }
}
