<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreNoticiaRequest;
use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\LogAuditoria;
use App\Models\Noticia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NoticiaController extends Controller
{
    public function store(StoreNoticiaRequest $request): JsonResponse
    {
        $user = $request->user();

        if (!($user instanceof Admin) && !($user instanceof Docente)) {
            return response()->json(['message' => 'No tienes permisos para publicar noticias.'], 403);
        }

        $data = $request->validated();
        $idMateria = $data['id_materia'] ?? $data['materia_id'] ?? null;
        unset($data['materia_id']);

        if (!empty($data['id_examen'])) {
            $examen = Examen::find($data['id_examen']);

            if ($user instanceof Docente) {
                $esMateriaAsignada = $user->materias()->where('materias.id', $examen->id_materia)->exists();
                if ($examen->id_docente !== $user->id || !$esMateriaAsignada) {
                    return response()->json([
                        'message' => 'Solo puedes publicar noticias para materias y exámenes que tengas asignados.',
                    ], 422);
                }
            }

            if (!empty($idMateria) && $examen->id_materia !== $idMateria) {
                return response()->json([
                    'message' => 'El examen seleccionado no corresponde a la materia indicada.',
                ], 422);
            }

            $fechaLimpia = \Carbon\Carbon::parse($examen->fecha)->toDateString();
            $fechaHoraFin = \Carbon\Carbon::parse("{$fechaLimpia} {$examen->hora_fin}", 'America/La_Paz');

            if (now('America/La_Paz')->greaterThan($fechaHoraFin)) {
                return response()->json(['message' => 'No puedes publicar una noticia para un examen que ya finalizó.'], 422);
            }

            $data['id_materia'] = $examen->id_materia;
            $data['publico_objetivo'] = 'Estudiantes';
            $esPublicaBool = false;
        } else {
            $data['id_examen'] = null;
            $data['id_materia'] = null;
            $data['publico_objetivo'] = $data['publico_objetivo'] ?? 'Todos';
            $esPublicaBool = isset($data['es_publica'])
                ? filter_var($data['es_publica'], FILTER_VALIDATE_BOOLEAN)
                : false;
        }

        $data['es_publica'] = $esPublicaBool ? DB::raw('true') : DB::raw('false');

        $noticia = Noticia::create(array_merge(
            $data,
            [
                'autor_id'   => $user->id,
                'autor_tipo' => get_class($user),
            ]
        ));

        $this->registrarAuditoria($request, 'NOTICIA_PUBLICADA', [
            'target_type' => 'noticias',
            'target_id'   => $noticia->id,
            'titulo'      => $noticia->titulo,
        ]);

        return response()->json([
            'message' => 'Noticia publicada exitosamente.',
            'noticia' => $noticia,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $esAutenticado = auth('sanctum')->check();
        $user = $esAutenticado ? auth('sanctum')->user() : null;

        $noticias = Noticia::query()
            ->where(function ($query) {
                $query->whereNull('id_examen')
                      ->orWhereHas('examen', function ($qExamen) {
                          $qExamen->whereRaw("(CAST(fecha AS DATE) + CAST(hora_fin AS TIME)) >= ?", [now('America/La_Paz')->toDateTimeString()]);
                      });
            })
            ->when(!$esAutenticado, function ($query) {
                $query->whereRaw('es_publica is true')
                      ->whereNull('id_examen');
            })
            ->when($esAutenticado, function ($query) use ($user) {
                if ($user instanceof Admin) {
                    return;
                }

                if ($user instanceof Docente) {
                    $query->where(function ($q) use ($user) {
                        $q->where(function ($qGeneral) {
                            $qGeneral->whereNull('id_examen')
                                     ->whereIn('publico_objetivo', ['Todos', 'Docentes']);
                        })
                        ->orWhere('autor_id', $user->id)
                        ->orWhereHas('examen', function ($qExamen) use ($user) {
                            $qExamen->where('id_docente', $user->id);
                        });
                    });
                } elseif ($user instanceof Estudiante) {
                    $misExamenesIds = DB::table('estudiante_examen')
                        ->where('id_estudiante', $user->id)
                        ->pluck('id_examen')
                        ->toArray();

                    $query->where(function ($q) use ($misExamenesIds) {
                        $q->where(function ($qGeneral) {
                            $qGeneral->whereNull('id_examen')
                                     ->whereIn('publico_objetivo', ['Todos', 'Estudiantes']);
                        });

                        if (!empty($misExamenesIds)) {
                            $q->orWhereIn('id_examen', $misExamenesIds);
                        }
                    });
                }
            })
            ->with(['autor:id,nombre,apellido_paterno', 'examen:id,nombre,fecha,hora_ini,id_materia', 'materia:id,nombre'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($noticias);
    }

    public function update(StoreNoticiaRequest $request, $id): JsonResponse
    {
        $user = $request->user();
        $noticia = Noticia::findOrFail($id);

        $esAdmin = $user instanceof Admin;
        $esDocente = $user instanceof Docente;
        $esAutor = $noticia->autor_id === $user->id;

        if (!$esAdmin && !($esDocente && $esAutor)) {
            return response()->json(['message' => 'No tienes permisos para editar esta noticia.'], 403);
        }

        $data = $request->validated();
        $idMateria = $data['id_materia'] ?? $data['materia_id'] ?? null;
        unset($data['materia_id']);

        if (!empty($data['id_examen'])) {
            $examen = Examen::find($data['id_examen']);

            if ($user instanceof Docente) {
                $esMateriaAsignada = $user->materias()->where('materias.id', $examen->id_materia)->exists();
                if ($examen->id_docente !== $user->id || !$esMateriaAsignada) {
                    return response()->json([
                        'message' => 'Solo puedes publicar noticias para materias y exámenes que tengas asignados.',
                    ], 422);
                }
            }

            if (!empty($idMateria) && $examen->id_materia !== $idMateria) {
                return response()->json([
                    'message' => 'El examen seleccionado no corresponde a la materia indicada.',
                ], 422);
            }

            $fechaLimpia = \Carbon\Carbon::parse($examen->fecha)->toDateString();
            $fechaHoraFin = \Carbon\Carbon::parse("{$fechaLimpia} {$examen->hora_fin}", 'America/La_Paz');

            if (now('America/La_Paz')->greaterThan($fechaHoraFin)) {
                return response()->json(['message' => 'El examen seleccionado ya finalizó.'], 422);
            }

            $data['id_materia'] = $examen->id_materia;
            $data['publico_objetivo'] = 'Estudiantes';
            $esPublicaBool = false;
        } else {
            $data['id_examen'] = null;
            $data['id_materia'] = null;
            $data['publico_objetivo'] = $data['publico_objetivo'] ?? 'Todos';
            $esPublicaBool = isset($data['es_publica'])
                ? filter_var($data['es_publica'], FILTER_VALIDATE_BOOLEAN)
                : false;
        }

        $data['es_publica'] = $esPublicaBool;

        $camposAfectados = array_keys($data);
        $valoresAnteriores = $noticia->only($camposAfectados);
        $valoresNuevos = $data;

        $data['es_publica'] = $esPublicaBool ? DB::raw('true') : DB::raw('false');

        $noticia->update($data);

        $this->registrarAuditoria($request, 'NOTICIA_ACTUALIZADA', [
            'target_type'         => 'noticias',
            'target_id'           => $noticia->id,
            'campos_actualizados' => $camposAfectados,
            'valores_anteriores'  => $valoresAnteriores,
            'valores_nuevos'      => $valoresNuevos,
        ]);

        return response()->json([
            'message' => 'Noticia actualizada exitosamente.',
            'noticia' => $noticia,
        ]);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $noticia = Noticia::find($id);

        if (!$noticia) {
            return response()->json(['message' => 'Noticia no encontrada.'], 404);
        }

        $esAdmin = $user instanceof Admin;
        $esDocente = $user instanceof Docente;
        $esAutor = $noticia->autor_id === $user->id;

        if (!$esAdmin && !($esDocente && $esAutor)) {
            return response()->json(['message' => 'No tienes permisos para eliminar esta noticia.'], 403);
        }

        $detalles = [
            'target_type' => 'noticias',
            'target_id'   => $noticia->id,
            'titulo'      => $noticia->titulo,
        ];

        $noticia->delete();

        $this->registrarAuditoria($request, 'NOTICIA_ELIMINADA', $detalles);

        return response()->json(['message' => 'Noticia eliminada exitosamente.']);
    }

    private function registrarAuditoria(Request $request, string $accion, array $detalles = []): void
    {
        $user = $request->user();
        if (!$user) return;

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
            'modulo'            => 'NOTICIAS',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}