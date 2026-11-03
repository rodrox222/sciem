<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreIncidenciaRequest;
use App\Http\Requests\StoreNoticiaRequest;
use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Incidencia;
use App\Models\LogAuditoria;
use App\Models\Noticia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IncidenciaController extends Controller
{
    public function storeIncidencia(StoreIncidenciaRequest $request): JsonResponse
    {
        $user = $request->user();

        $incidencia = Incidencia::create(array_merge(
            $request->validated(),
            [
                'autor_id'   => $user->id,
                'autor_tipo' => get_class($user),
            ]
        ));

        $this->registrarAuditoria($request, 'INCIDENCIA_REGISTRADA', [
            'target_type' => 'incidencias',
            'target_id'   => $incidencia->id,
            'titulo'      => $incidencia->titulo,
        ]);

        return response()->json([
            'message'    => 'Incidencia registrada exitosamente.',
            'incidencia' => $incidencia,
        ], 201);
    }

    public function storeNoticia(StoreNoticiaRequest $request): JsonResponse
    {
        $user = $request->user();

        if (!($user instanceof Admin) && !($user instanceof Docente)) {
            return response()->json([
                'message' => 'No tienes permisos para publicar noticias.'
            ], 403);
        }

        $data = $request->validated();

        if (isset($data['es_publica'])) {
            $esPublicaBool = filter_var($data['es_publica'], FILTER_VALIDATE_BOOLEAN);
            $data['es_publica'] = $esPublicaBool ? DB::raw('true') : DB::raw('false');
        }

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

    public function getNoticias(Request $request): JsonResponse
    {
        $esAutenticado = auth('sanctum')->check();

        $noticias = Noticia::query()
            ->when(!$esAutenticado, function ($query) {
                $query->whereRaw('es_publica is true');
            })
            ->with(['examen', 'autor'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($noticias);
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
            'modulo'            => 'INCIDENCIAS_NOTICIAS',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}