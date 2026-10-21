<?php

namespace App\Http\Controllers;

use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\ExamenAuxiliar;
use App\Models\LogAuditoria;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuxiliarModuloController extends Controller
{
    /**
     * HU19 - T5: Docente invita a un auxiliar por correo institucional (#159)
     * POST /api/examenes/{id_examen}/invitar-auxiliar
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
                'success' => false,
                'message' => 'Examen no encontrado.',
                'error_type' => 'EXAMEN_NO_ENCONTRADO',
            ], 404);
        }

        // Criterio 8: Docente intenta invitar a un examen que no es suyo
        if ($docente instanceof Docente && $examen->id_docente !== $docente->id) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene permisos para gestionar este examen.',
                'error_type' => 'ACCESO_DENEGADO',
            ], 403);
        }

        $email = trim(strtolower($request->input('email')));

        // Criterio 7: Correo que no corresponde a un auxiliar válido
        $auxiliar = Auxiliar::where(DB::raw('LOWER(email)'), $email)->first();
        if (!$auxiliar) {
            return response()->json([
                'success' => false,
                'message' => 'El correo no corresponde a ningún auxiliar registrado en el sistema.',
                'error_type' => 'AUXILIAR_NO_ENCONTRADO',
            ], 404);
        }

        // Criterio 12: La persona invitada ya es estudiante del mismo examen
        $esEstudiante = DB::table('estudiante_examen')
            ->join('estudiantes', 'estudiante_examen.id_estudiante', '=', 'estudiantes.id')
            ->where('estudiante_examen.id_examen', $examen->id)
            ->where(function ($q) use ($auxiliar, $email) {
                $q->where(DB::raw('LOWER(estudiantes.email_institucional)'), $email)
                  ->orWhere('estudiantes.ci', $auxiliar->ci ?? '__none__');
            })
            ->exists();

        if ($esEstudiante) {
            return response()->json([
                'success' => false,
                'message' => 'Conflicto de roles: la persona ya figura como estudiante inscrito en este examen.',
                'error_type' => 'ROL_DUPLICADO_ESTUDIANTE',
            ], 422);
        }

        // Criterio 6: Auxiliar ya invitado al mismo examen
        $invitacionExistente = ExamenAuxiliar::where('id_examen', $examen->id)
            ->where('id_auxiliar', $auxiliar->id)
            ->first();

        if ($invitacionExistente) {
            return response()->json([
                'success' => false,
                'message' => "El auxiliar ya tiene una invitación para este examen con estado: {$invitacionExistente->estado}.",
                'error_type' => 'INVITACION_YA_EXISTE',
                'estado'     => $invitacionExistente->estado,
            ], 422);
        }

        // Criterio 1: Crear invitación en estado Pendiente
        $invitacion = ExamenAuxiliar::create([
            'id_examen'        => $examen->id,
            'id_auxiliar'      => $auxiliar->id,
            'estado'           => 'Pendiente',
            'fecha_invitacion' => Carbon::now('America/La_Paz'),
        ]);

        // Criterio 14: Registro en auditoría
        $this->registrarAuditoria($request, 'INVITACION_AUXILIAR_CREADA', [
            'examen_id'   => $examen->id,
            'auxiliar_id' => $auxiliar->id,
            'email'       => $email,
        ]);

        return response()->json([
            'success'    => true,
            'message'    => 'Invitación enviada exitosamente al auxiliar.',
            'invitacion' => $invitacion->load('auxiliar:id,nombre,apellido_paterno,apellido_materno,email'),
        ], 201);
    }

    /**
     * Listar auxiliares asignados a un examen (Vista docente)
     * GET /api/examenes/{id_examen}/auxiliares
     */
    public function listarAuxiliaresExamen(Request $request, string $idExamen): JsonResponse
    {
        $docente = $request->user();
        $examen = Examen::findOrFail($idExamen);

        if ($docente instanceof Docente && $examen->id_docente !== $docente->id) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $asignaciones = ExamenAuxiliar::where('id_examen', $examen->id)
            ->with('auxiliar:id,nombre,apellido_paterno,apellido_materno,email,ci')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $asignaciones,
        ], 200);
    }

    /**
     * HU19 - T6: Auxiliar ve sus invitaciones pendientes (#160)
     * GET /api/auxiliar/invitaciones
     */
    public function misInvitaciones(Request $request): JsonResponse
    {
        $auxiliar = $request->user();

        // Criterio 2: Examen, docente que lo invita y fecha
        $invitaciones = ExamenAuxiliar::where('id_auxiliar', $auxiliar->id)
            ->where('estado', 'Pendiente')
            ->with([
                'examen' => function ($q) {
                    $q->select('id', 'nombre', 'fecha', 'hora_ini', 'hora_fin', 'id_docente', 'id_materia', 'id_aula')
                      ->with([
                          'docente:id,nombre,apellido_paterno,apellido_materno,email',
                          'materia:id,nombre',
                          'aula:id,nombre',
                      ]);
                }
            ])
            ->orderBy('fecha_invitacion', 'desc')
            ->get()
            ->map(function ($inv) {
                $doc = $inv->examen?->docente;
                $docenteNombre = $doc ? trim("{$doc->nombre} {$doc->apellido_paterno} {$doc->apellido_materno}") : 'Docente titular';

                return [
                    'id_invitacion'    => $inv->id,
                    'estado'           => $inv->estado,
                    'fecha_invitacion' => $inv->fecha_invitacion,
                    'examen'           => [
                        'id'         => $inv->examen?->id,
                        'nombre'     => $inv->examen?->nombre,
                        'materia'    => $inv->examen?->materia?->nombre,
                        'aula'       => $inv->examen?->aula?->nombre ?? $inv->examen?->aula,
                        'fecha'      => $inv->examen?->fecha,
                        'hora'       => trim("{$inv->examen?->hora_ini} - {$inv->examen?->hora_fin}"),
                        'docente'    => $docenteNombre,
                    ],
                ];
            });

        return response()->json([
            'success' => true,
            'data'    => $invitaciones,
        ], 200);
    }

    /**
     * HU19 - T6: Auxiliar acepta o rechaza una invitación (#160)
     * PATCH /api/auxiliar/invitaciones/{id_invitacion}/responder
     */
    public function responderInvitacion(Request $request, string $idInvitacion): JsonResponse
    {
        $auxiliar = $request->user();

        $request->validate([
            'accion' => ['required', 'in:Aceptar,Rechazar'],
        ]);

        $invitacion = ExamenAuxiliar::with('examen')->find($idInvitacion);
        if (!$invitacion) {
            return response()->json([
                'success'    => false,
                'message'    => 'Invitación no encontrada.',
                'error_type' => 'INVITACION_NO_ENCONTRADA',
            ], 404);
        }

        // Criterio 9: Auxiliar intenta responder una invitación ajena
        if ($invitacion->id_auxiliar !== $auxiliar->id) {
            return response()->json([
                'success'    => false,
                'message'    => 'No tiene autorización sobre esta invitación.',
                'error_type' => 'ACCESO_DENEGADO',
            ], 403);
        }

        // Criterio 11: La invitación ya fue respondida previamente
        if ($invitacion->estado !== 'Pendiente') {
            return response()->json([
                'success'    => false,
                'message'    => "Esta invitación ya fue respondida anteriormente con estado: {$invitacion->estado}.",
                'error_type' => 'INVITACION_YA_RESPONDIDA',
            ], 422);
        }

        $nuevoEstado = $request->input('accion') === 'Aceptar' ? 'Aceptada' : 'Rechazada';

        $invitacion->estado = $nuevoEstado;
        $invitacion->fecha_respuesta = Carbon::now('America/La_Paz');
        $invitacion->save();

        // Criterio 14: Auditoría de respuesta
        $this->registrarAuditoria($request, 'INVITACION_AUXILIAR_RESPONDIDA', [
            'invitacion_id' => $invitacion->id,
            'examen_id'     => $invitacion->id_examen,
            'auxiliar_id'   => $auxiliar->id,
            'nuevo_estado'  => $nuevoEstado,
        ]);

        return response()->json([
            'success' => true,
            'message' => $nuevoEstado === 'Aceptada' 
                ? 'Invitación aceptada. El examen ha sido añadido a tu lista.' 
                : 'Invitación rechazada.',
            'estado'  => $nuevoEstado,
        ], 200);
    }

    /**
     * HU19 - T6: Auxiliar consulta sus exámenes asignados (#160)
     * GET /api/auxiliar/mis-examenes
     */
    public function misExamenesAsignados(Request $request): JsonResponse
    {
        $auxiliar = $request->user();

        // Criterio 5: Solo exámenes con asignación Aceptada
        $examenes = ExamenAuxiliar::where('id_auxiliar', $auxiliar->id)
            ->where('estado', 'Aceptada')
            ->with([
                'examen' => function ($q) {
                    $q->with([
                        'docente:id,nombre,apellido_paterno,apellido_materno',
                        'materia:id,nombre',
                        'aula:id,nombre',
                    ]);
                }
            ])
            ->get()
            ->map(function ($asig) {
                $ex = $asig->examen;
                $doc = $ex?->docente;

                return [
                    'id_examen' => $ex?->id,
                    'nombre'    => $ex?->nombre,
                    'materia'   => $ex?->materia?->nombre,
                    'aula'      => $ex?->aula?->nombre ?? $ex?->aula,
                    'fecha'     => $ex?->fecha,
                    'hora_ini'  => $ex?->hora_ini,
                    'hora_fin'  => $ex?->hora_fin,
                    'docente'   => $doc ? trim("{$doc->nombre} {$doc->apellido_paterno} {$doc->apellido_materno}") : null,
                    'estado_asignacion' => $asig->estado,
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
            'usuario_email'     => $user->email ?? null,
            'modulo'            => 'MODULO_AUXILIAR',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}