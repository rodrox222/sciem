<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\LogAuditoria;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    /**
     * Listar usuarios consultando las 3 tablas de forma unificada.
     */
    public function index(Request $request): JsonResponse
    {
        $tipo = $request->query('tipo_usuario');
        $search = $request->query('search');
        $activo = $request->filled('activo') ? filter_var($request->query('activo'), FILTER_VALIDATE_BOOLEAN) : null;

        $coleccion = collect();

        if (!$tipo || $tipo === 'admin') {
            $query = Admin::query();
            $this->aplicarFiltros($query, $search, $activo, false);
            $coleccion = $coleccion->concat($query->get()->map(fn ($u) => $this->formatearUsuario($u, 'admin')));
        }

        if (!$tipo || $tipo === 'docente') {
            $query = Docente::query();
            $this->aplicarFiltros($query, $search, $activo, true);
            $coleccion = $coleccion->concat($query->get()->map(fn ($u) => $this->formatearUsuario($u, 'docente')));
        }

        if (!$tipo || $tipo === 'auxiliar') {
            $query = Auxiliar::query();
            $this->aplicarFiltros($query, $search, $activo, true);
            $coleccion = $coleccion->concat($query->get()->map(fn ($u) => $this->formatearUsuario($u, 'auxiliar')));
        }

        $coleccion = $coleccion->sortByDesc('created_at')->values();

        $page = LengthAwarePaginator::resolveCurrentPage();
        $perPage = 10;
        $items = $coleccion->slice(($page - 1) * $perPage, $perPage)->values();
        $paginado = new LengthAwarePaginator($items, $coleccion->count(), $perPage, $page, [
            'path' => LengthAwarePaginator::resolveCurrentPath(),
            'query' => $request->query(),
        ]);

        return response()->json($paginado);
    }

    /**
     * Crear un nuevo usuario
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['activo'] = $data['activo'] ?? true;
        $tipo = $data['tipo_usuario'];
        unset($data['tipo_usuario']);

        $modelClass = $this->obtenerClaseModelo($tipo);
        $user = $modelClass::create($data);

        $this->registrarLog($request, 'USUARIO_CREADO', [
            'tipo_usuario' => $tipo,
            'target_id'    => $user->id,
            'ci'           => $user->ci,
            'email'        => $user->email ?? null,
        ]);

        return response()->json([
            'message' => 'Usuario creado exitosamente.',
            'user'    => $this->formatearUsuario($user, $tipo),
        ], 201);
    }

    /**
     * Ver el detalle de un usuario específico por su UUID
     */
    public function show(string $id): JsonResponse
    {
        $res = $this->buscarPorId($id);

        if (!$res) {
            return response()->json(['message' => 'Usuario no encontrado.'], 404);
        }

        return response()->json($this->formatearUsuario($res['user'], $res['tipo']));
    }

    /**
     * Actualizar datos de un usuario por su UUID
     */
    public function update(UpdateUserRequest $request, string $id): JsonResponse
    {
        $res = $this->buscarPorId($id);

        if (!$res) {
            return response()->json(['message' => 'Usuario no encontrado.'], 404);
        }

        $user = $res['user'];
        $tipoActual = $res['tipo'];
        $data = $request->validated();

        // Extraer y remover el rol de los datos a actualizar
        $nuevoTipo = $data['tipo_usuario'] ?? $tipoActual;
        unset($data['tipo_usuario']);

        // Si no se envió contraseña nueva, no tocarla
        if (empty($data['password'])) {
            unset($data['password']);
        }

        // Si hay cambio de rol entre tablas distintas
        if ($nuevoTipo !== $tipoActual) {
            // Protección: No dejar al sistema sin administradores activos
            if ($tipoActual === 'admin' && $user->activo) {
                $adminsActivos = Admin::where('activo', true)->count();
                if ($adminsActivos <= 1) {
                    return response()->json([
                        'message' => 'No se puede cambiar el rol al único administrador activo.'
                    ], 422);
                }
            }

            // Exigir email si el nuevo rol lo requiere y no existe
            $emailFinal = $data['email'] ?? $user->email ?? null;
            if (in_array($nuevoTipo, ['docente', 'auxiliar']) && empty($emailFinal)) {
                return response()->json([
                    'message' => 'El correo es obligatorio para docentes y auxiliares.'
                ], 422);
            }

            try {
                $user = DB::transaction(function () use ($user, $tipoActual, $nuevoTipo, $data, $emailFinal) {
                    $claseDestino = $this->obtenerClaseModelo($nuevoTipo);

                    // Extraer los atributos existentes limpios
                    $atributosBase = $user->getAttributes();

                    // Lista blanca de columnas permitidas comunes en la base de datos
                    $camposPermitidos = [
                        'id',
                        'ci',
                        'ci_extension',
                        'nombre',
                        'apellido_paterno',
                        'apellido_materno',
                        'email',
                        'password',
                        'activo',
                        'ultimo_acceso',
                        'created_at',
                        'updated_at',
                    ];

                    $datosLimpios = [];
                    foreach ($camposPermitidos as $campo) {
                        if (array_key_exists($campo, $data)) {
                            $datosLimpios[$campo] = $data[$campo];
                        } elseif (array_key_exists($campo, $atributosBase)) {
                            $datosLimpios[$campo] = $atributosBase[$campo];
                        }
                    }

                    // Asegurar que si el rol destino es admin, no intente insertar email ni ci_extension
                    if ($nuevoTipo === 'admin') {
                        unset($datosLimpios['email'], $datosLimpios['ci_extension']);
                    } else {
                        $datosLimpios['email'] = $emailFinal;
                    }

                    // 1. Eliminar primero el registro de la tabla origen (para liberar CI/Email)
                    $user->delete();

                    // 2. Crear el registro en la tabla destino con el mismo ID
                    $nuevoRegistro = new $claseDestino();
                    $nuevoRegistro->forceFill($datosLimpios);
                    $nuevoRegistro->save();

                    return $nuevoRegistro;
                });

                $tipoActual = $nuevoTipo;
            } catch (\Exception $e) {
                return response()->json([
                    'message' => 'Error al migrar de rol: ' . $e->getMessage()
                ], 422);
            }
        } else {
            $user->update($data);
        }

        $this->registrarLog($request, 'USUARIO_ACTUALIZADO', [
            'tipo_usuario'        => $tipoActual,
            'target_id'           => $user->id,
            'campos_actualizados' => array_keys($data),
        ]);

        return response()->json([
            'message' => 'Usuario actualizado exitosamente.',
            'user'    => $this->formatearUsuario($user, $tipoActual),
        ]);
    }

    /**
     * Desactivar usuario por su UUID
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $res = $this->buscarPorId($id);

        if (!$res) {
            return response()->json(['message' => 'Usuario no encontrado.'], 404);
        }

        $user = $res['user'];
        $tipo = $res['tipo'];

        if ($error = $this->validarDesactivacion($request, $user, $tipo)) {
            return $error;
        }

        $user->activo = false;
        $user->save();

        $this->registrarLog($request, 'USUARIO_DESACTIVADO', [
            'tipo_usuario' => $tipo,
            'target_id'    => $user->id,
            'motivo'       => 'Baja lógica desde módulo de usuarios',
        ]);

        return response()->json(['message' => 'Usuario desactivado exitosamente.']);
    }

    // --- MÉTODOS AUXILIARES ---

    private function registrarLog(Request $request, string $accion, ?array $detalles = null): void
    {
        $actor = $request->user();

        $nombreCompleto = null;
        if ($actor) {
            $partes = array_filter([
                $actor->nombre ?? null,
                $actor->apellido_paterno ?? null,
                $actor->apellido_materno ?? null,
            ]);
            $nombreCompleto = !empty($partes) ? implode(' ', $partes) : null;
        }

        $rol = $actor ? strtolower(class_basename($actor)) : 'sistema';
        $emailOIdentificador = $actor?->email ?? ($actor ? $actor->ci : null);

        LogAuditoria::create([
            'user_type'         => $actor ? get_class($actor) : null,
            'user_id'           => $actor?->id,
            'rol_en_el_momento' => $rol,
            'usuario_nombre'    => $nombreCompleto,
            'usuario_email'     => $emailOIdentificador,
            'modulo'            => 'Usuarios',
            'accion'            => $accion,
            'ip_origen'         => $request->ip(),
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }

    private function obtenerClaseModelo(string $tipo): string
    {
        return match ($tipo) {
            'docente'  => Docente::class,
            'auxiliar' => Auxiliar::class,
            default    => Admin::class,
        };
    }

    private function buscarPorId(string $id): ?array
    {
        $mapaModelos = [
            'admin'    => Admin::class,
            'docente'  => Docente::class,
            'auxiliar' => Auxiliar::class,
        ];

        foreach ($mapaModelos as $tipo => $modelo) {
            $user = $modelo::find($id);
            if ($user) {
                return ['user' => $user, 'tipo' => $tipo];
            }
        }

        return null;
    }

    private function formatearUsuario(Model $u, string $tipo): array
    {
        return [
            'id'               => $u->id,
            'ci'               => $u->ci,
            'ci_extension'     => $u->ci_extension,
            'nombre'           => $u->nombre,
            'apellido_paterno' => $u->apellido_paterno,
            'apellido_materno' => $u->apellido_materno,
            'email'            => $u->email ?? null,
            'activo'           => $u->activo,
            'tipo_usuario'     => $tipo,
            'ultimo_acceso'    => $u->ultimo_acceso,
            'created_at'       => $u->created_at,
            'updated_at'       => $u->updated_at,
        ];
    }

    private function aplicarFiltros($query, ?string $search, ?bool $activo, bool $tieneEmail): void
    {
        if ($search) {
            $query->where(function ($q) use ($search, $tieneEmail) {
                $q->where('nombre', 'ilike', "%{$search}%")
                  ->orWhere('apellido_paterno', 'ilike', "%{$search}%")
                  ->orWhere('apellido_materno', 'ilike', "%{$search}%")
                  ->orWhere('ci', 'ilike', "%{$search}%");

                if ($tieneEmail) {
                    $q->orWhere('email', 'ilike', "%{$search}%");
                }
            });
        }

        if ($activo !== null) {
            $query->where('activo', $activo);
        }
    }

    private function validarDesactivacion(Request $request, Model $user, string $tipo): ?JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'No puedes desactivar tu propia cuenta.'], 400);
        }

        if ($tipo === 'admin' && $user->activo) {
            $adminsActivos = Admin::where('activo', true)->count();
            if ($adminsActivos <= 1) {
                return response()->json([
                    'message' => 'No se puede desactivar al único administrador activo.'
                ], 422);
            }
        }

        return null;
    }
}
