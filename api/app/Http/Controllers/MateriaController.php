<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMateriaRequest;
use App\Http\Requests\UpdateMateriaRequest;
use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Examen;
use App\Models\LogAuditoria;
use App\Models\Materia;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class MateriaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $user = $request->user();

        // Si se solicitan materias del docente autenticado
        if ($request->boolean('mis_materias') || ($request->boolean('para_examen') && $user instanceof Docente)) {
            if ($user instanceof Docente) {
                $queryDocente = $user->materias()->orderBy('nombre', 'asc');
                if ($search) {
                    $words = array_filter(explode(' ', trim($search)));
                    if (!empty($words)) {
                        $queryDocente->where(function ($q) use ($words) {
                            foreach ($words as $word) {
                                $term = '%' . Str::ascii($word) . '%';
                                $q->whereRaw("translate(materias.nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN') ILIKE ?", [$term]);
                            }
                        });
                    }
                }
                return response()->json($queryDocente->get());
            }
        }

        if ($request->boolean('all') && empty($search)) {
            $materias = Cache::remember('catalogo_materias_all', 600, function () {
                return Materia::orderBy('nombre', 'asc')->get();
            });
            return response()->json($materias);
        }

        $query = Materia::query();

        if ($search) {
            $words = array_filter(explode(' ', trim($search)));
            if (!empty($words)) {
                $query->where(function ($q) use ($words) {
                    foreach ($words as $word) {
                        $term = '%' . Str::ascii($word) . '%';
                        $q->whereRaw("translate(nombre, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN') ILIKE ?", [$term]);
                    }
                });
            }
        }

        if ($request->boolean('all')) {
            return response()->json($query->orderBy('nombre', 'asc')->get());
        }

        $perPage = (int) $request->query('per_page', 10);

        return response()->json($query->orderBy('nombre', 'asc')->paginate($perPage));
    }

    public function store(StoreMateriaRequest $request): JsonResponse
    {
        $data = $request->validated();
        $materia = Materia::create($data);

        Cache::forget('catalogo_materias_all');

        $this->registrarAuditoria($request, 'MATERIA_CREADA', [
            'target_type' => 'materia',
            'target_id'   => $materia->id,
            'nombre'      => $materia->nombre,
        ]);

        return response()->json([
            'message' => 'Materia creada exitosamente.',
            'materia' => $materia,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $materia = Materia::withCount('examenes')->find($id);

        if (!$materia) {
            return response()->json(['message' => 'Materia no encontrada.'], 404);
        }

        return response()->json($materia);
    }

    public function update(UpdateMateriaRequest $request, string $id): JsonResponse
    {
        $materia = Materia::find($id);

        if (!$materia) {
            return response()->json(['message' => 'Materia no encontrada.'], 404);
        }

        $data = $request->validated();
        $camposAfectados = array_keys($data);
        $valoresAnteriores = $materia->only($camposAfectados);

        $materia->update($data);

        Cache::forget('catalogo_materias_all');

        $this->registrarAuditoria($request, 'MATERIA_ACTUALIZADA', [
            'target_type'         => 'materia',
            'target_id'           => $materia->id,
            'campos_actualizados' => $camposAfectados,
            'valores_anteriores'  => $valoresAnteriores,
            'valores_nuevos'      => $data,
        ]);

        return response()->json([
            'message' => 'Materia actualizada exitosamente.',
            'materia' => $materia,
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $materia = Materia::find($id);

        if (!$materia) {
            return response()->json(['message' => 'Materia no encontrada.'], 404);
        }

        $ahora = Carbon::now('America/La_Paz');
        $tieneExamenesPendientes = Examen::where('id_materia', $materia->id)
            ->whereIn('estado', ['Programado', 'En proceso'])
            ->where(function ($q) use ($ahora) {
                $q->where('fecha', '>', $ahora->toDateString())
                  ->orWhere(function ($sub) use ($ahora) {
                      $sub->where('fecha', $ahora->toDateString())
                          ->where('hora_fin', '>=', $ahora->toTimeString());
                  });
            })
            ->exists();

        if ($tieneExamenesPendientes) {
            return response()->json([
                'message' => 'No se puede eliminar la materia porque tiene exámenes programados pendientes o en curso.',
            ], 422);
        }

        $detalles = [
            'target_type' => 'materia',
            'target_id'   => $materia->id,
            'nombre'      => $materia->nombre,
        ];

        // Soft Delete nativo con deleted_at
        $materia->delete();

        Cache::forget('catalogo_materias_all');

        $this->registrarAuditoria($request, 'MATERIA_ELIMINADA', $detalles);

        return response()->json(['message' => 'Materia eliminada exitosamente.']);
    }

    private function registrarAuditoria(Request $request, string $accion, array $detalles = []): void
    {
        $user = $request->user();

        $rol = match ($user ? get_class($user) : null) {
            Admin::class    => 'admin',
            Docente::class  => 'docente',
            Auxiliar::class => 'auxiliar',
            default         => 'desconocido',
        };

        $nombreCompleto = $user ? trim("{$user->nombre} {$user->apellido_paterno} {$user->apellido_materno}") : 'Sistema';

        LogAuditoria::create([
            'user_type'         => $user ? get_class($user) : null,
            'user_id'           => $user?->id,
            'rol_en_el_momento' => $rol,
            'usuario_nombre'    => $nombreCompleto !== '' ? $nombreCompleto : ($user?->nombre ?? 'Sistema'),
            'usuario_email'     => $user?->email ?? null,
            'modulo'            => 'MATERIAS',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}
