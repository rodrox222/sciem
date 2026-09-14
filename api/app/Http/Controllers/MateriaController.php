<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMateriaRequest;
use App\Http\Requests\UpdateMateriaRequest;
use App\Models\LogAuditoria;
use App\Models\Materia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MateriaController extends Controller
{
    /**
     * Listar materias con búsqueda y paginación opcional
     */
    public function index(Request $request): JsonResponse
    {
        $query = Materia::query();

        if ($search = $request->query('search')) {
            $query->where('nombre', 'ilike', "%{$search}%");
        }

        // Si mandan ?all=true devuelve la lista completa sin paginar (ideal para selects/comboboxes en React)
        if ($request->boolean('all')) {
            return response()->json($query->orderBy('nombre', 'asc')->get());
        }

        $perPage = (int) $request->query('per_page', 10);
        $materias = $query->orderBy('nombre', 'asc')->paginate($perPage);

        return response()->json($materias);
    }

    /**
     * Crear una materia (Admin y Docente)
     */
    public function store(StoreMateriaRequest $request): JsonResponse
    {
        $data = $request->validated();
        $materia = Materia::create($data);

        LogAuditoria::create([
            'user_type' => get_class($request->user()),
            'user_id'   => $request->user()->id,
            'accion'    => 'MATERIA_CREADA',
            'ip_origen' => $request->ip(),
            'detalles'  => [
                'materia_id' => $materia->id,
                'nombre'     => $materia->nombre,
            ],
        ]);

        return response()->json([
            'message' => 'Materia creada exitosamente.',
            'materia' => $materia,
        ], 201);
    }

    /**
     * Ver detalle de una materia con la cantidad de exámenes relacionados
     */
    public function show(string $id): JsonResponse
    {
        $materia = Materia::withCount('examenes')->find($id);

        if (!$materia) {
            return response()->json(['message' => 'Materia no encontrada.'], 404);
        }

        return response()->json($materia);
    }

    /**
     * Actualizar una materia
     */
    public function update(UpdateMateriaRequest $request, string $id): JsonResponse
    {
        $materia = Materia::find($id);

        if (!$materia) {
            return response()->json(['message' => 'Materia no encontrada.'], 404);
        }

        $data = $request->validated();
        $materia->update($data);

        LogAuditoria::create([
            'user_type' => get_class($request->user()),
            'user_id'   => $request->user()->id,
            'accion'    => 'MATERIA_ACTUALIZADA',
            'ip_origen' => $request->ip(),
            'detalles'  => [
                'materia_id'          => $materia->id,
                'campos_actualizados' => array_keys($data),
            ],
        ]);

        return response()->json([
            'message' => 'Materia actualizada exitosamente.',
            'materia' => $materia,
        ]);
    }

    /**
     * Eliminar materia evitando romper integridad referencial
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $materia = Materia::withCount('examenes')->find($id);

        if (!$materia) {
            return response()->json(['message' => 'Materia no encontrada.'], 404);
        }

        if ($materia->examenes_count > 0) {
            return response()->json([
                'message' => 'No se puede eliminar la materia porque tiene exámenes asociados.',
            ], 422);
        }

        $detalles = [
            'materia_id' => $materia->id,
            'nombre'     => $materia->nombre,
        ];

        $materia->delete();

        LogAuditoria::create([
            'user_type' => get_class($request->user()),
            'user_id'   => $request->user()->id,
            'accion'    => 'MATERIA_ELIMINADA',
            'ip_origen' => $request->ip(),
            'detalles'  => $detalles,
        ]);

        return response()->json(['message' => 'Materia eliminada exitosamente.']);
    }
}