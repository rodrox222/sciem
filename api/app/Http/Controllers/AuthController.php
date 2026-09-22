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
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const IP_FALLBACK = '127.0.0.1';

    /**
     * Autenticación unificada sin selector de roles.
     * - CI numérico -> Administrador
     * - @fcyt.umss.edu.bo -> Docente
     * - @est.umss.edu -> Auxiliar
     */
    public function login(Request $request): JsonResponse
    {
        
    return response()->json([
            'db_host'     => config('database.connections.pgsql.host'),
            'db_database' => config('database.connections.pgsql.database'),
            'total_docentes' => Docente::count(),
            'docente'     => Docente::where('email', 'docente@fcyt.umss.edu.bo')->first(),
        ]);
    
    // Validación estricta de formato: o es correo institucional válido o es CI numérico
        $request->validate([
            'email' => [
                'required',
                'string',
                'regex:/^([a-zA-Z0-9._%+-]+@(est\.umss\.edu|fcyt\.umss\.edu\.bo)|\d+)$/'
            ],
            'password' => 'required|string',
        ], [
            'email.regex' => 'Debe ingresar un correo institucional válido o su cédula de identidad autorizada.'
        ]);

        $rawIdentifier = trim($request->email);

        // Resolver tabla y rol según el patrón del identificador
        [$user, $rolDetectado] = $this->identificarYBuscarUsuario($rawIdentifier);

        // REGISTRO DEPURADOR PARA VER EN RENDER LOGS
        Log::error('DEBUG_LOGIN_RENDER', [
            'raw_identifier'     => $rawIdentifier,
            'rol_detectado'      => $rolDetectado,
            'usuario_encontrado' => $user ? true : false,
            'user_id'            => $user?->id,
            'activo'             => $user?->activo,
            'password_match'     => $user ? Hash::check($request->password, $user->password) : false,
        ]);

        // Validar existencia y verificación de hash de contraseña
        if (!$user || !Hash::check($request->password, $user->password)) {
            $this->registrarLogAuth(
                request: $request,
                accion: 'LOGIN_FALLIDO',
                user: $user,
                rolFallback: $rolDetectado ?? 'desconocido',
                detalles: [
                    'identificador_intentado' => $rawIdentifier,
                    'motivo'                  => 'Credenciales inválidas',
                ]
            );

            throw ValidationException::withMessages([
                'email' => ['Las credenciales proporcionadas son incorrectas.'],
            ]);
        }

        // Validar estado activo de la cuenta
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
                'message' => 'Su cuenta se encuentra desactivada. Comuníquese con la administración.',
            ], 403);
        }

        // Registrar último acceso y expedir token de Sanctum
        $user->ultimo_acceso = now();
        $user->save();

        $token = $user->createToken('auth_token')->plainTextToken;

        // Registrar auditoría de éxito
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
     * Discrimina de forma unívoca la entidad a consultar:
     * - Solo números -> Admin (por columna CI)
     * - Terminado en @fcyt.umss.edu.bo -> Docente (por columna email)
     * - Terminado en @est.umss.edu -> Auxiliar (por columna email)
     */
    private function identificarYBuscarUsuario(string $identificador): array
    {
        // Administrador (CI numérico)
        if (ctype_digit($identificador)) {
            $admin = Admin::where('ci', $identificador)->first();
            return [$admin, 'admin'];
        }

        $emailLower = strtolower($identificador);

        // Docente (@fcyt.umss.edu.bo)
        if (str_ends_with($emailLower, '@fcyt.umss.edu.bo')) {
            $docente = Docente::where('email', $emailLower)->first();
            return [$docente, 'docente'];
        }

        // Auxiliar (@est.umss.edu)
        if (str_ends_with($emailLower, '@est.umss.edu')) {
            $auxiliar = Auxiliar::where('email', $emailLower)->first();
            return [$auxiliar, 'auxiliar'];
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