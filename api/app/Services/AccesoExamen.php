<?php

namespace App\Services;

use App\Models\Auxiliar;
use App\Models\Examen;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class AccesoExamen
{
    public static function buscar(string $id): Examen
    {
        abort_unless(Str::isUuid($id), 404, 'Examen no encontrado.');

        return Examen::findOrFail($id);
    }

    public static function asignaciones($user)
    {
        $legacy = $user instanceof Auxiliar;
        $query = DB::table($legacy ? 'auxiliar_examen' : 'examen_auxiliar')
            ->where('id_auxiliar', $user->id);

        return $legacy ? $query : $query->where('estado', 'Activo');
    }

    public static function permite(Request $request, Examen $examen, bool $auxiliar = true): bool
    {
        return match (RolOperativo::actual($request)) {
            'admin' => true,
            'docente' => (string) $examen->id_docente === (string) $request->user()->id,
            'auxiliar' => $auxiliar && self::asignaciones($request->user())->where('id_examen', $examen->id)->exists(),
            default => false,
        };
    }

    public static function autorizar(Request $request, Examen $examen, bool $auxiliar = true): void
    {
        abort_unless(self::permite($request, $examen, $auxiliar), 403, 'No tiene acceso a este examen con su rol actual.');
    }

    public static function enHorario(Examen $examen, ?CarbonImmutable $momento = null): bool
    {
        if (! $examen->fecha || ! $examen->hora_ini || ! $examen->hora_fin) {
            return false;
        }
        if (in_array(mb_strtolower($examen->estado ?? ''), ['terminado', 'finalizado', 'concluido', 'cancelado'])) {
            return false;
        }
        $fecha = $examen->fecha->format('Y-m-d');
        $inicio = CarbonImmutable::parse($fecha.' '.substr($examen->hora_ini, 0, 8), 'America/La_Paz');
        $fin = CarbonImmutable::parse($fecha.' '.substr($examen->hora_fin, 0, 8), 'America/La_Paz');
        if ($fin->lessThan($inicio)) {
            $fin = $fin->addDay();
        }

        return ($momento ?? CarbonImmutable::now('America/La_Paz'))->betweenIncluded($inicio, $fin);
    }
}
