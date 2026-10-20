<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreNoticiaRequest;
use App\Models\Noticia;
use App\Models\Admin;
use App\Models\Docente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NoticiaController extends Controller
{
    /**
     * [HU14] Publicar aviso operativo (noticia)
     */
    public function store(StoreNoticiaRequest $request): JsonResponse
    {
        $user = $request->user();

        // Regla de Negocio: Solo Admin o Docente pueden publicar noticias generales.
        if (!($user instanceof Admin) && !($user instanceof Docente)) {
             return response()->json([
                 'message' => 'No tienes permisos para publicar noticias operativas.'
             ], 403);
        }

        $noticia = Noticia::create(array_merge(
            $request->validated(),
            [
                'autor_id' => $user->id,
                'autor_tipo' => get_class($user),
            ]
        ));

        return response()->json([
            'message' => 'Noticia operativa publicada exitosamente.',
            'noticia' => $noticia
        ], 201);
    }

    /**
     * [HU14] Obtener feed de noticias
     * Visibilidad dual: Pública (Landing Page) y Privada (Dashboard)
     */
    public function index(Request $request): JsonResponse
    {
        $esAutenticado = auth('sanctum')->check();
        $user = $esAutenticado ? auth('sanctum')->user() : null;

        $noticias = Noticia::query()
            ->when(!$esAutenticado, function ($query) {
                // Si es público, solo mostramos noticias marcadas como públicas
                $query->where('es_publica', true);
            })
            ->when($esAutenticado, function ($query) use ($user) {
                // Filtro por público objetivo según el rol (si es necesario).
                // "Todos" siempre se muestra.
                $query->where(function ($q) use ($user) {
                    $q->where('publico_objetivo', 'Todos');
                    if ($user instanceof Docente) {
                        $q->orWhere('publico_objetivo', 'Docentes');
                    }
                    // Si el usuario fuera Estudiante, agregaríamos su orWhere aquí.
                });
            })
            ->with('autor:id,nombre,apellido_paterno')
            ->orderByRaw("
                CASE prioridad
                    WHEN 'Urgente' THEN 1
                    WHEN 'Alta' THEN 2
                    WHEN 'Normal' THEN 3
                    ELSE 4
                END ASC
            ")
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($noticias);
    }
}