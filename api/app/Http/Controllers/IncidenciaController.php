<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreIncidenciaRequest;
use App\Http\Requests\StoreNoticiaRequest;
use App\Models\Incidencia;
use App\Models\Noticia;
use App\Models\Admin;
use App\Models\Docente;
use App\Models\Auxiliar;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IncidenciaController extends Controller
{
    /**
     * [HU14/T2] Registrar situación excepcional (incidencia)
     */
    public function storeIncidencia(StoreIncidenciaRequest $request): JsonResponse
    {
        $user = $request->user();
        
        $incidencia = Incidencia::create(array_merge(
            $request->validated(),
            [
                'autor_id' => $user->id,
                'autor_tipo' => get_class($user),
            ]
        ));

        return response()->json([
            'message' => 'Incidencia registrada exitosamente.',
            'incidencia' => $incidencia
        ], 201);
    }

    /**
     * [HU14/T3] Publicar aviso operativo (noticia)
     */
    public function storeNoticia(StoreNoticiaRequest $request): JsonResponse
    {
        $user = $request->user();

        // Regla de Negocio: Solo Admin o Docente pueden publicar noticias.
        if (!($user instanceof Admin) && !($user instanceof Docente)) {
             return response()->json([
                 'message' => 'No tienes permisos para publicar noticias.'
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
            'message' => 'Noticia publicada exitosamente.',
            'noticia' => $noticia
        ], 201);
    }

    /**
     * [HU14/T4] Obtener feed de noticias (público o interno)
     */
    public function getNoticias(Request $request): JsonResponse
    {
        // Si la petición viene sin token (es pública), solo devolvemos las públicas.
        $esAutenticado = auth('sanctum')->check();

        $noticias = Noticia::query()
            ->when(!$esAutenticado, function ($query) {
                $query->where('es_publica', true);
            })
            ->with(['examen', 'autor']) 
            ->orderBy('created_at', 'desc')
            ->paginate(10); // Paginación estándar

        return response()->json($noticias);
    }
}