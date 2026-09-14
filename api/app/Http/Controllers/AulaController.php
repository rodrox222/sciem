<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAulaRequest;
use App\Http\Requests\UpdateAulaRequest;
use App\Models\Aula;
use App\Models\LogAuditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AulaController extends Controller
{
    /**
     * Listar aulas con filtros opcionales (búsqueda, estado) y paginación.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Aula::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'ilike', "%{$search}%")
                  ->orWhere('ubicacion', 'ilike', "%{$search}%");
            });
        }

        if ($estado = $request->query('estado')) {
            $query->where('estado', $estado);
        }

        $perPage = (int) $request->query('per_page', 10);
        $aulas = $query->orderBy('nombre', 'asc')->paginate($perPage);

        return response()->json($aulas);
    }

    /**
     * Registrar una nueva aula (Solo Administrador).
     */
    public function store(StoreAulaRequest $request): JsonResponse
    {
        $data = $request->validated();
        $aula = Aula::create($data);

        LogAuditoria::create([
            'user_type' => get_class($request->user()),
            'user_id'   => $request->user()->id,
            'accion'    => 'AULA_CREADA',
            'ip_origen' => $request->ip(),
            'detalles'  => [
                'aula_id'   => $aula->id,
                'nombre'    => $aula->nombre,
                'capacidad' => $aula->capacidad,
            ],
        ]);

        return response()->json([
            'message' => 'Aula creada exitosamente.',
            'aula'    => $aula,
        ], 201);
    }

    /**
     * Obtener el detalle de un aula por UUID.
     */
    public function show(string $id): JsonResponse
    {
        $aula = Aula::find($id);

        if (!$aula) {
            return response()->json(['message' => 'Aula no encontrada.'], 404);
        }

        return response()->json($aula);
    }

    /**
     * Actualizar los datos de un aula (Solo Administrador).
     */
    public function update(UpdateAulaRequest $request, string $id): JsonResponse
    {
        $aula = Aula::find($id);

        if (!$aula) {
            return response()->json(['message' => 'Aula no encontrada.'], 404);
        }

        $data = $request->validated();
        $aula->update($data);

        LogAuditoria::create([
            'user_type' => get_class($request->user()),
            'user_id'   => $request->user()->id,
            'accion'    => 'AULA_ACTUALIZADA',
            'ip_origen' => $request->ip(),
            'detalles'  => [
                'aula_id'             => $aula->id,
                'campos_actualizados' => array_keys($data),
            ],
        ]);

        return response()->json([
            'message' => 'Aula actualizada exitosamente.',
            'aula'    => $aula,
        ]);
    }

    /**
     * Eliminar un aula (Solo Administrador).
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $aula = Aula::find($id);

        if (!$aula) {
            return response()->json(['message' => 'Aula no encontrada.'], 404);
        }

        $detalles = [
            'aula_id' => $aula->id,
            'nombre'  => $aula->nombre,
        ];

        $aula->delete();

        LogAuditoria::create([
            'user_type' => get_class($request->user()),
            'user_id'   => $request->user()->id,
            'accion'    => 'AULA_ELIMINADA',
            'ip_origen' => $request->ip(),
            'detalles'  => $detalles,
        ]);

        return response()->json(['message' => 'Aula eliminada exitosamente.']);
    }
}