<?php

namespace App\Services;

use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use Illuminate\Http\Request;

final class RolOperativo
{
    public static function disponibles($user): array
    {
        return match (true) {
            $user instanceof Admin => ['admin'],
            $user instanceof Docente => ['docente'],
            $user instanceof Auxiliar => ['auxiliar'],
            $user instanceof Estudiante => $user->es_auxiliar ? ['estudiante', 'auxiliar'] : ['estudiante'],
            default => [],
        };
    }

    public static function actual(Request $request): ?string
    {
        $user = $request->user();
        if (! $user || ! $user->activo) {
            return null;
        }
        $roles = array_values(array_filter(
            $user->currentAccessToken()?->abilities ?? [],
            fn ($ability) => str_starts_with($ability, 'role:')
        ));
        // Los tokens antiguos con dos roles requieren volver a iniciar sesión.
        if (count($roles) !== 1) {
            return null;
        }
        $rol = substr($roles[0], 5);

        return in_array($rol, self::disponibles($user), true) ? $rol : null;
    }
}
