<?php

namespace App\Http\Controllers;

use App\Models\Examen;
use App\Models\IntentoNoAutorizado;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IntentoNoAutorizadoController extends Controller
{
    /**
     * HU13: Listar los intentos indebidos registrados automáticamente por el escáner
     */
    public function index(Request $request, string $idExamen): JsonResponse
    {
        $examen = Examen::findOrFail($idExamen);

        $intentos = IntentoNoAutorizado::where('id_examen', $examen->id)
            ->with(['estudiante:id,codigo_sis,ci,ci_extension,nombre,apellido_paterno,apellido_materno'])
            ->orderBy('fecha_hora', 'desc')
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'data'    => $intentos,
        ], 200);
    }
}