<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreExamenRequest;
use App\Http\Requests\UpdateExamenRequest;
use App\Models\Examen;
use App\Models\LogAuditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamenController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Examen::with(['materia:id,nombre', 'aula:id,nombre', 'docente:id,nombre,apellido_paterno']);

        if ($search = $request->query('search')) {
            $query->where('nombre', 'ilike', "%{$search}%");
        }

        if ($estado = $request->query('estado')) {
            $query->where('estado', $estado);
        }

        if ($fecha = $request->query('fecha')) {
            $query->where('fecha', $fecha);
        }

        $perPage = (int) $request->query('per_page', 10);
        $examenes = $query->orderBy('fecha', 'desc')->orderBy('hora_ini', 'asc')->paginate($perPage);

        return response()->json($examenes);
    }

    public function store(StoreExamenRequest $request): JsonResponse
    {
        $data = $request->validated();
        $examen = Examen::create($data);

        LogAuditoria::create([
            'user_type' => get_class($request->user()),
            'user_id'   => $request->user()->id,
            'accion'    => 'EXAMEN_CREADO',
            'ip_origen' => $request->ip(),
            'detalles'  => [
                'examen_id'  => $examen->id,
                'nombre'     => $examen->nombre,
                'id_materia' => $examen->id_materia,
                'fecha'      => $examen->fecha,
            ],
        ]);

        return response()->json([
            'message' => 'Examen programado exitosamente.',
            'examen'  => $examen->load(['materia', 'aula', 'docente']),
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $examen = Examen::with(['materia', 'aula', 'docente'])->find($id);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        return response()->json($examen);
    }

    public function update(UpdateExamenRequest $request, string $id): JsonResponse
    {
        $examen = Examen::find($id);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        $data = $request->validated();
        $examen->update($data);

        LogAuditoria::create([
            'user_type' => get_class($request->user()),
            'user_id'   => $request->user()->id,
            'accion'    => 'EXAMEN_ACTUALIZADO',
            'ip_origen' => $request->ip(),
            'detalles'  => [
                'examen_id'           => $examen->id,
                'campos_actualizados' => array_keys($data),
            ],
        ]);

        return response()->json([
            'message' => 'Examen actualizado exitosamente.',
            'examen'  => $examen->load(['materia', 'aula', 'docente']),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $examen = Examen::find($id);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        $detalles = [
            'examen_id' => $examen->id,
            'nombre'    => $examen->nombre,
        ];

        $examen->delete();

        LogAuditoria::create([
            'user_type' => get_class($request->user()),
            'user_id'   => $request->user()->id,
            'accion'    => 'EXAMEN_ELIMINADO',
            'ip_origen' => $request->ip(),
            'detalles'  => $detalles,
        ]);

        return response()->json(['message' => 'Examen eliminado exitosamente.']);
    }
}