<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Throwable;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $usuario = $request->user();

        $rol = match (get_class($usuario)) {
            Admin::class => 'admin',
            Docente::class => 'docente',
            Auxiliar::class => 'auxiliar',
            Estudiante::class => 'estudiante',
            default => null,
        };

        if ($rol === null) {
            return response()->json([
                'success' => false,
                'message' => 'Rol no autorizado para el dashboard.',
            ], 403);
        }

        $secciones = [];

               try {
            $claveCache = $rol === 'admin'
                ? 'dashboard:admin:resumen'
                : "dashboard:{$rol}:{$usuario->id}:resumen";

            $secciones['resumen'] = Cache::remember(
                $claveCache,
                now()->addSeconds(60),
                fn () => match ($rol) {
                    'admin' => $this->resumenAdmin(),
                    'docente' => $this->resumenDocente($usuario),
                    'auxiliar' => $this->resumenAuxiliar($usuario),
                    'estudiante' => $this->resumenEstudiante($usuario),
                }
            );
        } catch (Throwable $e) {
            report($e);

            $secciones['resumen'] = [
                'error' => 'No fue posible cargar el resumen.',
            ];
        }

        return response()->json([
            'success' => true,
            'rol' => $rol,
            'secciones' => $secciones,
        ]);
    }

    private function resumenAdmin(): array
    {
        return [
            'usuarios' => Admin::count()
                + Docente::count()
                + Auxiliar::count(),
            'estudiantes' => Estudiante::count(),
            'aulas_disponibles' => DB::table('aulas')
                ->where('estado', 'Disponible')
                ->count(),
            'examenes_programados' => Examen::where('estado', 'Programado')
                ->count(),
        ];
    }

    private function resumenDocente(Docente $docente): array
    {
        $examenes = Examen::query()
            ->where('id_docente', $docente->id)
            ->with(['materia:id,nombre', 'aula:id,nombre'])
            ->withCount('estudiantes')
            ->orderBy('fecha')
            ->orderBy('hora_ini')
            ->get();

        $estadisticas = DB::table('examenes')
            ->leftJoin(
                'estudiante_examen',
                'examenes.id',
                '=',
                'estudiante_examen.id_examen'
            )
            ->where('examenes.id_docente', $docente->id)
            ->selectRaw('COUNT(DISTINCT examenes.id) AS total_examenes')
            ->selectRaw('COUNT(estudiante_examen.id_estudiante) AS total_inscritos')
            ->selectRaw('COUNT(estudiante_examen.fecha_ingreso) AS total_ingresados')
            ->first();

        return [
            'total_examenes' => (int) $estadisticas->total_examenes,
            'total_inscritos' => (int) $estadisticas->total_inscritos,
            'total_ingresados' => (int) $estadisticas->total_ingresados,
            'examenes' => $examenes->map(fn ($examen) => [
                'id' => $examen->id,
                'nombre' => $examen->nombre,
                'materia' => $examen->materia?->nombre,
                'aula' => $examen->aula?->nombre,
                'fecha' => $examen->fecha?->format('Y-m-d'),
                'hora_ini' => $examen->hora_ini,
                'hora_fin' => $examen->hora_fin,
                'estado' => $examen->estado,
                'total_estudiantes' => $examen->estudiantes_count,
            ])->values(),
        ];
    }

    private function resumenAuxiliar(Auxiliar $auxiliar): array
    {
        $examenes = $auxiliar->examenes()
            ->with(['materia:id,nombre', 'aula:id,nombre', 'docente:id,nombre'])
            ->withCount('estudiantes')
            ->orderBy('fecha')
            ->orderBy('hora_ini')
            ->get();

        return [
            'total_examenes' => $examenes->count(),
            'examenes' => $examenes->map(fn ($examen) => [
                'id' => $examen->id,
                'nombre' => $examen->nombre,
                'materia' => $examen->materia?->nombre,
                'aula' => $examen->aula?->nombre,
                'docente' => $examen->docente?->nombre,
                'fecha' => $examen->fecha?->format('Y-m-d'),
                'hora_ini' => $examen->hora_ini,
                'hora_fin' => $examen->hora_fin,
                'estado' => $examen->estado,
                'total_estudiantes' => $examen->estudiantes_count,
            ])->values(),
        ];
    }

    private function resumenEstudiante(Estudiante $estudiante): array
    {
        $examenes = $estudiante->examenes()
            ->with([
                'materia:id,nombre',
                'aula:id,nombre',
                'docente:id,nombre,apellido_paterno,apellido_materno',
            ])
            ->orderBy('fecha')
            ->orderBy('hora_ini')
            ->get()
            ->map(fn ($examen) => [
                'id' => $examen->id,
                'nombre' => $examen->nombre,
                'materia' => $examen->materia?->nombre,
                'aula' => $examen->aula?->nombre,
                'docente' => $examen->docente
                    ? trim(
                        $examen->docente->nombre . ' '
                        . $examen->docente->apellido_paterno . ' '
                        . $examen->docente->apellido_materno
                    )
                    : null,
                'fecha' => $examen->fecha?->format('Y-m-d'),
                'hora_ini' => $examen->hora_ini,
                'hora_fin' => $examen->hora_fin,
                'estado_habilitacion' => $examen->pivot->estado,
                'motivo_estado' => $examen->pivot->motivo_estado,
            ])
            ->values();

        return [
            'total_examenes' => $examenes->count(),
            'examenes' => $examenes,
        ];
    }
}
