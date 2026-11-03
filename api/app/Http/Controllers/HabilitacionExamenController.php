<?php

namespace App\Http\Controllers;

use App\Http\Requests\CambiarHabilitacionRequest;
use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\LogAuditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HabilitacionExamenController extends Controller
{
    public function index(Request $request, string $examenId): JsonResponse
    {
        $user = $request->user();
        $examen = Examen::findOrFail($examenId);

        $esDocenteOAdmin = \App\Services\AccesoExamen::permite($request, $examen);

        $tablaAuxiliar = DB::getSchemaBuilder()->hasTable('examen_auxiliares')
            ? 'examen_auxiliares'
            : 'examen_auxiliar';

        $esAuxiliar = DB::table($tablaAuxiliar)
            ->where('id_examen', $examen->id)
            ->where('id_auxiliar', $user->id)
            ->whereIn('estado', ['Activo', 'Aceptada'])
            ->exists();

        abort_unless($esDocenteOAdmin || $esAuxiliar, 403, 'Acceso denegado: no tienes permisos para ver el padrón de este examen.');

        $examen->load(['estudiantes' => function ($query) use ($esDocenteOAdmin, $esAuxiliar, $user) {
            $query->select(
                'estudiantes.id', 
                'codigo_sis', 
                'ci', 
                'ci_extension', 
                'nombre', 
                'apellido_paterno', 
                'apellido_materno', 
                'email_institucional'
            )
            ->withPivot('estado', 'motivo_estado', 'ajuste_manual', 'fecha_ajuste_manual', 'id_auxiliar');

            if (!$esDocenteOAdmin && $esAuxiliar) {
                $query->wherePivot('id_auxiliar', $user->id);
            }
        }]);

        $estudiantes = $examen->estudiantes->map(function ($estudiante) {
            return [
                'id'                  => $estudiante->id,
                'codigo_sis'          => $estudiante->codigo_sis,
                'ci'                  => $estudiante->ci,
                'ci_extension'        => $estudiante->ci_extension,
                'nombre_completo'     => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                'email_institucional' => $estudiante->email_institucional,
                'estado'              => $estudiante->pivot->estado,
                'motivo_estado'       => $estudiante->pivot->motivo_estado,
                'ajuste_manual'       => (bool) $estudiante->pivot->ajuste_manual,
                'fecha_ajuste_manual' => $estudiante->pivot->fecha_ajuste_manual,
            ];
        });

        return response()->json([
            'examen_id'   => $examen->id,
            'nombre'      => $examen->nombre,
            'estudiantes' => $estudiantes,
        ], 200);
    }

    public function update(CambiarHabilitacionRequest $request, string $examenId, string $estudianteId): JsonResponse
    {
        $examen = Examen::findOrFail($examenId);

        $pivoteAnterior = DB::table('estudiante_examen')
            ->where('id_examen', $examenId)
            ->where('id_estudiante', $estudianteId)
            ->first();

        if (!$pivoteAnterior) {
            return response()->json(['message' => 'El estudiante no se encuentra registrado en este examen.'], 404);
        }

        $estado = $request->input('estado');
        $motivo = trim($request->input('motivo_estado'));
        
        $user = $request->user();
        $docenteId = null;
        if ($user) {
            if ($user instanceof Docente) {
                $docenteId = $user->id;
            } elseif (Docente::where('id', $user->id)->exists()) {
                $docenteId = $user->id;
            }
        }

        $valoresPrevios = [
            'estado'                    => $pivoteAnterior->estado,
            'motivo_estado'             => $pivoteAnterior->motivo_estado,
            'ajuste_manual'             => filter_var($pivoteAnterior->ajuste_manual, FILTER_VALIDATE_BOOLEAN),
            'modificado_por_docente_id' => $pivoteAnterior->modificado_por_docente_id,
            'fecha_ajuste_manual'       => $pivoteAnterior->fecha_ajuste_manual,
        ];

        $examen->estudiantes()->updateExistingPivot($estudianteId, [
            'estado'                    => $estado,
            'motivo_estado'             => $motivo,
            'ajuste_manual'             => DB::raw('true'),
            'modificado_por_docente_id' => $docenteId,
            'fecha_ajuste_manual'       => now(),
            'updated_at'                => now(),
        ]);

        $rol = match ($user ? get_class($user) : null) {
            Admin::class    => 'admin',
            Docente::class  => 'docente',
            Auxiliar::class => 'auxiliar',
            default         => 'desconocido',
        };
        $nombreCompleto = $user ? trim("{$user->nombre} {$user->apellido_paterno} {$user->apellido_materno}") : 'Sistema';

        LogAuditoria::create([
            'user_type'         => $user ? get_class($user) : null,
            'user_id'           => $user?->id,
            'rol_en_el_momento' => $rol,
            'usuario_nombre'    => $nombreCompleto !== '' ? $nombreCompleto : ($user?->nombre ?? 'Sistema'),
            'usuario_email'     => $user?->email ?? null,
            'modulo'            => 'EXAMENES',
            'accion'            => 'ESTUDIANTE_HABILITACION_MODIFICADA',
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => [
                'target_type'        => 'estudiante_examen',
                'target_id'          => $estudianteId,
                'id_examen'          => $examenId,
                'id_estudiante'      => $estudianteId,
                'valores_anteriores' => $valoresPrevios,
                'valores_nuevos'     => [
                    'estado'                    => $estado,
                    'motivo_estado'             => $motivo,
                    'ajuste_manual'             => true,
                    'modificado_por_docente_id' => $docenteId,
                    'fecha_ajuste_manual'       => now()->toDateTimeString(),
                ],
            ],
        ]);

        return response()->json([
            'message' => "Estudiante {$estado} manualmente.",
            'data'    => [
                'examen_id'     => $examenId,
                'estudiante_id' => $estudianteId,
                'estado'        => $estado,
                'motivo_estado' => $motivo,
                'ajuste_manual' => true,
            ],
        ], 200);
    }

    public function motivoInhabilitacion(string $examenId, string $estudianteId): JsonResponse
    {
        $registro = DB::table('estudiante_examen')
            ->where('id_examen', $examenId)
            ->where('id_estudiante', $estudianteId)
            ->select('estado', 'motivo_estado')
            ->first();

        if (!$registro) {
            return response()->json([
                'message' => 'El estudiante no se encuentra registrado en este examen.'
            ], 404);
        }

        return response()->json([
            'estado'        => $registro->estado,
            'motivo_estado' => $registro->motivo_estado,
        ], 200);
    }
}