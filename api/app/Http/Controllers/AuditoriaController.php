<?php

namespace App\Http\Controllers;

use App\Models\LogAuditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditoriaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = LogAuditoria::query()
            ->orderBy('created_at', 'desc');

        // Búsqueda por ID de usuario
        if ($request->filled('usuario_id')) {
            $query->where('user_id', $request->usuario_id);
        }

        // Filtro por rol en el momento de la acción
        if ($request->filled('rol')) {
            $query->where('rol_en_el_momento', strtolower($request->rol));
        }

        // Filtro por acción (LOGIN_EXITOSO, USUARIO_CREADO, etc.)
        if ($request->filled('accion')) {
            $query->where('accion', $request->accion);
        }

        // Filtro por módulo
        if ($request->filled('modulo')) {
            $query->where('modulo', $request->modulo);
        }

        // Rango de fechas
        if ($request->filled('fecha_desde')) {
            $query->whereDate('created_at', '>=', $request->fecha_desde);
        }

        if ($request->filled('fecha_hasta')) {
            $query->whereDate('created_at', '<=', $request->fecha_hasta);
        }

        // Búsqueda general opcional
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('usuario_nombre', 'ilike', "%{$search}%")
                  ->orWhere('usuario_email', 'ilike', "%{$search}%")
                  ->orWhere('ip_origen', 'ilike', "%{$search}%");
            });
        }

        $perPage = (int) $request->input('per_page', 20);

        return response()->json($query->paginate($perPage));
    }
}
