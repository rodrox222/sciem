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
    /**
     * Agenda Académica / Home: Público. Trae todos los exámenes programados.
     */
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

        if ($fecha = $request->query('fecha')) {
            $query->where('fecha', $fecha);
        }

        if ($fechaDesde = $request->query('fecha_desde')) {
            $query->where('fecha', '>=', $fechaDesde);
        }
        if ($fechaHasta = $request->query('fecha_hasta')) {
            $query->where('fecha', '<=', $fechaHasta);
        }

        $perPage = max(1, min(100, (int) $request->query('per_page', 10)));
        $examenes = $query->orderBy('fecha', 'desc')->orderBy('hora_ini', 'asc')->paginate($perPage);

        return response()->json($examenes);
    }

    /**
     * Dashboard "Mis exámenes": Exclusivo del docente titular o auxiliar asignado.
     */
    public function misExamenes(Request $request): JsonResponse
    {
        /** @var \App\Models\Docente|\App\Models\Auxiliar|\App\Models\Admin $user */
        $user = $request->user();

        $query = Examen::with([
            'materia:id,nombre',
            'aula:id,nombre',
            'docente:id,nombre,apellido_paterno',
            'normas:id,titulo,tipo',
        ]);

        $rol = \App\Services\RolOperativo::actual($request);
        if ($rol === 'docente') $query->where('id_docente', $user->id);
        elseif ($rol === 'auxiliar') $query->whereIn('id', \App\Services\AccesoExamen::asignaciones($user)->select('id_examen'));
        else abort_unless($rol === 'admin', 403);

        if ($search = $request->query('search')) {
            $query->where('nombre', 'ilike', "%{$search}%");
        }

        if ($estado = $request->query('estado')) {
            $query->where('estado', $estado);
        }

        if ($fecha = $request->query('fecha')) {
            $query->where('fecha', $fecha);
        }

        if ($fechaDesde = $request->query('fecha_desde')) {
            $query->where('fecha', '>=', $fechaDesde);
        }
        if ($fechaHasta = $request->query('fecha_hasta')) {
            $query->where('fecha', '<=', $fechaHasta);
        }

        $perPage = max(1, min(100, (int) $request->query('per_page', 10)));
        $examenes = $query->orderBy('fecha', 'desc')->orderBy('hora_ini', 'asc')->paginate($perPage);

        return response()->json($examenes);
    }

    public function store(StoreExamenRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        // Si quien crea es docente, forzar id_docente a su propio ID
        if ($user instanceof Docente || ($user->rol ?? '') === 'docente') {
            $data['id_docente'] = $user->id;
        }

        $examen = DB::transaction(function () use ($data, $request) {
            $examen = Examen::create($data);

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

    /**
     * Consulta individual del examen (Blindado contra accesos no autorizados)
     */
    public function show(Request $request, string $id): JsonResponse
    {
        \App\Services\AccesoExamen::buscar($id);
        $examen = Examen::with(['materia', 'aula', 'docente', 'normas'])->find($id);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        // Validación de pertenencia/rol
        if (!\App\Services\AccesoExamen::permite($request, $examen)) {
            return response()->json([
                'success' => false,
                'message' => 'Acceso denegado: no tienes permisos para acceder a esta evaluación.',
            ], 403);
        }

        return response()->json($examen);
    }

    /**
     * Actualización del examen (Solo docente titular o admin)
     */
    public function update(UpdateExamenRequest $request, string $id): JsonResponse
    {
        $examen = Examen::find($id);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        if (!$this->validarAccesoExamen($request->user(), $examen, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Acceso denegado: no puedes modificar un examen del cual no eres titular.',
            ], 403);
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

    /**
     * Eliminación del examen (Solo docente titular o admin)
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $examen = Examen::find($id);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        if (!$this->validarAccesoExamen($request->user(), $examen, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Acceso denegado: no puedes eliminar un examen del cual no eres titular.',
            ], 403);
        }

        $detalles = [
            'examen_id' => $examen->id,
            'nombre'    => $examen->nombre,
        ];

        $examen->delete();

        $this->registrarAuditoria($request, 'EXAMEN_ELIMINADO', $detalles);

        return response()->json(['message' => 'Examen eliminado exitosamente.']);
    }

    /**
     * Helper de autorización:
     * - $soloEscritura = false: permite lectura a admin, docente titular y auxiliar aceptado.
     * - $soloEscritura = true: permite edición/borrado solo a admin y docente titular.
     */
    private function validarAccesoExamen($user, Examen $examen, bool $soloEscritura = false): bool
    {
        if (!$user) {
            return false;
        }

        if ($user instanceof Admin || ($user->rol ?? '') === 'admin' || ($user->rol ?? '') === 'administrador') {
            return true;
        }

        if ($user instanceof Docente || ($user->rol ?? '') === 'docente') {
            return $examen->id_docente === $user->id;
        }

        if (!$soloEscritura && ($user instanceof Auxiliar || ($user->rol ?? '') === 'auxiliar')) {
            return DB::table('examen_auxiliar')
                ->where('id_examen', $examen->id)
                ->where('id_auxiliar', $user->id)
                ->where('estado', 'Aceptada')
                ->exists();
        }

        return false;
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