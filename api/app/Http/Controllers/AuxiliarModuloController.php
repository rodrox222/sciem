<?php

namespace App\Http\Controllers;

use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\LogAuditoria;
use App\Traits\DistribuyeAuxiliares;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuxiliarModuloController extends Controller
{
    use DistribuyeAuxiliares;

    /**
     * HU19: Docente asigna a un auxiliar directamente al examen.
     * POST /api/examenes/{id_examen}/auxiliares
     */
    public function invitarAuxiliar(Request $request, string $idExamen): JsonResponse
    {
        $docente = $request->user();

        $request->validate([
            'email' => ['required', 'email'],
        ], [
            'email.required' => 'El correo institucional del auxiliar es obligatorio.',
            'email.email'    => 'Debe ingresar un formato de correo válido.',
        ]);

        $examen = Examen::find($idExamen);
        if (!$examen) {
            return response()->json([
                'success'    => false,
                'message'    => 'Examen no encontrado.',
                'error_type' => 'EXAMEN_NO_ENCONTRADO',
            ], 404);
        }

        if ($docente instanceof Docente && $examen->id_docente !== $docente->id) {
            return response()->json([
                'success'    => false,
                'message'    => 'No tiene permisos para gestionar este examen.',
                'error_type' => 'ACCESO_DENEGADO',
            ], 403);
        }

        $email = trim(strtolower($request->input('email')));

        $estudianteAuxiliar = Estudiante::where(DB::raw('LOWER(email_institucional)'), $email)->first();
        if (!$estudianteAuxiliar) {
            return response()->json([
                'success'    => false,
                'message'    => 'El correo no corresponde a ningún estudiante registrado en el sistema.',
                'error_type' => 'AUXILIAR_NO_ENCONTRADO',
            ], 404);
        }

        $inscritoComoAlumno = DB::table('estudiante_examen')
            ->where('id_examen', $examen->id)
            ->where('id_estudiante', $estudianteAuxiliar->id)
            ->exists();

        if ($inscritoComoAlumno) {
            return response()->json([
                'success'    => false,
                'message'    => 'Conflicto de roles: la persona ya figura como estudiante inscrito en este examen.',
                'error_type' => 'ROL_DUPLICADO_ESTUDIANTE',
            ], 422);
        }

        if (!$estudianteAuxiliar->es_auxiliar) {
            $estudianteAuxiliar->es_auxiliar = true;
            $estudianteAuxiliar->save();
        }

        $ahora = Carbon::now('America/La_Paz');

        // Si ya existía el registro, lo reactivamos
        $asignacionExistente = DB::table('examen_auxiliar')
            ->where('id_examen', $examen->id)
            ->where('id_auxiliar', $estudianteAuxiliar->id)
            ->first();

        if ($asignacionExistente) {
            if ($asignacionExistente->estado === 'Activo') {
                return response()->json([
                    'success'    => false,
                    'message'    => 'El auxiliar ya se encuentra activo en este examen.',
                    'error_type' => 'AUXILIAR_YA_ASIGNADO',
                ], 422);
            }

            DB::table('examen_auxiliar')
                ->where('id', $asignacionExistente->id)
                ->update([
                    'estado'           => 'Activo',
                    'fecha_asignacion' => $ahora,
                    'updated_at'       => $ahora,
                ]);

            $idAsignacion = $asignacionExistente->id;
        } else {
            $idAsignacion = (string) Str::uuid();
            DB::table('examen_auxiliar')->insert([
                'id'               => $idAsignacion,
                'id_examen'        => $examen->id,
                'id_auxiliar'      => $estudianteAuxiliar->id,
                'estado'           => 'Activo',
                'fecha_asignacion' => $ahora,
                'created_at'       => $ahora,
                'updated_at'       => $ahora,
            ]);
        }

        // Rebalancear a los estudiantes
        $this->redistribuirEstudiantesExamen($examen->id);

        $this->registrarAuditoria($request, 'AUXILIAR_ASIGNADO_DIRECTO', [
            'examen_id'   => $examen->id,
            'auxiliar_id' => $estudianteAuxiliar->id,
            'email'       => $email,
        ]);

        return response()->json([
            'success'    => true,
            'message'    => 'Auxiliar asignado exitosamente y padrón de estudiantes distribuido.',
            'asignacion' => [
                'id'               => $idAsignacion,
                'id_examen'        => $examen->id,
                'id_auxiliar'      => $estudianteAuxiliar->id,
                'estado'           => 'Activo',
                'fecha_asignacion' => $ahora->toIso8601String(),
                'auxiliar'         => [
                    'id'                  => $estudianteAuxiliar->id,
                    'nombre'              => $estudianteAuxiliar->nombre,
                    'apellido_paterno'    => $estudianteAuxiliar->apellido_paterno,
                    'apellido_materno'    => $estudianteAuxiliar->apellido_materno,
                    'email_institucional' => $estudianteAuxiliar->email_institucional,
                ],
            ],
        ], 201);
    }

    /**
     * HU19: Docente desactiva (remueve) a un auxiliar del examen sin borrar el registro.
     * DELETE /api/examenes/{id_examen}/auxiliares/{id_auxiliar}
     */
    public function desvincularAuxiliar(Request $request, string $idExamen, string $idAuxiliar): JsonResponse
    {
        $docente = $request->user();
        $examen = Examen::find($idExamen);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        if ($docente instanceof Docente && $examen->id_docente !== $docente->id) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        // Cambiamos el estado a Inactivo en lugar de borrar la fila
        $actualizado = DB::table('examen_auxiliar')
            ->where('id_examen', $idExamen)
            ->where('id_auxiliar', $idAuxiliar)
            ->update([
                'estado'     => 'Inactivo',
                'updated_at' => Carbon::now('America/La_Paz'),
            ]);

        if (!$actualizado) {
            return response()->json(['message' => 'El auxiliar no estaba asignado a este examen.'], 404);
        }

        // Rebalancear estudiantes entre los que sigan 'Activo'
        $this->redistribuirEstudiantesExamen($idExamen);

        $this->registrarAuditoria($request, 'AUXILIAR_DESACTIVADO', [
            'examen_id'   => $idExamen,
            'auxiliar_id' => $idAuxiliar,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Auxiliar desactivado y carga de estudiantes rebalanceada.',
        ], 200);
    }

    /**
     * Listar auxiliares asignados a un examen (Vista docente).
     * GET /api/examenes/{id_examen}/auxiliares
     */
    public function listarAuxiliaresExamen(Request $request, string $idExamen): JsonResponse
    {
        $docente = $request->user();
        $examen = Examen::findOrFail($idExamen);

        if ($docente instanceof Docente && $examen->id_docente !== $docente->id) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $asignaciones = DB::table('examen_auxiliar as ea')
            ->join('estudiantes as e', 'ea.id_auxiliar', '=', 'e.id')
            ->where('ea.id_examen', $examen->id)
            ->where('ea.estado', 'Activo')
            ->orderBy('ea.created_at', 'asc')
            ->select([
                'ea.id',
                'ea.id_examen',
                'ea.id_auxiliar',
                'ea.estado',
                'ea.fecha_asignacion',
                'e.nombre',
                'e.apellido_paterno',
                'e.apellido_materno',
                'e.email_institucional',
                'e.codigo_sis',
                'e.ci',
            ])
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $asignaciones,
        ], 200);
    }

    /**
     * Auxiliar consulta sus exámenes asignados.
     * GET /api/auxiliar/mis-examenes
     */
    public function misExamenesAsignados(Request $request): JsonResponse
    {
        $auxiliar = $request->user();

        $examenes = DB::table('examen_auxiliar as ea')
            ->join('examenes as ex', 'ea.id_examen', '=', 'ex.id')
            ->leftJoin('materias as m', 'ex.id_materia', '=', 'm.id')
            ->leftJoin('aulas as a', 'ex.id_aula', '=', 'a.id')
            ->leftJoin('docente as d', 'ex.id_docente', '=', 'd.id')
            ->where('ea.id_auxiliar', $auxiliar->id)
            ->where('ea.estado', 'Activo')
            ->orderBy('ex.fecha', 'asc')
            ->select([
                'ex.id as id_examen',
                'ex.nombre',
                'm.nombre as materia',
                'a.nombre as aula',
                'ex.fecha',
                'ex.hora_ini',
                'ex.hora_fin',
                'd.nombre as docente_nombre',
                'd.apellido_paterno as docente_paterno',
                'd.apellido_materno as docente_materno',
                'ea.estado as estado_asignacion',
            ])
            ->get()
            ->map(function ($ex) {
                $docenteNombre = trim("{$ex->docente_nombre} {$ex->docente_paterno} {$ex->docente_materno}");

                return [
                    'id_examen'         => $ex->id_examen,
                    'nombre'            => $ex->nombre,
                    'materia'           => $ex->materia,
                    'aula'              => $ex->aula,
                    'fecha'             => $ex->fecha,
                    'hora_ini'          => $ex->hora_ini,
                    'hora_fin'          => $ex->hora_fin,
                    'docente'           => $docenteNombre !== '' ? $docenteNombre : null,
                    'estado_asignacion' => $ex->estado_asignacion,
                ];
            });

        return response()->json([
            'success' => true,
            'data'    => $examenes,
        ], 200);
    }

    private function registrarAuditoria(Request $request, string $accion, array $detalles = []): void
    {
        $user = $request->user();
        if (!$user) return;

        $rol = class_basename($user);
        $nombreCompleto = trim("{$user->nombre} {$user->apellido_paterno} {$user->apellido_materno}");

        LogAuditoria::create([
            'user_type'         => get_class($user),
            'user_id'           => $user->id,
            'rol_en_el_momento' => strtolower($rol),
            'usuario_nombre'    => $nombreCompleto !== '' ? $nombreCompleto : $user->nombre,
            'usuario_email'     => $user->email ?? $user->email_institucional ?? null,
            'modulo'            => 'MODULO_AUXILIAR',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}