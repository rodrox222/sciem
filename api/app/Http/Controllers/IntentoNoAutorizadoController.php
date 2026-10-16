<?php

namespace App\Http\Controllers;

use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\IntentoNoAutorizado;
use App\Http\Requests\RegistrarIntentoRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class IntentoNoAutorizadoController extends Controller
{
    /**
     * Listar intentos indebidos para un examen específico con un get
     */
    public function index(Request $request, string $idExamen): JsonResponse
    {
        $examen = Examen::findOrFail($idExamen);

        $query = IntentoNoAutorizado::where('id_examen', $examen->id)
            ->with(['estudiante:id,codigo_sis,ci,ci_extension,nombre,apellido_paterno,apellido_materno'])
            ->orderBy('fecha_hora', 'desc');

        if ($request->filled('buscar')) {
            $termino = $request->query('buscar');
            $query->where(function ($q) use ($termino) {
                $q->where('codigo_sis', 'like', "%{$termino}%")
                  ->orWhere('ci', 'like', "%{$termino}%")
                  ->orWhereHas('estudiante', function ($sub) use ($termino) {
                      $sub->where('nombre', 'ilike', "%{$termino}%")
                          ->orWhere('apellido_paterno', 'ilike', "%{$termino}%");
                  });
            });
        }

        $intentos = $query->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'data'    => $intentos,
        ]);
    }

    /**
     * Registrar un intento no correspondiente con un post
     */
    public function store(RegistrarIntentoRequest $request, string $idExamen): JsonResponse
    {
        $examen = Examen::findOrFail($idExamen);

        $idEstudiante = $request->input('id_estudiante');
        $codigoSis    = $request->input('codigo_sis');
        $ci           = $request->input('ci');
        $ciExtension  = $request->input('ci_extension');

        $estudiante = null;

        // Intentar resolver el estudiante si viene en el sistema
        if ($idEstudiante) {
            $estudiante = Estudiante::find($idEstudiante);
        } elseif ($codigoSis) {
            $estudiante = Estudiante::where('codigo_sis', $codigoSis)->first();
        } elseif ($ci) {
            $queryCi = Estudiante::where('ci', $ci);
            if (!empty($ciExtension)) {
                $estudiante = $queryCi->where('ci_extension', $ciExtension)->first();
            } else {
                $candidatos = $queryCi->get();
                if ($candidatos->count() === 1) {
                    $estudiante = $candidatos->first();
                }
            }
        }

        // Si el estudiante existe, verificar que NO esté ya matriculado
        if ($estudiante) {
            $estaMatriculado = $examen->estudiantes()
                ->where('estudiantes.id', $estudiante->id)
                ->exists();

            if ($estaMatriculado) {
                return response()->json([
                    'success' => false,
                    'message' => 'El estudiante ya se encuentra matriculado en este examen.',
                ], 422);
            }
        }

        $usuarioAutenticado = $request->user();

        // Crear el intento indebido (funciona tanto para registrados como para no registrados)
        $intento = IntentoNoAutorizado::create([
            'id'                 => (string) Str::uuid(),
            'id_examen'          => $examen->id,
            'codigo_sis'         => $codigoSis ?? $estudiante?->codigo_sis,
            'ci'                 => $ci ?? $estudiante?->ci,
            'ci_extension'       => $ciExtension ?? $estudiante?->ci_extension,
            'id_estudiante'      => $estudiante?->id ?? $idEstudiante,
            'registrado_por_id'  => $usuarioAutenticado?->id,
            'registrado_por_rol' => $usuarioAutenticado ? class_basename($usuarioAutenticado) : null,
            'fecha_hora'         => $request->input('fecha_hora', now()),
            'motivo'             => $request->input('motivo', $estudiante ? 'No matriculado en el examen' : 'No registrado en el sistema'),
            'observacion'        => $request->input('observacion'),
        ]);

        $nombreCompleto = $estudiante 
            ? trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}") 
            : null;

        return response()->json([
            'success' => true,
            'message' => 'Intento no correspondiente registrado exitosamente.',
            'data'    => [
                'id'              => $intento->id,
                'id_examen'       => $intento->id_examen,
                'codigo_sis'      => $intento->codigo_sis,
                'ci'              => $intento->ci,
                'ci_extension'    => $intento->ci_extension,
                'id_estudiante'   => $intento->id_estudiante,
                'nombre_completo' => $nombreCompleto,
                'motivo'          => $intento->motivo,
                'observacion'     => $intento->observacion,
                'fecha_hora'      => $intento->fecha_hora,
            ],
        ], 201);
    }
}