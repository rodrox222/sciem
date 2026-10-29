<?php

namespace App\Http\Controllers;

use App\Models\Estudiante;
use App\Models\Expulsion;
use App\Models\LogAuditoria;
use App\Services\AccesoExamen;
use App\Services\AsistenciaExamen;
use App\Services\IdentificadorQr;
use App\Services\RolOperativo;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ExpulsionController extends Controller
{
    private array $auditorias = [];

    private function examen(Request $request, string $id)
    {
        $examen = AccesoExamen::buscar($id);
        AccesoExamen::autorizar($request, $examen);

        return $examen;
    }

    private function motivo(Request $request, string $campo = 'motivo'): string
    {
        $valor = $request->input($campo);
        $request->merge([$campo => is_string($valor) ? trim($valor) : $valor]);

        return $request->validate([$campo => ['required', 'string', 'min:3', 'max:2000']])[$campo];
    }

    private function auditar(Request $request, Expulsion $expulsion, string $accion, array $extra = []): void
    {
        $user = $request->user();
        LogAuditoria::create([
            'user_type' => $user->getMorphClass(), 'user_id' => $user->id,
            'rol_en_el_momento' => RolOperativo::actual($request),
            'usuario_nombre' => trim("{$user->nombre} {$user->apellido_paterno} {$user->apellido_materno}"),
            'usuario_email' => $user->email ?? $user->email_institucional,
            'modulo' => 'EXPULSIONES', 'accion' => $accion,
            'ip_origen' => $request->ip() ?? '127.0.0.1', 'user_agent' => $request->userAgent(),
            'detalles' => array_merge([
                'expulsion_id' => $expulsion->id, 'examen_id' => $expulsion->id_examen,
                'estudiante_id' => $expulsion->id_estudiante, 'motivo' => $expulsion->motivo,
                'fecha_hora' => $expulsion->fecha_hora->toIso8601String(),
            ], $extra),
        ]);
    }

    private function presentar(Expulsion $e): array
    {
        if (! array_key_exists($e->id, $this->auditorias)) {
            $this->auditorias[$e->id] = LogAuditoria::where('modulo', 'EXPULSIONES')->where('detalles->expulsion_id', $e->id)->orderBy('created_at')->orderBy('id')->get();
        }
        $ediciones = $this->auditorias[$e->id]->where('accion', 'MOTIVO_EXPULSION_ACTUALIZADO')->map(fn ($log) => [
            'motivo_anterior' => $log->detalles['motivo_anterior'] ?? '', 'motivo_nuevo' => $log->detalles['motivo_nuevo'] ?? '',
            'fecha_hora' => $log->created_at, 'responsable' => ['id' => $log->user_id, 'nombre' => $log->usuario_nombre, 'rol' => $log->rol_en_el_momento],
        ])->values();
        $s = $e->estudiante;
        $u = $e->expulsadoPor;

        return [
            'id' => $e->id, 'id_examen' => $e->id_examen, 'id_estudiante' => $e->id_estudiante,
            'motivo' => $e->motivo, 'fecha_hora' => $e->fecha_hora,
            'motivo_original' => $ediciones->first()['motivo_anterior'] ?? $e->motivo, 'ediciones' => $ediciones,
            'ultima_edicion' => $ediciones->last(),
            'deleted_at' => $e->deleted_at, 'motivo_eliminacion' => $e->motivo_eliminacion,
            'estudiante' => $s ? ['id' => $s->id, 'nombre_completo' => trim("{$s->nombre} {$s->apellido_paterno} {$s->apellido_materno}"), 'codigo_sis' => $s->codigo_sis, 'ci' => $s->ci] : null,
            'responsable' => $u ? ['id' => $u->id, 'rol' => $e->rol_responsable ?? ($u instanceof Estudiante ? 'auxiliar' : strtolower(class_basename($u))), 'nombre' => trim("{$u->nombre} {$u->apellido_paterno} {$u->apellido_materno}")] : null,
        ];
    }

    public function estudiantes(Request $request, string $id): JsonResponse
    {
        $examen = $this->examen($request, $id);
        $datos = $request->validate(['search' => 'sometimes|string|max:150', 'qr_data' => 'sometimes|string|max:4096']);
        $query = AsistenciaExamen::nomina($id)->join('estudiantes as e', 'e.id', '=', 'ee.id_estudiante')
            ->select('e.id', 'e.nombre', 'e.apellido_paterno', 'e.apellido_materno', 'e.codigo_sis', 'e.ci', 'ee.fecha_ingreso')
            ->orderBy('e.apellido_paterno')->orderBy('e.apellido_materno')->orderBy('e.nombre');
        if (isset($datos['qr_data'])) {
            $qr = IdentificadorQr::leer($datos['qr_data'], $id);
            $query->where($qr['id'] ? 'e.id' : 'e.codigo_sis', $qr['id'] ?? (string) $qr['sis']);
        }
        $expulsados = Expulsion::where('id_examen', $id)->pluck('id_estudiante')->all();
        $horario = AccesoExamen::enHorario($examen);
        $rows = $query->get()->map(fn ($e) => [
            'id' => $e->id, 'nombre_completo' => trim("{$e->nombre} {$e->apellido_paterno} {$e->apellido_materno}"),
            'codigo_sis' => $e->codigo_sis, 'ci' => $e->ci, 'fecha_ingreso' => $e->fecha_ingreso,
            'apellido_paterno' => $e->apellido_paterno, 'apellido_materno' => $e->apellido_materno,
            'expulsado' => in_array($e->id, $expulsados, true),
            'elegible' => $horario && $e->fecha_ingreso !== null && ! in_array($e->id, $expulsados, true),
        ]);
        if (! empty($datos['search'])) {
            $search = mb_strtolower(Str::ascii(trim($datos['search'])));
            $rows = $rows->filter(fn ($e) => str_contains(mb_strtolower(Str::ascii($e['nombre_completo'].' '.$e['codigo_sis'])), $search));
        }

        return response()->json(['estudiantes' => $rows->values(), 'puede_modificar' => $horario, 'hora_servidor' => now('America/La_Paz')->toIso8601String()]);
    }

    public function store(Request $request, string $id): JsonResponse
    {
        $this->examen($request, $id);
        $motivo = $this->motivo($request);
        $sid = $request->validate(['id_estudiante' => ['required', 'uuid', 'exists:estudiantes,id']])['id_estudiante'];
        try {
            return DB::transaction(function () use ($request, $id, $sid, $motivo) {
                $inscrito = AsistenciaExamen::nomina($id)->where('ee.id_estudiante', $sid)->first();
                abort_unless($inscrito, 422, 'El estudiante no está inscrito en este examen.');
                abort_unless($inscrito->fecha_ingreso, 422, 'Se requiere un ingreso autorizado previo.');
                abort_if(Expulsion::where('id_examen', $id)->where('id_estudiante', $sid)->exists(), 409, 'El estudiante ya tiene una expulsión vigente.');
                $e = Expulsion::create([
                    'id_examen' => $id, 'id_estudiante' => $sid, 'motivo' => $motivo,
                    'fecha_hora' => now('America/La_Paz'), 'rol_responsable' => RolOperativo::actual($request),
                    'expulsado_por_type' => $request->user()->getMorphClass(), 'expulsado_por_id' => $request->user()->id,
                ]);
                $this->auditar($request, $e, 'EXPULSION_REGISTRADA');

                return response()->json(['message' => 'Expulsión registrada exitosamente.', 'expulsion' => $this->presentar($e)], 201);
            });
        } catch (QueryException $e) {
            if ((string) $e->getCode() === '23505') {
                return response()->json(['message' => 'El estudiante ya tiene una expulsión vigente.'], 409);
            }
            throw $e;
        }
    }

    public function index(Request $request, string $id): JsonResponse
    {
        $examen = $this->examen($request, $id);
        $datos = $request->validate(['id_estudiante' => 'sometimes|uuid', 'per_page' => 'sometimes|integer|min:1|max:100', 'estado' => 'sometimes|in:vigentes,eliminadas,todas']);
        $q = Expulsion::withTrashed()->where('id_examen', $id)->with(['estudiante', 'expulsadoPor'])->orderByDesc('fecha_hora')->orderByDesc('id');
        if (isset($datos['id_estudiante'])) {
            $q->where('id_estudiante', $datos['id_estudiante']);
        }
        if (($datos['estado'] ?? 'todas') === 'vigentes') {
            $q->whereNull('deleted_at');
        }
        if (($datos['estado'] ?? 'todas') === 'eliminadas') {
            $q->whereNotNull('deleted_at');
        }
        $page = $q->paginate($datos['per_page'] ?? 15);
        $logs = LogAuditoria::where('modulo', 'EXPULSIONES')->whereIn('detalles->expulsion_id', $page->getCollection()->pluck('id'))->orderBy('created_at')->orderBy('id')->get()->groupBy(fn ($log) => $log->detalles['expulsion_id']);
        foreach ($page->getCollection() as $e) {
            $this->auditorias[$e->id] = $logs->get($e->id, collect());
        }

        return response()->json([
            'examen' => ['id' => $id, 'nombre' => $examen->nombre], 'total' => $page->total(),
            'per_page' => $page->perPage(), 'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(),
            'puede_modificar' => AccesoExamen::enHorario($examen), 'hora_servidor' => now('America/La_Paz')->toIso8601String(),
            'expulsiones' => $page->getCollection()->map(fn ($e) => $this->presentar($e))->values(),
        ]);
    }

    public function updateMotivo(Request $request, string $id, string $expulsionId): JsonResponse
    {
        $this->examen($request, $id);
        $motivo = $this->motivo($request);

        return DB::transaction(function () use ($request, $id, $expulsionId, $motivo) {
            $e = Expulsion::where('id_examen', $id)->whereKey($expulsionId)->lockForUpdate()->firstOrFail();
            $anterior = $e->motivo;
            if ($anterior !== $motivo) {
                $e->update(['motivo' => $motivo]);
                $this->auditar($request, $e, 'MOTIVO_EXPULSION_ACTUALIZADO', ['motivo_anterior' => $anterior, 'motivo_nuevo' => $motivo]);
            }

            return response()->json(['message' => 'Motivo de expulsión actualizado.', 'expulsion' => $this->presentar($e)]);
        });
    }

    public function destroy(Request $request, string $id, string $expulsionId): JsonResponse
    {
        $this->examen($request, $id);
        $motivo = $this->motivo($request, 'motivo_eliminacion');

        return DB::transaction(function () use ($request, $id, $expulsionId, $motivo) {
            $e = Expulsion::where('id_examen', $id)->whereKey($expulsionId)->lockForUpdate()->firstOrFail();
            $e->update(['motivo_eliminacion' => $motivo]);
            $e->delete();
            $this->auditar($request, $e, 'EXPULSION_ELIMINADA', ['motivo_eliminacion' => $motivo, 'deleted_at' => $e->deleted_at->toIso8601String()]);

            return response()->json(['message' => 'Expulsión eliminada; su historial y auditoría se conservan.', 'expulsion' => $this->presentar($e)]);
        });
    }
}
