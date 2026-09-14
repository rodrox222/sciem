<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\LogAuditoria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'role' => 'nullable|string',
        ]);

        $user = User::with('role')->where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            LogAuditoria::create([
                'user_id' => $user?->id,
                'rol_en_el_momento' => $user?->role?->nombre,
                'usuario_nombre' => trim($user->nombre.' '.$user->apellido),
                'usuario_email' => $user?->email,
                'accion' => 'LOGIN_FALLIDO',
                'modulo' => 'Autenticacion',
                'ip_origen' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'detalles' => ['email_intentado' => $request->email, 'motivo' => 'Credenciales invalidas'],
            ]);

            throw ValidationException::withMessages([
                'email' => ['Las credenciales proporcionadas son incorrectas.'],
            ]);
        }

        if ($request->filled('role') && strcasecmp($user->role->nombre, $request->role) !== 0) {
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

        // 3. Validar si el usuario está activo
        if (!$user->activo) {
            return response()->json([
                'message' => 'Su cuenta se encuentra desactivada.'
            ], 403);
        }

        // Actualizar fecha de último acceso
        $user->ultimo_acceso = now();
        $user->save();

        // Generar token con Sanctum
        $token = $user->createToken('auth_token')->plainTextToken;

        // Registrar login exitoso en logs_auditoria
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
            ]);

        return response()->json([
            'message' => 'Inicio de sesión exitoso',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'nombre' => $user->nombre,
                'apellido' => $user->apellido,
                'email' => $user->email,
                'rol' => $user->role->nombre,
            ]
        ], 200);
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        // Revocar el token actual
        $request->user()->currentAccessToken()->delete();

        // Registrar salida en la auditoría
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
            ]);

        return response()->json([
            'message' => 'Sesión cerrada correctamente'
        ], 200);
    }
}
