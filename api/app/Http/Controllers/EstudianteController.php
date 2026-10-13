<?php

namespace App\Http\Controllers;

use App\Http\Requests\InscribirEstudianteExamenRequest;
use App\Http\Requests\StoreEstudianteRequest;
use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\LogAuditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EstudianteController extends Controller
{
    /**
     * Listar todos los estudiantes registrados.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Estudiante::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'ilike', "%{$search}%")
                  ->orWhere('apellido_paterno', 'ilike', "%{$search}%")
                  ->orWhere('apellido_materno', 'ilike', "%{$search}%")
                  ->orWhere('codigo_sis', 'ilike', "%{$search}%")
                  ->orWhere('ci', 'ilike', "%{$search}%");
            });
        }

        $perPage = (int) $request->query('per_page', 10);
        return response()->json($query->orderBy('apellido_paterno', 'asc')->paginate($perPage));
    }

    /**
     * Registrar un estudiante en el padrón general.
     */
    public function store(StoreEstudianteRequest $request): JsonResponse
    {
        $data = $request->validated();
        $estudiante = Estudiante::create($data);

        $this->registrarAuditoria($request, 'ESTUDIANTE_CREADO', [
            'estudiante_id' => $estudiante->id,
            'codigo_sis'    => $estudiante->codigo_sis,
            'ci'            => $estudiante->ci,
        ]);

        return response()->json([
            'message'    => 'Estudiante registrado exitosamente.',
            'estudiante' => $estudiante,
        ], 201);
    }

    /**
     * Obtener estudiante por UUID o por Código SIS.
     */
    public function show(string $identificador): JsonResponse
    {
        $estudiante = Estudiante::where('id', $identificador)
            ->orWhere('codigo_sis', $identificador)
            ->first();

        if (!$estudiante) {
            return response()->json(['message' => 'Estudiante no encontrado.'], 404);
        }

        return response()->json($estudiante);
    }

    /**
     * Listar los estudiantes asignados a un examen específico.
     */
    public function estudiantesPorExamen(Request $request, string $idExamen): JsonResponse
    {
        $examen = Examen::find($idExamen);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        $query = $examen->estudiantes();

        if ($estado = $request->query('estado')) {
            $query->wherePivot('estado', $estado);
        }

        return response()->json($query->paginate(15));
    }

    /**
     * Inscribir estudiante al examen:
     * Si no existe en la BD, lo crea. Si ya existe, actualiza sus datos básicos y lo vincula al examen.
     */
    public function inscribirAExamen(InscribirEstudianteExamenRequest $request, string $idExamen): JsonResponse
    {
        $examen = Examen::withCount('prerrequisitos')->find($idExamen);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        if ($request->user() instanceof Docente && $examen->id_docente !== $request->user()->id) {
            return response()->json(['message' => 'Este examen pertenece a otro docente.'], 403);
        }

        $data = $request->validated();

        // Si el examen tiene prerrequisitos -> Inhabilitado. Si no tiene -> Habilitado.
        $estadoPorDefecto = ($examen->prerrequisitos_count > 0) ? 'Inhabilitado' : 'Habilitado';
        $estado = $data['estado'] ?? $estadoPorDefecto;

        $estudiante = DB::transaction(function () use ($examen, $data, $estado) {
            $estudiante = Estudiante::updateOrCreate(
                ['codigo_sis' => $data['codigo_sis']],
                [
                    'ci'                  => $data['ci'] ?? null,
                    'ci_extension'        => $data['ci_extension'] ?? null,
                    'nombre'              => $data['nombre'],
                    'apellido_paterno'    => $data['apellido_paterno'],
                    'apellido_materno'    => $data['apellido_materno'] ?? null,
                    'email_institucional' => $data['email_institucional'],
                    'activo'              => true,
                ]
            );

            $examen->estudiantes()->syncWithoutDetaching([
                $estudiante->id => [
                    'estado'        => $estado,
                    'motivo_estado' => null,
                    'ajuste_manual' => false,
                ],
            ]);

            return $estudiante;
        });

        $this->registrarAuditoria($request, 'ESTUDIANTE_INSCRITO_EXAMEN', [
            'examen_id'     => $examen->id,
            'estudiante_id' => $estudiante->id,
            'codigo_sis'    => $estudiante->codigo_sis,
            'estado'        => $estado,
        ]);

        return response()->json([
            'message'    => 'Estudiante vinculado al examen exitosamente.',
            'estudiante' => $estudiante->load(['examenes' => function ($q) use ($idExamen) {
                $q->where('examenes.id', $idExamen);
            }]),
        ], 200);
    }

    /**
     * Desvincular estudiante de un examen.
     */
    public function desvincularDeExamen(Request $request, string $idExamen, string $idEstudiante): JsonResponse
    {
        $examen = Examen::find($idExamen);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        $examen->estudiantes()->detach($idEstudiante);

        $this->registrarAuditoria($request, 'ESTUDIANTE_DESVINCULADO_EXAMEN', [
            'examen_id'     => $examen->id,
            'estudiante_id' => $idEstudiante,
        ]);

        return response()->json(['message' => 'Estudiante desvinculado del examen correctamente.']);
    }

    /**
     * Registra auditoría centralizada.
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
            'modulo'            => 'ESTUDIANTES',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}