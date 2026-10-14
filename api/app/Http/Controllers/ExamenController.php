<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreExamenRequest;
use App\Http\Requests\UpdateExamenRequest;
use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Examen;
use App\Models\LogAuditoria;
use App\Models\Norma;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExamenController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Examen::with([
            'materia:id,nombre',
            'aula:id,nombre',
            'docente:id,nombre,apellido_paterno',
            'normas:id,titulo,tipo',
        ]);

        if ($search = $request->query('search')) {
            $query->where('nombre', 'ilike', "%{$search}%");
        }

        if ($estado = $request->query('estado')) {
            $query->where('estado', $estado);
        }

        // Filtro por fecha única
        if ($fecha = $request->query('fecha')) {
            $query->where('fecha', $fecha);
        }

        // Filtro por rango de fechas
        if ($fechaDesde = $request->query('fecha_desde')) {
            $query->where('fecha', '>=', $fechaDesde);
        }
        if ($fechaHasta = $request->query('fecha_hasta')) {
            $query->where('fecha', '<=', $fechaHasta);
        }

        $perPage = (int) $request->query('per_page', 10);
        $examenes = $query->orderBy('fecha', 'desc')->orderBy('hora_ini', 'asc')->paginate($perPage);

        return response()->json($examenes);
    }

    public function store(StoreExamenRequest $request): JsonResponse
    {
        $data = $request->validated();

        $examen = DB::transaction(function () use ($data, $request) {
            $examen = Examen::create($data);

            // Las normas son opcionales
            if ($request->has('normas_ids') && is_array($request->input('normas_ids'))) {
                $examen->normas()->sync($request->input('normas_ids'));
            }

            // Normas particulares opcionales
            if ($request->has('normas_particulares') && is_array($request->input('normas_particulares'))) {
                foreach ($request->input('normas_particulares') as $part) {
                    if (!empty($part['titulo']) && !empty($part['descripcion'])) {
                        $nuevaNorma = Norma::create([
                            'titulo'      => trim($part['titulo']),
                            'descripcion' => trim($part['descripcion']),
                            'tipo'        => 'Particular',
                            'estado'      => 'Activo',
                        ]);
                        $examen->normas()->attach($nuevaNorma->id);
                    }
                }
            }

            return $examen;
        });

        $this->registrarAuditoria($request, 'EXAMEN_CREADO', [
            'examen_id'  => $examen->id,
            'nombre'     => $examen->nombre,
            'id_materia' => $examen->id_materia,
            'fecha'      => $examen->fecha,
        ]);

        return response()->json([
            'message' => 'Examen programado exitosamente.',
            'examen'  => $examen->load(['materia', 'aula', 'docente', 'normas']),
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $examen = Examen::with(['materia', 'aula', 'docente', 'normas'])->find($id);

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

        DB::transaction(function () use ($examen, $data, $request) {
            $examen->update($data);

            if ($request->has('normas_ids') && is_array($request->input('normas_ids'))) {
                $examen->normas()->sync($request->input('normas_ids'));
            }

            if ($request->has('normas_particulares') && is_array($request->input('normas_particulares'))) {
                foreach ($request->input('normas_particulares') as $part) {
                    if (!empty($part['titulo']) && !empty($part['descripcion'])) {
                        $nuevaNorma = Norma::create([
                            'titulo'      => trim($part['titulo']),
                            'descripcion' => trim($part['descripcion']),
                            'tipo'        => 'Particular',
                            'estado'      => 'Activo',
                        ]);
                        $examen->normas()->attach($nuevaNorma->id);
                    }
                }
            }
        });

        $this->registrarAuditoria($request, 'EXAMEN_ACTUALIZADO', [
            'examen_id'           => $examen->id,
            'campos_actualizados' => array_keys($data),
        ]);

        return response()->json([
            'message' => 'Examen actualizado exitosamente.',
            'examen'  => $examen->load(['materia', 'aula', 'docente', 'normas']),
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

        $this->registrarAuditoria($request, 'EXAMEN_ELIMINADO', $detalles);

        return response()->json(['message' => 'Examen eliminado exitosamente.']);
    }

    private function registrarAuditoria(Request $request, string $accion, array $detalles = []): void
    {
        $user = $request->user();

        $rol = match (get_class($user)) {
            Admin::class    => 'admin',
            Docente::class  => 'docente',
            Auxiliar::class => 'auxiliar',
            default         => 'desconocido',
        };

        $nombreCompleto = trim("{$user->nombre} {$user->apellido_paterno} {$user->apellido_materno}");

        LogAuditoria::create([
            'user_type'         => get_class($user),
            'user_id'           => $user->id,
            'rol_en_el_momento' => $rol,
            'usuario_nombre'    => $nombreCompleto !== '' ? $nombreCompleto : $user->nombre,
            'usuario_email'     => $user->email ?? null,
            'modulo'            => 'EXAMENES',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}