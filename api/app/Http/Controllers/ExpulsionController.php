<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Expulsion;
use App\Models\LogAuditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpulsionController extends Controller
{
    public function store(Request $request, string $id): JsonResponse
    {
        $request->merge([
            'motivo' => is_string($request->input('motivo'))
                ? trim($request->input('motivo'))
                : $request->input('motivo'),
        ]);
        $datos = $request->validate([
            'id_estudiante' => ['required', 'uuid', 'exists:estudiantes,id'],
            'motivo' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $examen = Examen::find($id);

        if (!$examen) {
            return response()->json([
                'message' => 'Examen no encontrado.',
            ], 404);
        }

        $estudiante = Estudiante::find($datos['id_estudiante']);

        // El estudiante debe estar vinculado al examen.
        $inscrito = $examen->estudiantes()
            ->where('estudiantes.id', $estudiante->id)
            ->exists();

        if (!$inscrito) {
            return response()->json([
                'message' => 'El estudiante no está inscrito en este examen.',
            ], 422);
        }

        $usuario = $request->user();

        return DB::transaction(function () use (
            $request,
            $examen,
            $estudiante,
            $datos,
            $usuario
        ): JsonResponse {
            $fechaHora = now();

            $expulsion = Expulsion::create([
                'id_examen' => $examen->id,
                'id_estudiante' => $estudiante->id,
                'motivo' => trim($datos['motivo']),
                'fecha_hora' => $fechaHora,
                'expulsado_por_type' => $usuario->getMorphClass(),
                'expulsado_por_id' => $usuario->getKey(),
            ]);

            $rol = match (get_class($usuario)) {
                Admin::class => 'admin',
                Docente::class => 'docente',
                Auxiliar::class => 'auxiliar',
                default => 'desconocido',
            };

            $nombreCompleto = trim(
                "{$usuario->nombre} {$usuario->apellido_paterno} {$usuario->apellido_materno}"
            );

            LogAuditoria::create([
                'user_type' => get_class($usuario),
                'user_id' => $usuario->id,
                'rol_en_el_momento' => $rol,
                'usuario_nombre' => $nombreCompleto !== ''
                    ? $nombreCompleto
                    : $usuario->nombre,
                'usuario_email' => $usuario->email ?? null,
                'modulo' => 'EXPULSIONES',
                'accion' => 'EXPULSION_REGISTRADA',
                'ip_origen' => $request->ip() ?? '127.0.0.1',
                'user_agent' => $request->userAgent(),
                'detalles' => [
                    'expulsion_id' => $expulsion->id,
                    'examen_id' => $examen->id,
                    'estudiante_id' => $estudiante->id,
                    'codigo_sis' => $estudiante->codigo_sis,
                    'motivo' => $expulsion->motivo,
                    'fecha_hora' => $fechaHora->toIso8601String(),
                ],
            ]);

        return response()->json([
            'message' => 'Expulsión registrada exitosamente.',
            'expulsion' => [
                'id' => $expulsion->id,
                'id_examen' => $expulsion->id_examen,
                'id_estudiante' => $expulsion->id_estudiante,
                'motivo' => $expulsion->motivo,
                'fecha_hora' => $expulsion->fecha_hora,
                'responsable' => [
                    'id' => $usuario->getKey(),
                    'rol' => $rol,
                    'nombre' => $nombreCompleto !== ''
                        ? $nombreCompleto
                        : $usuario->nombre,
                ],
            ],
        ], 201);

        });
    }

    public function index(Request $request, string $id): JsonResponse
    {
        $datos = $request->validate([
            'id_estudiante' => ['sometimes', 'uuid', 'exists:estudiantes,id'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $examen = Examen::find($id);

        if (!$examen) {
            return response()->json([
                'message' => 'Examen no encontrado.',
            ], 404);
        }

        $usuario = $request->user();

        if ($usuario instanceof Docente && $examen->id_docente !== $usuario->id) {
            return response()->json([
                'message' => 'No tienes permiso para consultar este examen.',
            ], 403);
        }

        $consulta = Expulsion::query()
            ->where('id_examen', $examen->id)
            ->with([
                'estudiante:id,nombre,apellido_paterno,apellido_materno,codigo_sis,ci',
            ])
            ->orderByDesc('fecha_hora');

        if (
                !$usuario instanceof Auxiliar &&
                !$usuario instanceof Admin &&
                !$usuario instanceof Docente
            ) {
            return response()->json([
                    'message' => 'No tienes permiso para consultar este historial.',
                ], 403);
            }

        if (isset($datos['id_estudiante'])) {
            $consulta->where('id_estudiante', $datos['id_estudiante']);
        }

        $paginado = $consulta->paginate($datos['per_page'] ?? 15);

        $expulsiones = $paginado->getCollection()->map(
            function (Expulsion $expulsion): array {
                $estudiante = $expulsion->estudiante;
                $responsable = $expulsion->expulsadoPor;

                $nombreEstudiante = $estudiante
                    ? trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}")
                    : null;

                $nombreResponsable = $responsable
                    ? trim("{$responsable->nombre} {$responsable->apellido_paterno} {$responsable->apellido_materno}")
                    : null;

                return [
                    'id' => $expulsion->id,
                    'id_examen' => $expulsion->id_examen,
                    'id_estudiante' => $expulsion->id_estudiante,
                    'motivo' => $expulsion->motivo,
                    'fecha_hora' => $expulsion->fecha_hora,
                    'estudiante' => $estudiante ? [
                        'id' => $estudiante->id,
                        'nombre_completo' => $nombreEstudiante,
                        'codigo_sis' => $estudiante->codigo_sis,
                        'ci' => $estudiante->ci,
                    ] : null,
                    'responsable' => $responsable ? [
                        'id' => $responsable->getKey(),
                        'rol' => match (get_class($responsable)) {
                            Admin::class => 'admin',
                            Docente::class => 'docente',
                            Auxiliar::class => 'auxiliar',
                            default => 'desconocido',
                        },
                        'nombre' => $nombreResponsable,
                    ] : null,
                ];
            }
        );

        return response()->json([
            'examen' => [
                'id' => $examen->id,
                'nombre' => $examen->nombre,
            ],
            'total' => $paginado->total(),
            'per_page' => $paginado->perPage(),
            'current_page' => $paginado->currentPage(),
            'last_page' => $paginado->lastPage(),
            'expulsiones' => $expulsiones->values(),
        ]);
    }

}
