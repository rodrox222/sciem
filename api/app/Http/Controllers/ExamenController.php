<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreExamenRequest;
use App\Http\Requests\UpdateExamenRequest;
use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Examen;
use App\Models\LogAuditoria;
use App\Models\Norma;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExamenController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Examen::with([
            'materia:id,nombre',
            'aula:id,nombre',
            'docente:id,nombre,apellido_paterno',
            'normas:id,titulo,tipo',
        ]);

        if ($search = $request->query('search')) {
            $query->where('nombre', 'ilike', "%{$search}%");
        }

        if ($estado = $request->query('estado')) {
            $query->where('estado', $estado);
        }

        if ($fecha = $request->query('fecha')) {
            $query->where('fecha', $fecha);
        }

        if ($fechaDesde = $request->query('fecha_desde')) {
            $query->where('fecha', '>=', $fechaDesde);
        }
        if ($fechaHasta = $request->query('fecha_hasta')) {
            $query->where('fecha', '<=', $fechaHasta);
        }

        $perPage = max(1, min(100, (int) $request->query('per_page', 10)));
        $examenes = $query->orderBy('fecha', 'desc')->orderBy('hora_ini', 'asc')->paginate($perPage);

        return response()->json($examenes);
    }

    public function misExamenes(Request $request): JsonResponse
    {
        /** @var \App\Models\Docente|\App\Models\Auxiliar|\App\Models\Admin|\App\Models\Estudiante $user */
        $user = $request->user();

        $query = Examen::with([
            'materia:id,nombre',
            'aula:id,nombre',
            'docente:id,nombre,apellido_paterno',
            'normas:id,titulo,tipo',
        ]);

        $rol = \App\Services\RolOperativo::actual($request);

        $esAuxiliar = ($rol === 'auxiliar') || ($user && !empty($user->es_auxiliar));

        if ($rol === 'docente') {
            $query->where('id_docente', $user->id);
        } elseif ($esAuxiliar) {
            $tablaAuxiliar = DB::getSchemaBuilder()->hasTable('examen_auxiliares')
                ? 'examen_auxiliares'
                : 'examen_auxiliar';

            $asignacionesIds = DB::table($tablaAuxiliar)
                ->where('id_auxiliar', $user->id)
                ->whereIn('estado', ['Activo', 'Aceptada'])
                ->pluck('id_examen');

            $query->whereIn('id', $asignacionesIds);
        } else {
            abort_unless($rol === 'admin', 403, 'Acceso denegado: rol no autorizado.');
        }

        if ($search = $request->query('search')) {
            $query->where('nombre', 'ilike', "%{$search}%");
        }

        if ($estado = $request->query('estado')) {
            $query->where('estado', $estado);
        }

        if ($fecha = $request->query('fecha')) {
            $query->where('fecha', $fecha);
        }

        if ($fechaDesde = $request->query('fecha_desde')) {
            $query->where('fecha', '>=', $fechaDesde);
        }
        if ($fechaHasta = $request->query('fecha_hasta')) {
            $query->where('fecha', '<=', $fechaHasta);
        }

        $perPage = max(1, min(100, (int) $request->query('per_page', 10)));
        $examenes = $query->orderBy('fecha', 'desc')->orderBy('hora_ini', 'asc')->paginate($perPage);

        return response()->json($examenes);
    }

    public function store(StoreExamenRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        if ($user instanceof Docente || ($user->rol ?? '') === 'docente') {
            $data['id_docente'] = $user->id;

            // Validar que el docente sea titular de la materia asignada en docente_materia
            if ($user instanceof Docente) {
                $esTitular = $user->materias()->where('materias.id', $data['id_materia'])->exists();
                if (!$esTitular) {
                    return response()->json([
                        'message' => 'No tienes asignada esta materia. Solo puedes crear exámenes de las materias en las que eres docente titular.',
                    ], 422);
                }
            }
        } else {
            // Si el Admin crea el examen, vincula la materia al docente responsable en docente_materia
            if (!empty($data['id_docente']) && !empty($data['id_materia'])) {
                $docenteObj = Docente::find($data['id_docente']);
                if ($docenteObj) {
                    $docenteObj->materias()->syncWithoutDetaching([$data['id_materia']]);
                }
            }
        }

        $examen = DB::transaction(function () use ($data, $request) {
            $examen = Examen::create($data);

            if ($request->has('normas_ids') && is_array($request->input('normas_ids'))) {
                $examen->normas()->sync($request->input('normas_ids'));
            }

            if ($request->has('normas_particulares') && is_array($request->input('normas_particulares'))) {
                foreach ($request->input('normas_particulares') as $part) {
                    if (!empty($part['titulo']) && !empty($part['descripcion'])) {
                        $nuevaNorma = Norma::create([
                            'titulo'      => trim($part['titulo']),
                            'descripcion' => trim($part['descripcion']),
                            'tipo'        => 'Particular',
                            'estado'      => 'Activo',
                        ]);
                        $examen->normas()->attach($nuevaNorma->id);
                    }
                }
            }

            return $examen;
        });

        $this->registrarAuditoria($request, 'EXAMEN_CREADO', [
            'target_type' => 'examen',
            'target_id'   => $examen->id,
            'examen_id'   => $examen->id,
            'nombre'      => $examen->nombre,
            'id_materia'  => $examen->id_materia,
            'fecha'       => $examen->fecha,
        ]);

        return response()->json([
            'message' => 'Examen programado exitosamente.',
            'examen'  => $examen->load(['materia', 'aula', 'docente', 'normas']),
        ], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        \App\Services\AccesoExamen::buscar($id);
        $examen = Examen::with(['materia', 'aula', 'docente', 'normas'])->find($id);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        $user = $request->user();
        $tieneAcceso = \App\Services\AccesoExamen::permite($request, $examen);

        if (!$tieneAcceso && $user && !empty($user->es_auxiliar)) {
            $tablaAuxiliar = DB::getSchemaBuilder()->hasTable('examen_auxiliares')
                ? 'examen_auxiliares'
                : 'examen_auxiliar';

            $tieneAcceso = DB::table($tablaAuxiliar)
                ->where('id_examen', $examen->id)
                ->where('id_auxiliar', $user->id)
                ->whereIn('estado', ['Activo', 'Aceptada'])
                ->exists();
        }

        if (!$tieneAcceso) {
            return response()->json([
                'success' => false,
                'message' => 'Acceso denegado: no tienes permisos para acceder a esta evaluación.',
            ], 403);
        }

        return response()->json($examen);
    }

    public function update(UpdateExamenRequest $request, string $id): JsonResponse
    {
        $examen = Examen::find($id);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        if (!$this->validarAccesoExamen($request->user(), $examen, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Acceso denegado: no puedes modificar un examen del cual no eres titular.',
            ], 403);
        }

        $data = $request->validated();
        $camposAfectados = array_keys($data);
        $valoresAnteriores = $examen->only($camposAfectados);

        DB::transaction(function () use ($examen, $data, $request) {
            $examen->update($data);

            if ($request->has('normas_ids') && is_array($request->input('normas_ids'))) {
                $examen->normas()->sync($request->input('normas_ids'));
            }

            if ($request->has('normas_particulares') && is_array($request->input('normas_particulares'))) {
                foreach ($request->input('normas_particulares') as $part) {
                    if (!empty($part['titulo']) && !empty($part['descripcion'])) {
                        $nuevaNorma = Norma::create([
                            'titulo'      => trim($part['titulo']),
                            'descripcion' => trim($part['descripcion']),
                            'tipo'        => 'Particular',
                            'estado'      => 'Activo',
                        ]);
                        $examen->normas()->attach($nuevaNorma->id);
                    }
                }
            }
        });

        $this->registrarAuditoria($request, 'EXAMEN_ACTUALIZADO', [
            'target_type'         => 'examen',
            'target_id'           => $examen->id,
            'campos_actualizados' => $camposAfectados,
            'valores_anteriores'  => $valoresAnteriores,
            'valores_nuevos'      => $data,
        ]);

        return response()->json([
            'message' => 'Examen actualizado exitosamente.',
            'examen'  => $examen->load(['materia', 'aula', 'docente', 'normas']),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $examen = Examen::find($id);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        if (!$this->validarAccesoExamen($request->user(), $examen, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Acceso denegado: no puedes eliminar un examen del cual no eres titular.',
            ], 403);
        }

        // 1. Validar que el examen aún no haya iniciado
        $ahora = \Carbon\Carbon::now('America/La_Paz');
        $fechaExamen = $examen->fecha ? $examen->fecha->format('Y-m-d') : null;
        $horaIni = $examen->hora_ini ?? '00:00:00';
        if ($fechaExamen) {
            $inicioExamen = \Carbon\Carbon::parse("{$fechaExamen} {$horaIni}", 'America/La_Paz');
            if ($ahora->greaterThanOrEqualTo($inicioExamen)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede eliminar un examen que ya ha iniciado o finalizado.',
                ], 422);
            }
        }

        // 2. Validar que no tenga registros en logs_asistencias
        $tieneAsistencias = DB::table('logs_asistencias')->where('id_examen', $examen->id)->exists();
        if ($tieneAsistencias) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el examen porque ya cuenta con registros de asistencia o escaneos.',
            ], 422);
        }

        // 3. Validar que no tenga estudiante_examen con ingreso registrado
        $tieneIngresos = DB::table('estudiante_examen')
            ->where('id_examen', $examen->id)
            ->whereNotNull('fecha_ingreso')
            ->exists();
        if ($tieneIngresos) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el examen porque ya cuenta con ingresos registrados de estudiantes.',
            ], 422);
        }

        // 4. Validar que no tenga intentos_no_autorizados
        $tieneIntentos = DB::table('intentos_no_autorizados')->where('id_examen', $examen->id)->exists();
        if ($tieneIntentos) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el examen porque cuenta con registros de intentos no autorizados.',
            ], 422);
        }

        $detalles = [
            'target_type' => 'examen',
            'target_id'   => $examen->id,
            'examen_id'   => $examen->id,
            'nombre'      => $examen->nombre,
        ];

        // Limpiar asignaciones en auxiliar_examen si existen (FK RESTRICT)
        DB::table('auxiliar_examen')->where('id_examen', $examen->id)->delete();

        $examen->delete();

        $this->registrarAuditoria($request, 'EXAMEN_ELIMINADO', $detalles);

        return response()->json(['message' => 'Examen eliminado exitosamente.']);
    }

    private function validarAccesoExamen($user, Examen $examen, bool $soloEscritura = false): bool
    {
        if (!$user) {
            return false;
        }

        if ($user instanceof Admin || ($user->rol ?? '') === 'admin' || ($user->rol ?? '') === 'administrador') {
            return true;
        }

        if ($user instanceof Docente || ($user->rol ?? '') === 'docente') {
            return $examen->id_docente === $user->id;
        }

        $esAuxiliar = ($user instanceof Auxiliar) || (($user->rol ?? '') === 'auxiliar') || !empty($user->es_auxiliar);

        if (!$soloEscritura && $esAuxiliar) {
            $tablaAuxiliar = DB::getSchemaBuilder()->hasTable('examen_auxiliares')
                ? 'examen_auxiliares'
                : 'examen_auxiliar';

            return DB::table($tablaAuxiliar)
                ->where('id_examen', $examen->id)
                ->where('id_auxiliar', $user->id)
                ->whereIn('estado', ['Activo', 'Aceptada'])
                ->exists();
        }

        return false;
    }

    private function registrarAuditoria(Request $request, string $accion, array $detalles = []): void
    {
        $user = $request->user();

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
            'modulo'            => 'EXAMENES',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}