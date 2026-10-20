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
use Illuminate\Support\Str;

use App\Http\Requests\CompletarDatosEstudianteRequest;
use App\Http\Requests\SubirFotoEstudianteRequest;
use Illuminate\Support\Facades\Log;
use Cloudinary\Cloudinary;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

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

        if (empty($data['password'])) {
            $data['password'] = Estudiante::generarPasswordPorDefecto(
                $data['codigo_sis'],
                $data['nombre'],
                $data['apellido_paterno'] ?? null,
                $data['apellido_materno'] ?? null
            );
        }

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
            // Buscar si ya existe el estudiante por su código SIS
            $estudiante = Estudiante::where('codigo_sis', $data['codigo_sis'])->first();

            if (!$estudiante) {
                // Si no existe, calculamos la contraseña por defecto (ej: 20202020JPG)
                $defaultPassword = Estudiante::generarPasswordPorDefecto(
                    $data['codigo_sis'],
                    $data['nombre'],
                    $data['apellido_paterno'] ?? null,
                    $data['apellido_materno'] ?? null
                );

                $estudiante = Estudiante::create([
                    'codigo_sis'          => $data['codigo_sis'],
                    'ci'                  => $data['ci'] ?? null,
                    'ci_extension'        => $data['ci_extension'] ?? null,
                    'nombre'              => $data['nombre'],
                    'apellido_paterno'    => $data['apellido_paterno'],
                    'apellido_materno'    => $data['apellido_materno'] ?? null,
                    'email_institucional' => $data['email_institucional'],
                    'password'            => $defaultPassword, // Eloquent aplica Hash::make automáticamente por el cast
                    'activo'              => true,
                ]);
            } else {
                // Si ya existe, actualizamos sus datos sin tocar su contraseña
                $estudiante->update([
                    'ci'                  => $data['ci'] ?? $estudiante->ci,
                    'ci_extension'        => $data['ci_extension'] ?? $estudiante->ci_extension,
                    'nombre'              => $data['nombre'],
                    'apellido_paterno'    => $data['apellido_paterno'],
                    'apellido_materno'    => $data['apellido_materno'] ?? null,
                    'email_institucional' => $data['email_institucional'],
                ]);
            }

            // Vincular a la tabla intermedia del examen
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

    public function completarDatos(CompletarDatosEstudianteRequest $request): JsonResponse
    {
        /** @var Estudiante $estudiante */
        $estudiante = $request->user();

        if (!$estudiante instanceof Estudiante) {
            return response()->json([
                'success' => false,
                'message' => 'Esta acción solo está permitida para estudiantes.',
            ], 403);
        }

        $data = $request->validated();

        if (empty($estudiante->foto_perfil_url)) {
            return response()->json([
                'success'    => false,
                'message'    => 'Debe subir su fotografía de perfil antes de completar el registro.',
                'error_type' => 'FOTO_REQUERIDA'
            ], 422);
        }

        $estudiante->ci                       = trim($data['ci']);
        $estudiante->ci_extension             = !empty($data['ci_extension']) ? strtoupper(trim($data['ci_extension'])) : null;
        $estudiante->primer_acceso_completado = true;
        $estudiante->save();

        return response()->json([
            'success' => true,
            'message' => 'Perfil completado exitosamente.',
            'data'    => [
                'id'                       => $estudiante->id,
                'codigo_sis'               => $estudiante->codigo_sis,
                'ci'                       => $estudiante->ci,
                'ci_extension'             => $estudiante->ci_extension,
                'primer_acceso_completado' => $estudiante->primer_acceso_completado,
            ],
        ], 200);
    }

    /**
     * HU18 Subir y almacenar fotografía facial en Cloudinary
     */
    public function subirFoto(Request $request): JsonResponse
    {
        /** @var Estudiante $estudiante */
        $estudiante = $request->user();

        if (!$estudiante instanceof Estudiante) {
            return response()->json([
                'success' => false,
                'message' => 'Esta acción solo está permitida para estudiantes.',
            ], 403);
        }

        $request->validate([
            'foto' => 'required|image|mimes:jpeg,png,jpg|max:5120',
        ]);

        $cloudinary = new Cloudinary(config('cloudinary.cloud_url') ?? env('CLOUDINARY_URL'));

        $uploadResult = $cloudinary->uploadApi()->upload(
            $request->file('foto')->getRealPath(),
            [
                'folder' => 'sciem/estudiantes_facial',
            ]
        );

        $estudiante->foto_perfil_url = $uploadResult['secure_url'];
        // ACTIVAR DESPUÉS (cuando se vuelva a exigir foto obligatoria):
        //$estudiante->primer_acceso_completado = !empty($estudiante->foto_perfil_url) && !empty($estudiante->ci);

        // TEMPORAL: Solo se valida que tenga CI
        $estudiante->primer_acceso_completado = !empty($estudiante->ci);

        $estudiante->save();

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
    }


    /**
     * HU18 Consultar exámenes inscritos y estado de habilitación
     */

    public function misExamenes(Request $request): JsonResponse
    {
        /** @var Estudiante $estudiante */
        $estudiante = $request->user();

        if (!$estudiante instanceof Estudiante) {
            return response()->json([
                'success' => false,
                'message' => 'Esta acción solo está permitida para estudiantes.',
            ], 403);
        }

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
                    'estado'        => $examen->pivot->estado,
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
    public function generarTokenQr(Request $request, string $idExamen): JsonResponse
    {
        /** @var Estudiante $estudiante */
        $estudiante = $request->user();

        if (!$estudiante instanceof Estudiante) {
            return response()->json([
                'success' => false,
                'message' => 'Esta acción solo está permitida para estudiantes.',
            ], 403);
        }

        if (!Str::isUuid($idExamen)) {
            return response()->json([
                'success'    => false,
                'message'    => 'El identificador del examen no es válido.',
                'error_type' => 'EXAMEN_INVALIDO',
            ], 404);
        }

        $examen = Examen::find($idExamen);
        if (!$examen) {
            return response()->json([
                'success'    => false,
                'message'    => 'El examen especificado no existe.',
                'error_type' => 'EXAMEN_NO_ENCONTRADO',
            ], 404);
        }

        if (!$estudiante->primer_acceso_completado) {
            return response()->json([
                'success'    => false,
                'message'    => 'Debe registrar su Carnet de Identidad y foto de perfil antes de generar su QR.',
                'error_type' => 'REGISTRO_INCOMPLETO',
            ], 403);
        }

        $inscripcion = DB::table('estudiante_examen')
            ->where('id_estudiante', $estudiante->id)
            ->where('id_examen', $idExamen)
            ->first();

        if (!$inscripcion) {
            return response()->json([
                'success'    => false,
                'message'    => 'No se encuentra registrado en este examen.',
                'error_type' => 'NO_INSCRITO',
            ], 404);
        }

        if ($inscripcion->estado !== 'Habilitado') {
            return response()->json([
                'success'       => false,
                'message'       => 'No se puede generar el código QR: el estudiante no está habilitado.',
                'error_type'    => 'ESTUDIANTE_INHABILITADO',
                'motivo_estado' => $inscripcion->motivo_estado,
            ], 403);
        }

        $payload = [
            'id_estudiante' => $estudiante->id,
            'codigo_sis'    => $estudiante->codigo_sis,
            'ci'            => $estudiante->ci,
            'id_examen'     => $idExamen,
        ];

        $payloadBase64 = base64_encode(json_encode($payload));
        $firma = hash_hmac('sha256', $payloadBase64, config('app.key'));
        $qrToken = "{$payloadBase64}.{$firma}";

        return response()->json([
            'success' => true,
            'message' => 'Token QR generado exitosamente.',
            'data'    => [
                'qr_token'   => $qrToken,
                'estudiante' => [
                    'codigo_sis'      => $estudiante->codigo_sis,
                    'nombre_completo' => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                    'foto_url'        => $estudiante->foto_perfil_url,
                ],
            ],
        ], 200);
    }

    /**
     * Cambiar contraseña del estudiante autenticado
     * PUT /api/estudiante/cambiar-password
     */
    public function cambiarPassword(Request $request): JsonResponse
    {
        /** @var Estudiante $estudiante */
        $estudiante = $request->user();

        if (!$estudiante instanceof Estudiante) {
            return response()->json([
                'success' => false,
                'message' => 'Esta acción solo está permitida para estudiantes.',
            ], 403);
        }

        $request->validate([
            'current_password' => ['required', 'string'],
            'new_password'     => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'current_password.required' => 'Debe ingresar su contraseña actual.',
            'new_password.required'     => 'Debe ingresar la nueva contraseña.',
            'new_password.min'          => 'La nueva contraseña debe tener al menos 8 caracteres.',
            'new_password.confirmed'    => 'La confirmación de la nueva contraseña no coincide.',
        ]);

        // Verificar si la contraseña actual proporcionada es correcta
        if (!Hash::check($request->input('current_password'), $estudiante->password)) {
            return response()->json([
                'success'    => false,
                'message'    => 'La contraseña actual ingresada es incorrecta.',
                'error_type' => 'PASSWORD_ACTUAL_INCORRECTA',
            ], 422);
        }

        // Evitar que vuelva a usar la misma contraseña
        if (Hash::check($request->input('new_password'), $estudiante->password)) {
            return response()->json([
                'success'    => false,
                'message'    => 'La nueva contraseña no puede ser igual a la anterior.',
                'error_type' => 'MISMA_PASSWORD',
            ], 422);
        }

        // Actualizar contraseña con hash
        $estudiante->password = Hash::make($request->input('new_password'));
        $estudiante->save();

        $this->registrarAuditoria($request, 'ESTUDIANTE_PASSWORD_ACTUALIZADA', [
            'estudiante_id' => $estudiante->id,
            'codigo_sis'    => $estudiante->codigo_sis,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Contraseña actualizada exitosamente.',
        ], 200);
    }

}