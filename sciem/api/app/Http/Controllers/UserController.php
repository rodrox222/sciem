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

        // Admin (no tiene columna email)
        if (!$tipo || $tipo === 'admin') {
            $query = Admin::query();
            $this->aplicarFiltros($query, $search, $activo, false);
            $coleccion = $coleccion->concat($query->get()->map(fn ($u) => $this->formatearUsuario($u, 'admin')));
        }

        // Docente
        if (!$tipo || $tipo === 'docente') {
            $query = Docente::query();
            $this->aplicarFiltros($query, $search, $activo, true);
            $coleccion = $coleccion->concat($query->get()->map(fn ($u) => $this->formatearUsuario($u, 'docente')));
        }

        // Auxiliar
        if (!$tipo || $tipo === 'auxiliar') {
            $query = Auxiliar::query();
            $this->aplicarFiltros($query, $search, $activo, true);
            $coleccion = $coleccion->concat($query->get()->map(fn ($u) => $this->formatearUsuario($u, 'auxiliar')));
        }

        // Ordenar por fecha de creación más reciente
        $coleccion = $coleccion->sortByDesc('created_at')->values();

        // Paginación manual para mantener el formato original de Laravel paginate()
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

        LogAuditoria::create([
            'user_type' => get_class($request->user()),
            'user_id'   => $request->user()->id,
            'accion'    => 'USUARIO_CREADO',
            'ip_origen' => $request->ip(),
            'detalles'  => [
                'tipo_usuario' => $tipo,
                'target_id'    => $user->id,
                'ci'           => $user->ci,
                'email'        => $user->email ?? null,
            ],
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
        $tipo = $res['tipo'];
        $data = $request->validated();

        if (empty($data['password'])) {
            unset($data['password']);
        }
        unset($data['tipo_usuario']);

        $user->update($data);

        LogAuditoria::create([
            'user_type' => get_class($request->user()),
            'user_id'   => $request->user()->id,
            'accion'    => 'USUARIO_ACTUALIZADO',
            'ip_origen' => $request->ip(),
            'detalles'  => [
                'tipo_usuario'        => $tipo,
                'target_id'           => $user->id,
                'campos_actualizados' => array_keys($data),
            ],
        ]);

        return response()->json([
            'message' => 'Usuario actualizado exitosamente.',
            'user'    => $this->formatearUsuario($user, $tipo),
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

        LogAuditoria::create([
            'user_type' => get_class($request->user()),
            'user_id'   => $request->user()->id,
            'accion'    => 'USUARIO_DESACTIVADO',
            'ip_origen' => $request->ip(),
            'detalles'  => [
                'tipo_usuario' => $tipo,
                'target_id'    => $user->id,
                'motivo'       => 'Baja lógica desde módulo de usuarios',
            ],
        ]);

        return response()->json(['message' => 'Usuario desactivado exitosamente.']);
    }

    // --- MÉTODOS AUXILIARES ---

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

        $resultado = null;

        foreach ($mapaModelos as $tipo => $modelo) {
            $user = $modelo::find($id);
            if ($user) {
                $resultado = ['user' => $user, 'tipo' => $tipo];
                break;
            }
        }

        return $resultado;
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
