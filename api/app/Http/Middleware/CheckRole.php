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

        // Verificar si el usuario existe y activo
        if (!$user || !$user->activo) {
            return response()->json(['message' => 'Acceso denegado o cuenta inactiva.'], 403);
        }

        $userRole = strtolower($user->role->nombre ?? '');

        $allowedRoles = array_map('strtolower', $roles);

        // Validar si el rol del usuario está permitido
        if (!in_array($userRole, $allowedRoles, true)) {
            return response()->json([
                'message' => 'Acceso denegado o cuenta inactiva.',
                'rol_actual' => $user->role->nombre ?? null
            ], 403);
        }

        return $next($request);
    }
}
