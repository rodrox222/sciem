<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\LogAuditoria;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const IP_FALLBACK = '127.0.0.1';

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => [
                'required',
                'string',
                'regex:/^([a-zA-Z0-9._%+-]+@(est\.umss\.edu|fcyt\.umss\.edu\.bo|gmail\.com)|\d+)$/i'
            ],
            'password' => 'required|string',
            'role'     => 'nullable|string',
        ], [
            'email.regex' => 'Debe ingresar un correo institucional válido o identificador numérico.'
        ]);

        $rawIdentifier = trim($request->email);
        $rolSugerido   = $request->filled('role') ? strtolower(trim($request->role)) : null;

        // Resolver tabla y rol según el patrón del identificador y rol sugerido
        [$user, $rolDetectado] = $this->identificarYBuscarUsuario($rawIdentifier, $rolSugerido);

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

        // Registrar último acceso si el modelo lo tiene
        if (in_array('ultimo_acceso', $user->getFillable()) || isset($user->ultimo_acceso)) {
            $user->ultimo_acceso = now();
            $user->save();
        }

        $token = $user->createToken('auth_token', ["role:{$rolDetectado}"])->plainTextToken;

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
                'id'                       => $user->id,
                'codigo_sis'               => $user->codigo_sis ?? null,
                'ci'                       => $user->ci,
                'nombre'                   => $user->nombre,
                'apellido'                 => trim("{$user->apellido_paterno} {$user->apellido_materno}"),
                'email'                    => $user->email ?? $user->email_institucional ?? null,
                'foto_perfil_url'          => $user->foto_perfil_url ?? null,
                'primer_acceso_completado' => (bool) ($user->primer_acceso_completado ?? false),
                'rol'                      => $rolDetectado,
                'tipo_usuario'             => $rolDetectado,
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
     * - Si manda explicitamente role="estudiante", busca en Estudiante.
     * - Solo números -> Puede ser Admin (por CI) o Estudiante (por Código SIS).
     * - Terminado en @fcyt.umss.edu.bo -> Docente.
     * - Terminado en @est.umss.edu -> Busca en Estudiante (por email_institucional) o en Auxiliar (por email).
     */
    private function identificarYBuscarUsuario(string $identificador, ?string $rolSugerido = null): array
    {
        // 1. Si el cliente especificó explícitamente el rol en el body
        if ($rolSugerido === 'estudiante') {
            $estudiante = Estudiante::where('email_institucional', $identificador)
                ->orWhere('codigo_sis', $identificador)
                ->first();
            if ($estudiante) {
                return [$estudiante, 'estudiante'];
            }
        }

        // Solo números: Evaluar si es Estudiante (Código SIS) o Admin (CI)
        if (ctype_digit($identificador)) {
            // Verificar primero si corresponde a un Código SIS de Estudiante (usualmente >= 8 dígitos)
            $estudiante = Estudiante::where('codigo_sis', $identificador)->first();
            if ($estudiante) {
                return [$estudiante, 'estudiante'];
            }

            // Si no es estudiante, verificar Admin por CI
            $admin = Admin::where('ci', $identificador)->first();
            if ($admin) {
                return [$admin, 'admin'];
            }
        }

        $emailLower = strtolower($identificador);

        // 3. Docente
        if (str_ends_with($emailLower, '@fcyt.umss.edu.bo')) {
            $docente = Docente::where('email', $emailLower)->first();
            return [$docente, 'docente'];
        }

        // Terminado en @est.umss.edu 
        if (str_ends_with($emailLower, '@est.umss.edu')) {
            // Buscar primero en Estudiante
            $estudiante = Estudiante::where('email_institucional', $emailLower)->first();
            if ($estudiante) {
                return [$estudiante, 'estudiante'];
            }

            // Si no está en estudiantes, buscar en Auxiliar
            $auxiliar = Auxiliar::where('email', $emailLower)->first();
            if ($auxiliar) {
                return [$auxiliar, 'auxiliar'];
            }
        }

        // Otros dominios (por ejemplo @gmail.com)
        $docente = Docente::where('email', $emailLower)->first();
        if ($docente) {
            return [$docente, 'docente'];
        }

        $auxiliar = Auxiliar::where('email', $emailLower)->first();
        if ($auxiliar) {
            return [$auxiliar, 'auxiliar'];
        }

        $estudiante = Estudiante::where('email_institucional', $emailLower)->first();
        if ($estudiante) {
            return [$estudiante, 'estudiante'];
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

        $rol = match ($user ? get_class($user) : null) {
            Admin::class      => 'admin',
            Docente::class    => 'docente',
            Auxiliar::class   => 'auxiliar',
            Estudiante::class => 'estudiante',
            default           => $rolFallback,
        };

        $emailOIdentificador = $user?->email 
            ?? $user?->email_institucional 
            ?? $user?->codigo_sis 
            ?? $user?->ci 
            ?? null;

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