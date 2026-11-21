<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Gestion;
use App\Models\LogAuditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class GestionController extends Controller
{
    public function index(): JsonResponse
    {
        $gestiones = Gestion::orderByDesc('activo')
            ->orderByDesc('anio')
            ->orderByDesc('periodo')
            ->get();

        return response()->json($gestiones);
    }

    public function activa(): JsonResponse
    {
        $gestion = Gestion::activa();

        return response()->json([
            'gestion' => $gestion,
            'vencida' => $gestion ? $gestion->estaVencida() : false,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'anio'         => ['required', 'integer', 'min:2020', 'max:2100'],
            'periodo'      => ['required', 'integer', Rule::in([1, 2, 3, 4])],
            'fecha_inicio' => ['required', 'date_format:Y-m-d'],
            'fecha_fin'    => ['required', 'date_format:Y-m-d', 'after_or_equal:fecha_inicio'],
        ], [
            'anio.required'           => 'El año es obligatorio.',
            'anio.integer'            => 'El año debe ser un número entero.',
            'periodo.required'        => 'El periodo es obligatorio.',
            'periodo.in'              => 'El periodo debe ser 1 (Primer Semestre), 2 (Segundo Semestre), 3 (Verano) o 4 (Invierno).',
            'fecha_inicio.required'   => 'La fecha de inicio es obligatoria.',
            'fecha_fin.required'      => 'La fecha de finalización es obligatoria.',
            'fecha_fin.after_or_equal'=> 'La fecha de finalización debe ser igual o posterior a la fecha de inicio.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validación fallida.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        if (Gestion::activa()) {
            return response()->json([
                'message' => 'Ya existe una gestión activa. Debes cerrar la gestión actual antes de iniciar una nueva.',
            ], 422);
        }

        $anio = (int) $request->input('anio');
        $periodo = (int) $request->input('periodo');
        $codigo = "{$periodo}-{$anio}";

        if (Gestion::where('codigo', $codigo)->exists()) {
            return response()->json([
                'message' => "La gestión {$codigo} ya fue registrada anteriormente.",
                'errors'  => ['periodo' => ["La gestión {$codigo} ya existe en el historial."]],
            ], 422);
        }

        $gestion = DB::transaction(function () use ($anio, $periodo, $codigo, $request) {
            return Gestion::create([
                'anio'         => $anio,
                'periodo'      => $periodo,
                'codigo'       => $codigo,
                'fecha_inicio' => $request->input('fecha_inicio'),
                'fecha_fin'    => $request->input('fecha_fin'),
                'activo'       => DB::raw('true'),
                'cerrado_en'   => null,
            ]);
        });
        $gestion->refresh();

        $this->registrarAuditoria($request, 'GESTION_INICIADA', [
            'target_type'    => 'gestiones',
            'target_id'      => $gestion->id,
            'codigo'         => $gestion->codigo,
            'valores_nuevos' => [
                'codigo'       => $gestion->codigo,
                'fecha_inicio' => $gestion->fecha_inicio?->format('Y-m-d'),
                'fecha_fin'    => $gestion->fecha_fin?->format('Y-m-d'),
                'activo'       => true,
            ],
        ]);

        return response()->json([
            'message' => "Gestión {$gestion->codigo} iniciada correctamente.",
            'gestion' => $gestion,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $gestion = Gestion::find($id);
        if (!$gestion) {
            return response()->json(['message' => 'Gestión no encontrada.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'fecha_inicio' => ['required', 'date_format:Y-m-d'],
            'fecha_fin'    => ['required', 'date_format:Y-m-d', 'after_or_equal:fecha_inicio'],
        ], [
            'fecha_inicio.required'    => 'La fecha de inicio es obligatoria.',
            'fecha_fin.required'       => 'La fecha de finalización es obligatoria.',
            'fecha_fin.after_or_equal' => 'La fecha de finalización debe ser igual o posterior a la fecha de inicio.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validación fallida.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $anteriores = [
            'fecha_inicio' => $gestion->fecha_inicio?->format('Y-m-d'),
            'fecha_fin'    => $gestion->fecha_fin?->format('Y-m-d'),
        ];

        $gestion->update([
            'fecha_inicio' => $request->input('fecha_inicio'),
            'fecha_fin'    => $request->input('fecha_fin'),
        ]);

        $this->registrarAuditoria($request, 'GESTION_ACTUALIZADA', [
            'target_type'        => 'gestiones',
            'target_id'          => $gestion->id,
            'codigo'             => $gestion->codigo,
            'valores_anteriores' => $anteriores,
            'valores_nuevos'     => [
                'fecha_inicio' => $gestion->fecha_inicio?->format('Y-m-d'),
                'fecha_fin'    => $gestion->fecha_fin?->format('Y-m-d'),
            ],
        ]);

        return response()->json([
            'message' => "Fechas de la gestión {$gestion->codigo} actualizadas.",
            'gestion' => $gestion->fresh(),
        ]);
    }

    public function cerrar(Request $request, string $id): JsonResponse
    {
        $gestion = Gestion::find($id);
        if (!$gestion) {
            return response()->json(['message' => 'Gestión no encontrada.'], 404);
        }

        if (!$gestion->activo) {
            return response()->json([
                'message' => "La gestión {$gestion->codigo} ya se encuentra cerrada.",
            ], 422);
        }

        $gestion->update([
            'activo'     => DB::raw('false'),
            'cerrado_en' => now(),
        ]);
        $gestion->refresh();

        $this->registrarAuditoria($request, 'GESTION_CERRADA', [
            'target_type'        => 'gestiones',
            'target_id'          => $gestion->id,
            'codigo'             => $gestion->codigo,
            'valores_anteriores' => ['activo' => true],
            'valores_nuevos'     => ['activo' => false, 'cerrado_en' => $gestion->cerrado_en?->toIso8601String()],
        ]);

        return response()->json([
            'message' => "Gestión {$gestion->codigo} cerrada correctamente.",
            'gestion' => $gestion->fresh(),
        ]);
    }

    private function registrarAuditoria(Request $request, string $accion, array $detalles = []): void
    {
        $user = $request->user();
        if (!$user) {
            return;
        }

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
            'modulo'            => 'CONFIGURACION',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}
