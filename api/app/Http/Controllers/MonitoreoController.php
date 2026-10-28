<?php

namespace App\Http\Controllers;

use App\Services\AccesoExamen;
use App\Services\AsistenciaExamen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MonitoreoController extends Controller
{
    private function datos(Request $request, string $id): array
    {
        $e = AccesoExamen::buscar($id);
        AccesoExamen::autorizar($request, $e, false);
        $rows = AsistenciaExamen::nomina($id)->join('estudiantes as e', 'e.id', '=', 'ee.id_estudiante')
            ->select('e.id', 'e.codigo_sis', 'e.ci', 'e.nombre', 'e.apellido_paterno', 'e.apellido_materno', 'ee.fecha_ingreso')
            ->orderBy('e.apellido_paterno')->orderBy('e.apellido_materno')->orderBy('e.nombre')->orderBy('e.id')->get();

        return [$e, $rows];
    }

    public function resumen(Request $request, string $idExamen): JsonResponse
    {
        [$e, $rows] = $this->datos($request, $idExamen);
        $ingresados = $rows->whereNotNull('fecha_ingreso')->values();
        $ausentes = $rows->whereNull('fecha_ingreso')->values();
        $revision = hash('sha256', $rows->toJson());
        $result = [
            'examen' => ['id' => $e->id, 'nombre' => $e->nombre, 'fecha' => $e->fecha?->format('Y-m-d')],
            'resumen' => ['total_estudiantes' => $rows->count(), 'total_ingresados' => $ingresados->count(), 'total_ausentes' => $ausentes->count()],
            'revision' => $revision, 'hora_servidor' => now('America/La_Paz')->toIso8601String(),
        ];
        if ($request->boolean('incluir_listas') && $request->query('revision') !== $revision) {
            $result['listas'] = ['ingresados' => $ingresados, 'ausentes' => $ausentes];
        }

        return response()->json($result);
    }

    public function estudiantes(Request $request, string $idExamen): JsonResponse
    {
        $estado = $request->validate(['estado' => 'required|in:ingresados,ausentes'])['estado'];
        [$e, $rows] = $this->datos($request, $idExamen);
        $filtered = ($estado === 'ingresados' ? $rows->whereNotNull('fecha_ingreso') : $rows->whereNull('fecha_ingreso'))->values();

        return response()->json(['examen' => ['id' => $e->id, 'nombre' => $e->nombre], 'estado' => $estado, 'total' => $filtered->count(), 'estudiantes' => $filtered, 'revision' => hash('sha256', $rows->toJson())]);
    }
}
