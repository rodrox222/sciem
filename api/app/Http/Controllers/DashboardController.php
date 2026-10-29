<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Services\AccesoExamen;
use App\Services\AsistenciaExamen;
use App\Services\RolOperativo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $rol = RolOperativo::actual($request);
        abort_unless($rol, 403, 'Sesión sin rol válido; vuelva a iniciar sesión.');
        $user = $request->user();
        $errores = [];
        // Savepoints permiten recuperar una sección incluso ante un error SQL.
        $safe = function (string $key, callable $load, $fallback = null) use (&$errores) {
            try {
                return DB::transaction($load);
            } catch (\Throwable $e) {
                report($e);
                $errores[$key] = 'No fue posible cargar esta sección.';

                return $fallback;
            }
        };
        // Caché de metadatos/cifras lentas; la asistencia y el alcance se leen en vivo.
        // File evita escribir en la transacción PostgreSQL de solo lectura.
        $cache = function (string $key, callable $load) use ($rol, $user) {
            try {
                return Cache::store('file')->remember('sprint3:dashboard:'.$rol.':'.$user->id.':'.$key, 60, $load);
            } catch (\Throwable $e) {
                report($e);

                return $load();
            }
        };
        if ($rol === 'admin') {
            $resumen = [
                'usuarios' => $safe('usuarios', fn () => $cache('usuarios', fn () => Admin::count() + Docente::count() + Auxiliar::count())),
                'estudiantes' => $safe('estudiantes', fn () => $cache('estudiantes', fn () => Estudiante::count())),
                'aulas_disponibles' => $safe('aulas_disponibles', fn () => $cache('aulas', fn () => DB::table('aulas')->where('estado', 'Disponible')->count())),
                'examenes_programados' => $safe('examenes_programados', fn () => $cache('programados', fn () => Examen::where('estado', 'Programado')->count())),
            ];
        } else {
            $scope = function () use ($rol, $user) {
                $q = Examen::query();
                if ($rol === 'docente') {
                    $q->where('id_docente', $user->id);
                } elseif ($rol === 'auxiliar') {
                    $q->whereIn('id', AccesoExamen::asignaciones($user)->select('id_examen'));
                } else {
                    $q->whereIn('id', DB::table('estudiante_examen')->where('id_estudiante', $user->id)->select('id_examen'));
                }

                return $q;
            };
            $alcance = $safe('alcance', fn () => $scope()->select('id', 'updated_at')->orderBy('id')->get());
            $revision = $alcance ? hash('sha256', $alcance->toJson()) : null;
            if ($rol === 'estudiante' && $revision) {
                $inscripcion = $safe('habilitacion', fn () => DB::table('estudiante_examen')->where('id_estudiante', $user->id)->orderBy('id_examen')->get(['id_examen', 'estado', 'motivo_estado', 'updated_at']));
                $revision = $inscripcion ? $revision.hash('sha256', $inscripcion->toJson()) : null;
            }
            $resumen = ['total_examenes' => $alcance?->count()];
            if ($rol === 'docente') {
                $stats = $safe('asistencia', fn () => AsistenciaExamen::nomina()->whereIn('ee.id_examen', $scope()->select('id'))->selectRaw('COUNT(*) AS inscritos, COUNT(fecha_ingreso) AS ingresados')->first());
                $resumen['total_inscritos'] = $stats ? (int) $stats->inscritos : null;
                $resumen['total_ingresados'] = $stats ? (int) $stats->ingresados : null;
            }
            $cargarExamenes = function () use ($scope, $rol, $user) {
                $query = $scope()->with(['materia:id,nombre', 'aula:id,nombre', 'docente:id,nombre,apellido_paterno,apellido_materno'])->withCount('estudiantes');
                $inscripciones = $rol === 'estudiante' ? DB::table('estudiante_examen')->where('id_estudiante', $user->id)->get()->keyBy('id_examen') : collect();

                return $query->orderBy('fecha')->orderBy('hora_ini')->get()->map(function ($e) use ($inscripciones) {
                    $ins = $inscripciones->get($e->id);

                    return ['id' => $e->id, 'nombre' => $e->nombre, 'materia' => $e->materia?->nombre, 'aula' => $e->aula?->nombre,
                        'docente' => $e->docente ? trim($e->docente->nombre.' '.$e->docente->apellido_paterno.' '.$e->docente->apellido_materno) : null,
                        'fecha' => $e->fecha?->format('Y-m-d'), 'hora_ini' => $e->hora_ini, 'hora_fin' => $e->hora_fin, 'estado' => $e->estado,
                        'total_estudiantes' => $e->estudiantes_count, 'estado_habilitacion' => $ins?->estado, 'motivo_estado' => $ins?->motivo_estado];
                })->values();
            };
            $resumen['examenes'] = $revision ? $safe('examenes', fn () => $cache('examenes:'.$revision, $cargarExamenes), []) : [];
            if (! $revision) {
                $errores['examenes'] = 'No fue posible validar las asignaciones actuales.';
            }
        }

        // El alcance actual integra la clave de caché: una desasignación invalida la vista siguiente.
        return response()->json(['success' => true, 'rol' => $rol, 'secciones' => ['resumen' => $resumen], 'errores_secciones' => $errores, 'hora_servidor' => now('America/La_Paz')->toIso8601String()]);
    }
}
