<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        // Verificar si existe y está activo
        if (!$user || !$user->activo) {
            return response()->json(['message' => 'Acceso denegado o cuenta inactiva.'], 403);
        }

        // Determinar el rol a partir de la clase del modelo
        $userRole = match (get_class($user)) {
            Admin::class    => 'admin',
            Docente::class  => 'docente',
            Auxiliar::class => 'auxiliar',
            default         => '',
        };

        // Normalizar los roles permitidos recibidos en la ruta
        $allowedRoles = array_map(function ($rol) {
            $r = strtolower($rol);
            return $r === 'administrador' ? 'admin' : $r;
        }, $roles);

        // Validar si el rol del usuario está permitido
        if (!in_array($userRole, $allowedRoles, true)) {
            return response()->json([
                'message'    => 'Acceso denegado o cuenta inactiva.',
                'rol_actual' => $userRole,
            ], 403);
        }

        return $next($request);
    }
}
