<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::with('role')->where('email', $request->email)->first();

        // si no existe o la contraseña no coincide
        if (!$user || !Hash::check($request->password, $user->password)) {
            // Registrar intento fallido en logs_auditoria (HU3)
            DB::table('logs_auditoria')->insert([
                'user_id' => $user ? $user->id : null,
                'accion' => 'LOGIN_FALLIDO',
                'ip_origen' => $request->ip(),
                'detalles' => json_encode(['email_intentado' => $request->email, 'motivo' => 'Credenciales inválidas']),
                'created_at' => now(),
            ]);

            throw ValidationException::withMessages([
                'email' => ['Las credenciales proporcionadas son incorrectas.'],
            ]);
        }

        // validar si el usuario está activo
        if (!$user->activo) {
            return response()->json([
                'message' => 'Su cuenta se encuentra desactivada.'
            ], 403);
        }

        // actualizar fecha de último acceso
        $user->ultimo_acceso = now();
        $user->save();

        // generar token con Sanctum
        $token = $user->createToken('auth_token')->plainTextToken;

        // registrar login exitoso en logs_auditoria
        DB::table('logs_auditoria')->insert([
            'user_id' => $user->id,
            'accion' => 'LOGIN_EXITOSO',
            'ip_origen' => $request->ip(),
            'detalles' => json_encode(['rol' => $user->role->nombre]),
            'created_at' => now(),
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

        // revocar el token actual
        $request->user()->currentAccessToken()->delete();

        // registrar salida de la auditoria
        DB::table('logs_auditoria')->insert([
            'user_id' => $user->id,
            'accion' => 'LOGOUT',
            'ip_origen' => $request->ip(),
            'detalles' => json_encode(['motivo' => 'Cierre de sesión voluntario']),
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Sesión cerrada correctamente'
        ], 200);
    }
}