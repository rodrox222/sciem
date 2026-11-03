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

        if (!empty($data['id_examen'])) {
            $examen = Examen::find($data['id_examen']);

            $fechaLimpia = \Carbon\Carbon::parse($examen->fecha)->toDateString();
            $fechaHoraFin = \Carbon\Carbon::parse("{$fechaLimpia} {$examen->hora_fin}", 'America/La_Paz');

            if (now('America/La_Paz')->greaterThan($fechaHoraFin)) {
                return response()->json(['message' => 'No puedes publicar una noticia para un examen que ya finalizó.'], 422);
            }
        }

        // Blindaje contra la emulación de PDO en PostgreSQL
        $esPublicaBool = isset($data['es_publica'])
            ? filter_var($data['es_publica'], FILTER_VALIDATE_BOOLEAN)
            : true;
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
                $query->whereRaw('es_publica is true');
            })
            ->when($esAutenticado, function ($query) use ($user) {
                if ($user instanceof Admin) {
                    // Admin ve todo
                } elseif ($user instanceof Docente) {
                    $query->where(function ($q) use ($user) {
                        $q->where('publico_objetivo', 'Todos')
                          ->orWhere('publico_objetivo', 'Docentes')
                          ->orWhere('autor_id', $user->id);
                    });
                } elseif ($user instanceof Estudiante) {
                    $misExamenesIds = DB::table('estudiante_examen')
                        ->where('id_estudiante', $user->id)
                        ->pluck('id_examen')
                        ->toArray();

                    $query->where(function ($q) use ($misExamenesIds) {
                        $q->where('publico_objetivo', 'Todos')
                          ->orWhere(function ($q2) {
                              $q2->where('publico_objetivo', 'Estudiantes')
                                 ->whereNull('id_examen');
                          });

                        if (!empty($misExamenesIds)) {
                            $q->orWhereIn('id_examen', $misExamenesIds);
                        }
                    });
                }
            })
            ->with(['autor:id,nombre,apellido_paterno', 'examen:id,id_materia'])
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

        if (!empty($data['id_examen'])) {
            $examen = Examen::find($data['id_examen']);

            $fechaLimpia = \Carbon\Carbon::parse($examen->fecha)->toDateString();
            $fechaHoraFin = \Carbon\Carbon::parse("{$fechaLimpia} {$examen->hora_fin}", 'America/La_Paz');

            if (now('America/La_Paz')->greaterThan($fechaHoraFin)) {
                return response()->json(['message' => 'El examen seleccionado ya finalizó.'], 422);
            }
        }

        $camposAfectados = array_keys($data);
        $valoresAnteriores = $noticia->only($camposAfectados);

        if (isset($data['es_publica'])) {
            $esPublicaBool = filter_var($data['es_publica'], FILTER_VALIDATE_BOOLEAN);
            $data['es_publica'] = $esPublicaBool ? DB::raw('true') : DB::raw('false');
        }

        $noticia->update($data);

        $this->registrarAuditoria($request, 'NOTICIA_ACTUALIZADA', [
            'target_type'         => 'noticias',
            'target_id'           => $noticia->id,
            'campos_actualizados' => $camposAfectados,
            'valores_anteriores'  => $valoresAnteriores,
            'valores_nuevos'      => $data,
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