<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\LogAuditoria;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * Listar usuarios con paginación, filtros y relación de rol.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with('role');

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'ilike', "%{$search}%")
                  ->orWhere('apellido', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('ci', 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('rol_id')) {
            $query->where('rol_id', $request->query('rol_id'));
        }

        if ($request->filled('activo')) {
            $query->where('activo', filter_var($request->query('activo'), FILTER_VALIDATE_BOOLEAN));
        }

        return response()->json($query->orderBy('id', 'desc')->paginate(10));
    }

    /**
     * Crear un nuevo usuario.
     */
    public function store(StoreUserRequest $request): JsonResponse
{
    $data = $request->validated();
    $data['activo'] = $data['activo'] ?? true;
    $data['password'] = Hash::make($data['password']);

    // Identificar qué modelo instanciar según el tipo recibido en el request
    $tipo = strtolower($request->input('tipo')); // 'admin', 'docente' o 'auxiliar'

    $modelClass = match ($tipo) {
        'admin'    => Admin::class,
        'docente'  => Docente::class,
        'auxiliar' => Auxiliar::class,
        default    => abort(422, 'Tipo de usuario no válido.'),
    };

    // Usar transacción para asegurar que usuario y log se creen juntos
    $user = DB::transaction(function () use ($modelClass, $data, $request, $tipo) {
        $nuevoUsuario = $modelClass::create($data);

        $authUser = $request->user();

        // Crear el log usando la relación polimórfica de Eloquent
        $log = new LogAuditoria([
            'accion'    => strtoupper("{$tipo}_CREADO"),
            'ip_origen' => $request->ip(),
            'detalles'  => [
                'ci'     => $nuevoUsuario->ci,
                'email'  => $nuevoUsuario->email ?? null,
                'tipo'   => $tipo,
            ],
        ]);

        // associate() asigna user_id y user_type automáticamente
        if ($authUser) {
            $log->user()->associate($authUser);
        }

        $log->save();

        return $nuevoUsuario;
    });

    return response()->json([
        'message' => 'Usuario creado exitosamente.',
        'user'    => $user,
    ], 201);
}

    /**
     * Ver el detalle de un usuario específico.
     */
    public function show(int $id): JsonResponse
    {
        $user = User::with('role')->find($id);

        if (!$user) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        return response()->json($user);
    }

    /**
     * Actualizar datos de un usuario.
     */
    public function update(UpdateUserRequest $request, int $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'Usuario no encontrado.'], 404);
        }

        $data = $request->validated();

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        LogAuditoria::create([
            'user_id'        => $request->user()->id,
            'accion'         => 'USUARIO_ACTUALIZADO',
            'ip_origen'      => $request->ip(),
            'detalles'       => ['campos_actualizados' => array_keys($data)],
        ]);

        return response()->json([
            'message' => 'Usuario actualizado exitosamente.',
            'user'    => $user->load('role')
        ]);
    }

    /**
     * Desactivar usuario
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = User::with('role')->find($id);

        if (!$user) {
            return response()->json(['message' => 'Usuario no encontrado.'], 404);
        }

        if ($error = $this->validarDesactivacion($request, $user)) {
            return $error;
        }

        $user->activo = false;
        $user->save();

        LogAuditoria::create([
            'user_id'   => $request->user()->id,
            'accion'    => 'USUARIO_DESACTIVADO',
            'ip_origen' => $request->ip(),
            'detalles'  => ['motivo' => 'Baja lógica desde módulo de usuarios'],
        ]);

        return response()->json(['message' => 'Usuario desactivado exitosamente.']);
    }

    /**
     * Valida las restricciones de negocio para la desactivación.
     */
    private function validarDesactivacion(Request $request, User $user): ?JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'No puedes desactivar tu propia cuenta.'], 400);
        }

        $esAdmin = ($user->role && $user->role->nombre === 'administrador') || $user->rol_id === 1;
        if ($user->activo && $esAdmin) {
            $adminsActivos = User::where(function ($q) {
                $q->where('rol_id', 1)
                  ->orWhereHas('role', function ($r) {
                      $r->where('nombre', 'administrador');
                  });
            })->where('activo', true)->count();

            if ($adminsActivos <= 1) {
                return response()->json([
                    'message' => 'No se puede desactivar al único usuario con rol administrador activo.'
                ], 422);
            }
        }

        return null;
    }
}
