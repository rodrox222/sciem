<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (!$user || !$user->activo) {
            return response()->json(['message' => 'Acceso denegado o cuenta inactiva.'], 403);
        }

        // Normalizar los roles permitidos en la ruta
        $allowedRoles = array_map(function ($rol) {
            $r = strtolower(trim($rol));
            return $r === 'administrador' ? 'admin' : $r;
        }, $roles);

        $rol = \App\Services\RolOperativo::actual($request);

        // Si la ruta permite 'auxiliar' y el usuario es un estudiante con 'es_auxiliar = true'
        if (in_array('auxiliar', $allowedRoles, true) && !empty($user->es_auxiliar)) {
            $rol = 'auxiliar';
        }

        if (!$rol || !in_array($rol, $allowedRoles, true)) {
            return response()->json([
                'message' => 'Sesión sin rol válido para esta acción. Inicie sesión nuevamente.',
                'rol_actual' => $rol
            ], 403);
        }

        return $next($request);
    }
}