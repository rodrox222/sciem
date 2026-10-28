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

        // Verificar si el Token de Sanctum actual posee alguno de los roles permitidos
        $hasAccess = false;
        $rolEnToken = 'desconocido';

        foreach ($allowedRoles as $role) {
            if ($user->tokenCan("role:{$role}")) {
                $hasAccess = true;
                break;
            }
        }

        if (!$hasAccess) {
            // Extraer el rol actual del token solo para el mensaje de error (opcional)
            $abilities = $user->currentAccessToken()->abilities ?? [];
            foreach ($abilities as $ability) {
                if (str_starts_with($ability, 'role:')) {
                    $rolEnToken = str_replace('role:', '', $ability);
                }
            }

            return response()->json([
                'message'    => 'Acceso denegado. Su sesión actual no tiene permisos para esta acción.',
                'rol_actual' => $rolEnToken,
            ], 403);
        }

        return $next($request);
    }
}