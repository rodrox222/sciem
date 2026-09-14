<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreNormaRequest;
use App\Http\Requests\SyncNormasExamenRequest;
use App\Http\Requests\UpdateNormaRequest;
use App\Models\Admin;
use App\Models\Examen;
use App\Models\LogAuditoria;
use App\Models\Norma;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NormaController extends Controller
{
    /**
     * Listar normas con filtros.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Norma::query();

        if ($tipo = $request->query('tipo')) {
            $query->where('tipo', ucfirst(strtolower($tipo)));
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('titulo', 'ilike', "%{$search}%")
                  ->orWhere('descripcion', 'ilike', "%{$search}%");
            });
        }

        if ($request->boolean('all')) {
            return response()->json($query->orderBy('titulo', 'asc')->get());
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(10));
    }

    /**
     * Crear una nueva norma.
     */
    public function store(StoreNormaRequest $request): JsonResponse
    {
        $data = $request->validated();
        $norma = Norma::create($data);

        LogAuditoria::create([
            'user_type' => get_class($request->user()),
            'user_id'   => $request->user()->id,
            'accion'    => 'NORMA_CREADA',
            'ip_origen' => $request->ip(),
            'detalles'  => [
                'norma_id' => $norma->id,
                'titulo'   => $norma->titulo,
                'tipo'     => $norma->tipo,
            ],
        ]);

        return response()->json([
            'message' => 'Norma creada exitosamente.',
            'norma'   => $norma,
        ], 201);
    }

    /**
     * Detalle de una norma.
     */
    public function show(string $id): JsonResponse
    {
        $norma = Norma::find($id);

        if (!$norma) {
            return response()->json(['message' => 'Norma no encontrada.'], 404);
        }

        return response()->json($norma);
    }

    /**
     * Actualizar una norma.
     * Restricción: Los docentes NO pueden modificar normas Generales.
     */
    public function update(UpdateNormaRequest $request, string $id): JsonResponse
    {
        $norma = Norma::find($id);

        if (!$norma) {
            return response()->json(['message' => 'Norma no encontrada.'], 404);
        }

        $esAdmin = $request->user() instanceof Admin;
        if ($norma->tipo === 'General' && !$esAdmin) {
            return response()->json([
                'message' => 'No tienes permisos para modificar normas de tipo General.',
            ], 403);
        }

        $data = $request->validated();
        $norma->update($data);

        LogAuditoria::create([
            'user_type' => get_class($request->user()),
            'user_id'   => $request->user()->id,
            'accion'    => 'NORMA_ACTUALIZADA',
            'ip_origen' => $request->ip(),
            'detalles'  => [
                'norma_id'            => $norma->id,
                'campos_actualizados' => array_keys($data),
            ],
        ]);

        return response()->json([
            'message' => 'Norma actualizada exitosamente.',
            'norma'   => $norma,
        ]);
    }

    /**
     * Eliminar una norma.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $norma = Norma::find($id);

        if (!$norma) {
            return response()->json(['message' => 'Norma no encontrada.'], 404);
        }

        $esAdmin = $request->user() instanceof Admin;
        if ($norma->tipo === 'General' && !$esAdmin) {
            return response()->json([
                'message' => 'No tienes permisos para eliminar normas de tipo General.',
            ], 403);
        }

        $detalles = [
            'norma_id' => $norma->id,
            'titulo'   => $norma->titulo,
            'tipo'     => $norma->tipo,
        ];

        $norma->delete();

        LogAuditoria::create([
            'user_type' => get_class($request->user()),
            'user_id'   => $request->user()->id,
            'accion'    => 'NORMA_ELIMINADA',
            'ip_origen' => $request->ip(),
            'detalles'  => $detalles,
        ]);

        return response()->json(['message' => 'Norma eliminada exitosamente.']);
    }

    /**
     * Asignar o sincronizar un conjunto de normas a un examen específico (tabla pivote).
     */
    public function syncExamenNormas(SyncNormasExamenRequest $request, string $idExamen): JsonResponse
    {
        $examen = Examen::find($idExamen);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        // Sincroniza los UUIDs en la tabla examen_norma (añade los nuevos y desvincula los que no estén en la lista)
        $examen->normas()->sync($request->validated('normas'));

        LogAuditoria::create([
            'user_type' => get_class($request->user()),
            'user_id'   => $request->user()->id,
            'accion'    => 'NORMAS_ASIGNADAS_EXAMEN',
            'ip_origen' => $request->ip(),
            'detalles'  => [
                'examen_id' => $examen->id,
                'normas_ids' => $request->validated('normas'),
            ],
        ]);

        return response()->json([
            'message' => 'Normas asignadas al examen correctamente.',
            'normas'  => $examen->normas()->get(),
        ]);
    }
}