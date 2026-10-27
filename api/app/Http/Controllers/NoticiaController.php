<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreNoticiaRequest;
use App\Models\Noticia;
use App\Models\Admin;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
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

        // Control: No permitir avisos para exámenes que ya finalizaron
        if (!empty($data['id_examen'])) {
            $examen = Examen::find($data['id_examen']);
            
            // FIX: Extraer solo la fecha y forzar la zona horaria de Bolivia
            $fechaLimpia = \Carbon\Carbon::parse($examen->fecha)->toDateString();
            $fechaHoraFin = \Carbon\Carbon::parse("{$fechaLimpia} {$examen->hora_fin}", 'America/La_Paz');
            
            // Comparamos usando exactamente la hora actual de Bolivia
            if (now('America/La_Paz')->greaterThan($fechaHoraFin)) {
                return response()->json(['message' => 'No puedes publicar una noticia para un examen que ya finalizó.'], 422);
            }
        }

        $noticia = Noticia::create(array_merge(
            $data,
            [
                'autor_id' => $user->id,
                'autor_tipo' => get_class($user),
            ]
        ));

        return response()->json([
            'message' => 'Noticia publicada exitosamente.',
            'noticia' => $noticia
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $esAutenticado = auth('sanctum')->check();
        $user = $esAutenticado ? auth('sanctum')->user() : null;

        $noticias = Noticia::query()
            // 1. FILTRO DE EXPIRACIÓN AUTOMÁTICA
            // Ocultar noticias de exámenes que ya concluyeron
            ->where(function ($query) {
                $query->whereNull('id_examen')
                      ->orWhereHas('examen', function ($qExamen) {
                          // FIX: Sumamos la fecha (limpiada como DATE) y la hora (como TIME) nativamente en PostgreSQL
                          $qExamen->whereRaw("(CAST(fecha AS DATE) + CAST(hora_fin AS TIME)) >= ?", [now('America/La_Paz')->toDateTimeString()]);
                      });
            })
            // 2. FILTRO DE VISIBILIDAD
            ->when(!$esAutenticado, function ($query) {
                $query->where('es_publica', true);
            })
            // 3. FILTRO DE ROLES (RBAC)
            ->when($esAutenticado, function ($query) use ($user) {
                
                if ($user instanceof Admin) {
                    // El Admin ve todo por defecto (bypass total)
                } 
                elseif ($user instanceof Docente) {
                    $query->where(function ($q) use ($user) {
                        $q->where('publico_objetivo', 'Todos')
                          ->orWhere('publico_objetivo', 'Docentes')
                          ->orWhere('autor_id', $user->id);
                    });
                } 
                elseif ($user instanceof Estudiante) {
                    $misExamenesIds = DB::table('estudiante_examen')
                                        ->where('estudiante_id', $user->id)
                                        ->pluck('examen_id');

                    $query->where(function ($q) use ($misExamenesIds) {
                        $q->where('publico_objetivo', 'Todos')
                          ->orWhere(function ($q2) {
                              $q2->where('publico_objetivo', 'Estudiantes')
                                 ->whereNull('id_examen'); 
                          })
                          ->orWhereIn('id_examen', $misExamenesIds); 
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
            
            // FIX: Extraer solo la fecha y forzar la zona horaria de Bolivia
            $fechaLimpia = \Carbon\Carbon::parse($examen->fecha)->toDateString();
            $fechaHoraFin = \Carbon\Carbon::parse("{$fechaLimpia} {$examen->hora_fin}", 'America/La_Paz');
            
            // Comparamos usando exactamente la hora actual de Bolivia
            if (now('America/La_Paz')->greaterThan($fechaHoraFin)) {
                return response()->json(['message' => 'El examen seleccionado ya finalizó.'], 422);
            }
        }

        $noticia->update($data);

        return response()->json([
            'message' => 'Noticia actualizada exitosamente.',
            'noticia' => $noticia
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

        $noticia->delete();

        return response()->json(['message' => 'Noticia eliminada exitosamente.']);
    }
}