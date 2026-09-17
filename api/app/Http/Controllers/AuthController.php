<?php

namespace App\Http\Controllers;

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
    private const IP_FALLBACK = '127.0.0.1';

    /**
     * Inicio de sesión sin selector de rol previo
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => [
                'required',
                'string',
                'regex:/^([a-zA-Z0-9._%+-]+@(est\.umss\.edu|fcyt\.umss\.edu\.bo)|[0-9]+)$/'
            ],
            'password' => 'required|string',
        ], [
            'email.regex' => 'Debe ingresar un correo institucional válido.'
        ]);

        $identificador = trim(strtolower($request->email));
        
        // Determinar tabla y buscar usuario automáticamente
        [$user, $rolDetectado] = $this->identificarYBuscarUsuario($identificador);

        // Validar existencia y contraseña
        if (!$user || !Hash::check($request->password, $user->password)) {
            $this->registrarLogAuth(
                request: $request,
                accion: 'LOGIN_FALLIDO',
                user: $user,
                rolFallback: $rolDetectado ?? 'desconocido',
                detalles: [
                    'identificador_intentado' => $identificador,
                    'motivo'                  => 'Credenciales inválidas',
                ]
            );

            throw ValidationException::withMessages([
                'email' => ['Las credenciales proporcionadas son incorrectas.'],
            ]);
        }

        // Validar estado de la cuenta
        if (!$user->activo) {
            $this->registrarLogAuth(
                request: $request,
                accion: 'LOGIN_BLOQUEADO',
                user: $user,
                rolFallback: $rolDetectado,
                detalles: [
                    'motivo' => 'Intento de acceso con cuenta inactiva',
                ]
            );

            return response()->json([
                'message' => 'Su cuenta se encuentra desactivada. Comuníquese con administración.',
            ], 403);
        }

        // Actualizar último acceso y generar token de Sanctum
        $user->ultimo_acceso = now();
        $user->save();

        $token = $user->createToken('auth_token')->plainTextToken;

        // Registrar login exitoso
        $this->registrarLogAuth(
            request: $request,
            accion: 'LOGIN_EXITOSO',
            user: $user,
            rolFallback: $rolDetectado,
            detalles: ['rol' => $rolDetectado]
        );

        return response()->json([
            'message' => 'Inicio de sesión exitoso',
            'token'   => $token,
            'user'    => [
                'id'           => $user->id,
                'ci'           => $user->ci,
                'nombre'       => $user->nombre,
                'apellido'     => trim("{$user->apellido_paterno} {$user->apellido_materno}"),
                'email'        => $user->email ?? null,
                'rol'          => $rolDetectado,
                'tipo_usuario' => $rolDetectado,
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

            $this->registrarLogAuth(
                request: $request,
                accion: 'LOGOUT',
                user: $user,
                detalles: ['motivo' => 'Cierre de sesión voluntario']
            );
        }

        return response()->json([
            'message' => 'Sesión cerrada correctamente',
        ], 200);
    }

    // --- MÉTODOS AUXILIARES ---

    /**
     * Localiza el usuario en su tabla correspondiente según su correo o identificador numérico
     */
    private function identificarYBuscarUsuario(string $identificador): array
    {
        // 1. Docente (@fcyt.umss.edu.bo)
        if (str_ends_with($identificador, '@fcyt.umss.edu.bo')) {
            $docente = Docente::where('email', $identificador)->first();
            return [$docente, 'docente'];
        }

        // 2. Auxiliar / Estudiante (@est.umss.edu)
        if (str_ends_with($identificador, '@est.umss.edu')) {
            $auxiliar = Auxiliar::where('email', $identificador)->first();
            return [$auxiliar, 'auxiliar'];
        }

        // 3. Admin (por CI numérico)
        if (ctype_digit($identificador)) {
            $admin = Admin::where('ci', $identificador)->first();
            return [$admin, 'admin'];
        }

        return [null, null];
    }

    /**
     * Centraliza la persistencia de auditoría para eventos de autenticación
     */
    private function registrarLogAuth(
        Request $request,
        string $accion,
        ?Model $user = null,
        ?string $rolFallback = null,
        ?array $detalles = null
    ): void {
        $nombreCompleto = null;
        if ($user) {
            $partes = array_filter([
                $user->nombre ?? null,
                $user->apellido_paterno ?? null,
                $user->apellido_materno ?? null,
            ]);
            $nombreCompleto = !empty($partes) ? implode(' ', $partes) : null;
        }

        $rol = $user ? strtolower(class_basename($user)) : $rolFallback;
        $emailOIdentificador = $user?->email ?? ($user ? $user->ci : null);

        LogAuditoria::create([
            'user_type'         => $user ? get_class($user) : null,
            'user_id'           => $user?->id,
            'rol_en_el_momento' => $rol,
            'usuario_nombre'    => $nombreCompleto,
            'usuario_email'     => $emailOIdentificador,
            'modulo'            => 'Autenticacion',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? self::IP_FALLBACK,
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}