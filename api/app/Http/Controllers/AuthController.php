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
            'role'     => 'nullable|string|in:estudiante,auxiliar,docente,admin',
        ], [
            'email.regex' => 'Debe ingresar un correo institucional válido o identificador numérico.'
        ]);

        $rawIdentifier = trim($request->email);
        $rolSugerido   = $request->filled('role') ? strtolower(trim($request->role)) : null;

        // Resolver tabla y rol base
        [$user, $rolDetectado] = $this->identificarYBuscarUsuario($rawIdentifier, $rolSugerido);

        // Validar credenciales
        if (!$user || !Hash::check($request->password, $user->password)) {
            $this->registrarLogAuth($request, 'LOGIN_FALLIDO', $user, $rolDetectado ?? 'desconocido', [
                'identificador_intentado' => $rawIdentifier,
                'motivo'                  => 'Credenciales inválidas',
            ]);

            throw ValidationException::withMessages([
                'email' => ['Las credenciales proporcionadas son incorrectas.'],
            ]);
        }

        if (!$user->activo) {
            return response()->json(['message' => 'Su cuenta se encuentra desactivada. Comuníquese con la administración.'], 403);
        }

        // LÓGICA DE MULTI-ROL (ESTUDIANTE / AUXILIAR)
        $rolesDisponibles = [$rolDetectado]; // Por defecto ['estudiante']

        // Si la bandera es_auxiliar está en true, le habilitamos el segundo rol
        if ($user instanceof Estudiante && $user->es_auxiliar) {
            $rolesDisponibles = ['estudiante', 'auxiliar'];
        }

        // Validar que el rol sugerido realmente le pertenezca
        $rolFinal = $rolDetectado;
        if (!empty($rolSugerido)) {
            if (!in_array($rolSugerido, $rolesDisponibles)) {
                return response()->json(['message' => 'No tiene permisos para iniciar sesión con este rol.'], 403);
            }
            $rolFinal = $rolSugerido;
        }

        // Actualizar último acceso
        if (in_array('ultimo_acceso', $user->getFillable()) || isset($user->ultimo_acceso)) {
            $user->ultimo_acceso = now();
            $user->save();
        }

        $abilities = array_map(fn($r) => "role:{$r}", $rolesDisponibles);
        $token = $user->createToken('auth_token', $abilities)->plainTextToken;

        $this->registrarLogAuth($request, 'LOGIN_EXITOSO', $user, $rolFinal, ['rol_seleccionado' => $rolFinal]);

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
                'rol'                      => $rolFinal,
                'roles_disponibles'        => $rolesDisponibles,
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
        // Si el cliente especificó explícitamente el rol "estudiante" o "auxiliar"
        if (in_array($rolSugerido, ['estudiante', 'auxiliar'])) {
            $estudiante = Estudiante::where('email_institucional', $identificador)
                ->orWhere('codigo_sis', $identificador)
                ->first();
            if ($estudiante) {
                // Si sugirió auxiliar, validamos si realmente tiene la bandera activa
                $rolDetectado = ($rolSugerido === 'auxiliar' && $estudiante->es_auxiliar) ? 'auxiliar' : 'estudiante';
                return [$estudiante, $rolDetectado];
            }
        }

        // Solo números: Evaluar si es Estudiante (Código SIS) o Admin (CI)
        if (ctype_digit($identificador)) {
            $estudiante = Estudiante::where('codigo_sis', $identificador)->first();
            if ($estudiante) {
                return [$estudiante, 'estudiante'];
            }

            $admin = Admin::where('ci', $identificador)->first();
            if ($admin) {
                return [$admin, 'admin'];
            }
        }

        $emailLower = strtolower($identificador);

        // Docente
        if (str_ends_with($emailLower, '@fcyt.umss.edu.bo')) {
            $docente = Docente::where('email', $emailLower)->first();
            if ($docente) {
                return [$docente, 'docente'];
            }
        }

        // Terminado en @est.umss.edu (para los estudiantes pe)
        if (str_ends_with($emailLower, '@est.umss.edu')) {
            $estudiante = Estudiante::where('email_institucional', $emailLower)->first();
            if ($estudiante) {
                return [$estudiante, 'estudiante'];
            }
        }

        // Otros dominios (por ejemplo @gmail.com)
        $docente = Docente::where('email', $emailLower)->first();
        if ($docente) {
            return [$docente, 'docente'];
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