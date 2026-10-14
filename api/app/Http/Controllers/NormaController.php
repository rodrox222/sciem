<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreNormaRequest;
use App\Http\Requests\SyncNormasExamenRequest;
use App\Http\Requests\UpdateNormaRequest;
use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Examen;
use App\Models\LogAuditoria;
use App\Models\Norma;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Cache;

class NormaController extends Controller
{
    /**
     * Listar normas con filtros.
     */
    public function index(Request $request): JsonResponse
    {
        $tipo = $request->query('tipo');
        $search = $request->query('search');

        // Cachear catálogo de normas generales
        if ($request->boolean('all') && $tipo === 'General' && !$search) {
            $normas = Cache::remember('catalogo_normas_generales', 600, function () {
                return Norma::where('tipo', 'General')->orderBy('titulo', 'asc')->get();
            });
            return response()->json($normas);
        }

        $query = Norma::query();
        if ($tipo) {
            $query->where('tipo', ucfirst(strtolower($tipo)));
        }
        if ($estado = $request->query('estado')) {
            $query->where('estado', ucfirst(strtolower($estado)));
        }
        if ($search) {
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

        $this->registrarAuditoria($request, 'NORMA_CREADA', [
            'norma_id' => $norma->id,
            'titulo'   => $norma->titulo,
            'tipo'     => $norma->tipo,
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
        if (isset($data['tipo']) && $data['tipo'] !== $norma->tipo) {
            throw ValidationException::withMessages(['tipo' => 'El tipo de una norma existente no puede cambiarse.']);
        }
        $norma->update($data);

        $this->registrarAuditoria($request, 'NORMA_ACTUALIZADA', [
            'norma_id'            => $norma->id,
            'campos_actualizados' => array_keys($data),
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

        $this->registrarAuditoria($request, 'NORMA_ELIMINADA', $detalles);

        return response()->json(['message' => 'Norma eliminada exitosamente.']);
    }

    /** Crea normas particulares dentro de un examen, sin dejar normas sueltas. */
    public function crearParticularesParaExamen(Request $request, string $id): JsonResponse
    {
        $examen = Examen::find($id);
        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        if ($request->user() instanceof Docente && $examen->id_docente !== $request->user()->id) {
            return response()->json(['message' => 'Este examen pertenece a otro docente.'], 403);
        }

        $data = $request->validate([
            'particulares' => ['required', 'array', 'min:1', 'max:20'],
            'particulares.*.titulo' => ['required', 'string', 'max:150'],
            'particulares.*.descripcion' => ['required', 'string'],
        ]);

        $normas = DB::transaction(function () use ($examen, $data) {
            $creadas = collect();
            foreach ($data['particulares'] as $particular) {
                $existente = $examen->normas()
                    ->where('tipo', 'Particular')
                    ->where('titulo', trim($particular['titulo']))
                    ->where('descripcion', trim($particular['descripcion']))
                    ->first();
                if ($existente) {
                    $creadas->push($existente);
                    continue;
                }
                $norma = Norma::create([
                    'titulo' => trim($particular['titulo']),
                    'descripcion' => trim($particular['descripcion']),
                    'tipo' => 'Particular',
                ]);
                $examen->normas()->attach($norma->id);
                $creadas->push($norma);
            }
            return $creadas;
        });

        $this->registrarAuditoria($request, 'NORMAS_PARTICULARES_CREADAS_EXAMEN', [
            'examen_id' => $examen->id,
            'normas_ids' => $normas->pluck('id')->all(),
        ]);

        return response()->json([
            'message' => 'Normas particulares vinculadas al examen.',
            'normas' => $normas,
        ], 201);
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

        if ($request->user() instanceof Docente && $examen->id_docente !== $request->user()->id) {
            return response()->json(['message' => 'Este examen pertenece a otro docente.'], 403);
        }

        $ids = array_values(array_unique($request->validated('normas')));
        $permitidas = Norma::whereIn('id', $ids)
            ->where(function ($query) use ($examen) {
                $query->where('tipo', 'General')
                    ->orWhereHas('examenes', fn ($q) => $q->where('examenes.id', $examen->id));
            })->count();
        if ($permitidas !== count($ids)) {
            throw ValidationException::withMessages([
                'normas' => 'Solo pueden asignarse normas generales o particulares de este examen.',
            ]);
        }

        $examen->normas()->sync($ids);

        $this->registrarAuditoria($request, 'NORMAS_ASIGNADAS_EXAMEN', [
            'examen_id'  => $examen->id,
            'normas_ids' => $request->validated('normas'),
        ]);

        return response()->json([
            'message' => 'Normas asignadas al examen correctamente.',
            'normas'  => $examen->normas()->get(),
        ]);
    }

    /**
     * Registra el evento en logs_auditoria con el nuevo esquema centralizado.
     */
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
            'modulo'            => 'NORMAS',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}