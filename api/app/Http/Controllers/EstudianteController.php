<?php

namespace App\Http\Controllers;

use App\Http\Requests\InscribirEstudianteExamenRequest;
use App\Http\Requests\StoreEstudianteRequest;
use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\LogAuditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

use App\Http\Requests\CompletarDatosEstudianteRequest;
use App\Http\Requests\SubirFotoEstudianteRequest;
use Cloudinary\Cloudinary;
use Illuminate\Support\Facades\Log;

class EstudianteController extends Controller
{
    /**
     * Listar todos los estudiantes registrados.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Estudiante::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'ilike', "%{$search}%")
                  ->orWhere('apellido_paterno', 'ilike', "%{$search}%")
                  ->orWhere('apellido_materno', 'ilike', "%{$search}%")
                  ->orWhere('codigo_sis', 'ilike', "%{$search}%")
                  ->orWhere('ci', 'ilike', "%{$search}%");
            });
        }

        $perPage = (int) $request->query('per_page', 10);
        return response()->json($query->orderBy('apellido_paterno', 'asc')->paginate($perPage));
    }

    /**
     * Registrar un estudiante en el padrón general.
     */
    public function store(StoreEstudianteRequest $request): JsonResponse
    {
        $data = $request->validated();
        $estudiante = Estudiante::create($data);

        $this->registrarAuditoria($request, 'ESTUDIANTE_CREADO', [
            'estudiante_id' => $estudiante->id,
            'codigo_sis'    => $estudiante->codigo_sis,
            'ci'            => $estudiante->ci,
        ]);

        return response()->json([
            'message'    => 'Estudiante registrado exitosamente.',
            'estudiante' => $estudiante,
        ], 201);
    }

    /**
     * Obtener estudiante por UUID o por Código SIS.
     */
    public function show(string $identificador): JsonResponse
    {
        $estudiante = Estudiante::where('id', $identificador)
            ->orWhere('codigo_sis', $identificador)
            ->first();

        if (!$estudiante) {
            return response()->json(['message' => 'Estudiante no encontrado.'], 404);
        }

        return response()->json($estudiante);
    }

    /**
     * Listar los estudiantes asignados a un examen específico.
     */
    public function estudiantesPorExamen(Request $request, string $idExamen): JsonResponse
    {
        $examen = Examen::find($idExamen);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        $query = $examen->estudiantes();

        if ($estado = $request->query('estado')) {
            $query->wherePivot('estado', $estado);
        }

        return response()->json($query->paginate(15));
    }

    /**
     * Inscribir estudiante al examen:
     * Si no existe en la BD, lo crea. Si ya existe, actualiza sus datos básicos y lo vincula al examen.
     */
    public function inscribirAExamen(InscribirEstudianteExamenRequest $request, string $idExamen): JsonResponse
    {
        $examen = Examen::withCount('prerrequisitos')->find($idExamen);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        if ($request->user() instanceof Docente && $examen->id_docente !== $request->user()->id) {
            return response()->json(['message' => 'Este examen pertenece a otro docente.'], 403);
        }

        $data = $request->validated();

        // Si el examen tiene prerrequisitos -> Inhabilitado. Si no tiene -> Habilitado.
        $estadoPorDefecto = ($examen->prerrequisitos_count > 0) ? 'Inhabilitado' : 'Habilitado';
        $estado = $data['estado'] ?? $estadoPorDefecto;

        $estudiante = DB::transaction(function () use ($examen, $data, $estado) {
            $estudiante = Estudiante::updateOrCreate(
                ['codigo_sis' => $data['codigo_sis']],
                [
                    'ci'                  => $data['ci'] ?? null,
                    'ci_extension'        => $data['ci_extension'] ?? null,
                    'nombre'              => $data['nombre'],
                    'apellido_paterno'    => $data['apellido_paterno'],
                    'apellido_materno'    => $data['apellido_materno'] ?? null,
                    'email_institucional' => $data['email_institucional'],
                    'activo'              => true,
                ]
            );

            $examen->estudiantes()->syncWithoutDetaching([
                $estudiante->id => [
                    'estado'        => $estado,
                    'motivo_estado' => null,
                    'ajuste_manual' => false,
                ],
            ]);

            return $estudiante;
        });

        $this->registrarAuditoria($request, 'ESTUDIANTE_INSCRITO_EXAMEN', [
            'examen_id'     => $examen->id,
            'estudiante_id' => $estudiante->id,
            'codigo_sis'    => $estudiante->codigo_sis,
            'estado'        => $estado,
        ]);

        return response()->json([
            'message'    => 'Estudiante vinculado al examen exitosamente.',
            'estudiante' => $estudiante->load(['examenes' => function ($q) use ($idExamen) {
                $q->where('examenes.id', $idExamen);
            }]),
        ], 200);
    }

    /**
     * Desvincular estudiante de un examen.
     */
    public function desvincularDeExamen(Request $request, string $idExamen, string $idEstudiante): JsonResponse
    {
        $examen = Examen::find($idExamen);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        $examen->estudiantes()->detach($idEstudiante);

        $this->registrarAuditoria($request, 'ESTUDIANTE_DESVINCULADO_EXAMEN', [
            'examen_id'     => $examen->id,
            'estudiante_id' => $idEstudiante,
        ]);

        return response()->json(['message' => 'Estudiante desvinculado del examen correctamente.']);
    }

    /**
     * Registra auditoría centralizada.
     */
    private function registrarAuditoria(Request $request, string $accion, array $detalles = []): void
    {
        $user = $request->user();

        $rol = match ($user ? get_class($user) : null) {
            Admin::class      => 'admin',
            Docente::class    => 'docente',
            Auxiliar::class   => 'auxiliar',
            Estudiante::class => 'estudiante',
            default           => 'desconocido',
        };

        $nombreCompleto = $user 
            ? trim("{$user->nombre} {$user->apellido_paterno} {$user->apellido_materno}")
            : 'Sistema';

        LogAuditoria::create([
            'user_type'         => $user ? get_class($user) : null,
            'user_id'           => $user?->id,
            'rol_en_el_momento' => $rol,
            'usuario_nombre'    => $nombreCompleto !== '' ? $nombreCompleto : ($user->nombre ?? 'Sistema'),
            'usuario_email'     => $user->email_institucional ?? $user->email ?? null,
            'modulo'            => 'ESTUDIANTES',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }

    public function completarDatos(CompletarDatosEstudianteRequest $request, string $id): JsonResponse
    {
        $estudiante = Estudiante::findOrFail($id);

        $estudiante->ci = $request->input('ci');
        $estudiante->ci_extension = $request->input('ci_extension');

        // Si ya cuenta con foto guardada, se marca completado el primer acceso
        if (!empty($estudiante->foto_perfil_url)) {
            $estudiante->primer_acceso_completado = true;
        }

        $estudiante->save();

        return response()->json([
            'success' => true,
            'message' => 'Datos de identidad registrados exitosamente.',
            'data'    => [
                'id'                       => $estudiante->id,
                'codigo_sis'               => $estudiante->codigo_sis,
                'ci'                       => $estudiante->ci,
                'ci_extension'             => $estudiante->ci_extension,
                'nombre_completo'          => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                'foto_perfil_url'          => $estudiante->foto_perfil_url,
                'primer_acceso_completado' => $estudiante->primer_acceso_completado,
            ],
        ], 200);
    }

    /**
     * HU18 Subir y almacenar fotografía facial en Cloudinary
     */
    public function subirFoto(SubirFotoEstudianteRequest $request, string $id): JsonResponse
    {
        $estudiante = Estudiante::find($id);

        if (!$estudiante) {
            return response()->json([
                'success'    => false,
                'message'    => 'El estudiante no existe en el sistema.',
                'error_type' => 'ESTUDIANTE_NO_ENCONTRADO',
            ], 404);
        }

        try {
            $cloudinary = new Cloudinary(env('CLOUDINARY_URL'));

            // Eliminar foto previa en Cloudinary si ya existía para ahorrar cuota
            if (!empty($estudiante->foto_perfil_url)) {
                $publicIdAnterior = $this->extraerPublicId($estudiante->foto_perfil_url);
                if ($publicIdAnterior) {
                    try {
                        $cloudinary->uploadApi()->destroy($publicIdAnterior);
                    } catch (\Throwable $th) {
                        Log::warning("No se pudo eliminar foto previa en Cloudinary: " . $th->getMessage());
                    }
                }
            }

            // Subir la imagen recibida
            $archivo = $request->file('foto');
            $resultado = $cloudinary->uploadApi()->upload(
                $archivo->getRealPath(),
                [
                    'folder'         => 'sciem/estudiantes_facial',
                    'public_id'      => "facial_{$estudiante->codigo_sis}_" . time(),
                    'overwrite'      => true,
                    'resource_type'  => 'image',
                    'transformation' => [
                        'width'   => 500,
                        'height'  => 500,
                        'crop'    => 'thumb',
                        'gravity' => 'face',
                        'quality' => 'auto',
                    ],
                ]
            );

            // Guardar URL HTTPS en PostgreSQL
            $estudiante->foto_perfil_url = $resultado['secure_url'];

            // Si ya cuenta con CI registrado, se completa el primer acceso
            if (!empty($estudiante->ci)) {
                $estudiante->primer_acceso_completado = true;
            }

            $estudiante->save();

            $this->registrarAuditoria($request, 'FOTO_FACIAL_ACTUALIZADA', [
                'estudiante_id' => $estudiante->id,
                'codigo_sis'    => $estudiante->codigo_sis,
                'url'           => $estudiante->foto_perfil_url,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Fotografía facial validada y guardada exitosamente.',
                'data'    => [
                    'id'                       => $estudiante->id,
                    'codigo_sis'               => $estudiante->codigo_sis,
                    'ci'                       => $estudiante->ci,
                    'ci_extension'             => $estudiante->ci_extension,
                    'foto_perfil_url'          => $estudiante->foto_perfil_url,
                    'primer_acceso_completado' => (bool) $estudiante->primer_acceso_completado,
                ],
            ], 200);

        } catch (\Throwable $e) {
            Log::error("Error Cloudinary: " . $e->getMessage());

            return response()->json([
                'success'    => false,
                'message'    => 'Error al conectar con el servicio de almacenamiento en la nube.',
                'error_type' => 'FALLO_CLOUDINARY',
                'detalle'    => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Helper para extraer el public_id de la URL de Cloudinary
     */
    private function extraerPublicId(?string $url): ?string
    {
        if (!$url || !str_contains($url, 'res.cloudinary.com')) {
            return null;
        }

        $partes = explode('/upload/', $url);
        if (count($partes) < 2) {
            return null;
        }

        $sinVersion = preg_replace('/^v\d+\//', '', $partes[1]);
        return preg_replace('/\.[^.]+$/', '', $sinVersion);
    }

    /**
     * HU18 Consultar exámenes inscritos y estado de habilitación
     */
    public function misExamenes(Request $request, string $id): JsonResponse
    {
        $estudiante = Estudiante::find($id);

        if (!$estudiante) {
            return response()->json([
                'success'    => false,
                'message'    => 'El estudiante no existe en el sistema.',
                'error_type' => 'ESTUDIANTE_NO_ENCONTRADO',
            ], 404);
        }

        // Obtiene exclusivamente los exámenes donde el estudiante figura en estudiante_examen
        $examenes = $estudiante->examenes()
            ->with([
                'materia:id,nombre',
                'aula:id,nombre',
                'docente:id,nombre,apellido_paterno,apellido_materno'
            ])
            ->orderBy('fecha', 'asc')
            ->get()
            ->map(function ($examen) {
                $docenteNombre = $examen->docente 
                    ? trim("{$examen->docente->nombre} {$examen->docente->apellido_paterno} {$examen->docente->apellido_materno}")
                    : null;

                return [
                    'id_examen'     => $examen->id,
                    'nombre'        => $examen->nombre,
                    'materia'       => $examen->materia?->nombre,
                    'aula'          => $examen->aula?->nombre ?? $examen->aula,
                    'docente'       => $docenteNombre,
                    'fecha'         => $examen->fecha,
                    'hora_ini'      => $examen->hora_ini ?? $examen->hora_inicio,
                    'hora_fin'      => $examen->hora_fin,
                    'estado'        => $examen->pivot->estado, // 'Habilitado' o 'Inhabilitado'
                    'motivo_estado' => $examen->pivot->motivo_estado,
                ];
            });

        return response()->json([
            'success'        => true,
            'total_examenes' => $examenes->count(),
            'examenes'       => $examenes,
        ], 200);
    }

    /**
     * HU18 Generar token firmado para el código QR dinámico
     */
    public function generarTokenQr(Request $request, string $idEstudiante, string $idExamen): JsonResponse
    {
        $estudiante = Estudiante::find($idEstudiante);
        if (!$estudiante) {
            return response()->json([
                'success'    => false,
                'message'    => 'Estudiante no encontrado.',
                'error_type' => 'ESTUDIANTE_NO_ENCONTRADO'
            ], 404);
        }

        // Requiere registro obligatorio previo (CI y Foto facial)
        if (!$estudiante->primer_acceso_completado) {
            return response()->json([
                'success'    => false,
                'message'    => 'Debe registrar su Carnet de Identidad y foto de perfil antes de generar su QR.',
                'error_type' => 'REGISTRO_INCOMPLETO'
            ], 403);
        }

        // Verificar inscripción al examen
        $inscripcion = DB::table('estudiante_examen')
            ->where('id_estudiante', $idEstudiante)
            ->where('id_examen', $idExamen)
            ->first();

        if (!$inscripcion) {
            return response()->json([
                'success'    => false,
                'message'    => 'No se encuentra registrado en este examen.',
                'error_type' => 'NO_INSCRITO'
            ], 404);
        }

        // Solo genera QR si está Habilitado
        if ($inscripcion->estado !== 'Habilitado') {
            return response()->json([
                'success'       => false,
                'message'       => 'No se puede generar el código QR: el estudiante no está habilitado.',
                'error_type'    => 'ESTUDIANTE_INHABILITADO',
                'motivo_estado' => $inscripcion->motivo_estado,
            ], 403);
        }

        // Criptografía: Payload firmado con 15 minutos de caducidad
        $expiraEn = now()->addMinutes(15)->timestamp;
        $payload = [
            'id_estudiante' => $estudiante->id,
            'codigo_sis'    => $estudiante->codigo_sis,
            'ci'            => $estudiante->ci,
            'id_examen'     => $idExamen,
            'exp'           => $expiraEn,
            'nonce'         => \Illuminate\Support\Str::random(10),
        ];

        $payloadBase64 = base64_encode(json_encode($payload));
        $firma = hash_hmac('sha256', $payloadBase64, config('app.key'));
        $qrToken = "{$payloadBase64}.{$firma}";

        return response()->json([
            'success' => true,
            'message' => 'Token QR generado exitosamente.',
            'data'    => [
                'qr_token'    => $qrToken,
                'expira_en'   => date('c', $expiraEn),
                'estudiante'  => [
                    'codigo_sis'      => $estudiante->codigo_sis,
                    'nombre_completo' => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                    'foto_url'        => $estudiante->foto_perfil_url,
                ],
            ],
        ], 200);
    }
}