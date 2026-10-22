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
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
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
     * Buscar estudiantes por nombre, código SIS, CI o QR (HU15).
     */
    public function buscar(Request $request): JsonResponse
    {
        $request->validate([
            'search' => 'nullable|string|max:255',
            'qr_data' => 'nullable|string|max:2000',
        ]);

        $search = trim((string) $request->query('search', ''));
        $qrData = $request->query('qr_data');

        if ($qrData !== null) {
            $datosQr = json_decode($qrData, true);

            if (!is_array($datosQr) || empty($datosQr['sis'])) {
                return response()->json([
                    'message' => 'El QR no es válido o no contiene el código SIS.',
                ], 422);
            }

            $search = trim((string) $datosQr['sis']);
        }

        if ($search === '') {
            return response()->json([
                'message' => 'Debes proporcionar search o qr_data.',
            ], 422);
        }

        $estudiantes = Estudiante::query()
            ->where(function ($query) use ($search) {
                $query->where('nombre', 'ilike', "%{$search}%")
                    ->orWhere('apellido_paterno', 'ilike', "%{$search}%")
                    ->orWhere('apellido_materno', 'ilike', "%{$search}%")
                    ->orWhere('codigo_sis', 'ilike', "%{$search}%")
                    ->orWhere('ci', 'ilike', "%{$search}%");
            })
            ->orderBy('apellido_paterno', 'asc')
            ->limit(20)
            ->get();

        return response()->json([
            'estudiantes' => $estudiantes,
        ]);
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

        $esAuxiliar = DB::table('examen_auxiliar')
            ->where('id_examen', $examen->id)
            ->where('id_auxiliar', $data['estudiante_id'] ?? $estudiante->id) 
            ->exists();

        if ($esAuxiliar) {
            return response()->json([
                'success'    => false,
                'message'    => 'Conflicto de roles: este estudiante ya está designado como auxiliar para este examen.',
                'error_type' => 'ROL_DUPLICADO_AUXILIAR',
            ], 422);
        }

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

        // Rechazar si intenta confirmar sin haber guardado su fotografía previamente
        if (empty($estudiante->foto_perfil_url)) {
            return response()->json([
                'success'    => false,
                'message'    => 'Debe capturar y registrar su fotografía de perfil antes de completar el registro inicial.',
                'error_type' => 'FOTO_REQUERIDA'
            ], 422);
        }

        $data = $request->validated();

        $estudiante->ci                     = trim($data['ci']);
        $estudiante->ci_extension           = !empty($data['ci_extension']) ? strtoupper(trim($data['ci_extension'])) : null;
        $estudiante->primer_acceso_completado = true; // Criterio 2 y 3
        $estudiante->save();

        return response()->json([
            'success' => true,
            'message' => 'Perfil completado exitosamente.',
            'data'    => [
                'id'                       => $estudiante->id,
                'codigo_sis'               => $estudiante->codigo_sis,
                'ci'                       => $estudiante->ci,
                'ci_extension'             => $estudiante->ci_extension,
                'foto_url'                 => $estudiante->foto_perfil_url ? url('/api/estudiante/foto/' . $estudiante->id) : null,
                'primer_acceso_completado' => (bool) $estudiante->primer_acceso_completado,
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

        //Límite de formato (JPG, PNG) y tamaño (máximo 3 MB)
        $request->validate([
            'foto' => [
                'required',
                'file',
                'image',
                'mimes:jpeg,png,jpg',
                'max:3072', // 3 MB máximo
            ],
        ], [
            'foto.required' => 'Es obligatorio subir una fotografía facial.',
            'foto.image'    => 'El archivo debe ser una imagen válida.',
            'foto.mimes'    => 'Solo se permiten formatos JPG, JPEG o PNG.',
            'foto.max'      => 'La fotografía no debe superar los 3 MB de tamaño.',
        ]);

        // Si el estudiante ya tenía una foto anterior guardada, la eliminamos para no saturar el disco
        if ($estudiante->foto_perfil_url && Storage::disk('local')->exists($estudiante->foto_perfil_url)) {
            Storage::disk('local')->delete($estudiante->foto_perfil_url);
        }

        // Guardar en storage/app/fotos_estudiantes (Ruta NO pública)
        $archivo = $request->file('foto');
        $nombreArchivo = 'estudiante_' . $estudiante->id . '_' . time() . '.' . $archivo->getClientOriginalExtension();
        $rutaAlmacenada = $archivo->storeAs('fotos_estudiantes', $nombreArchivo, 'local');

        $estudiante->foto_perfil_url = $rutaAlmacenada;

        $estudiante->primer_acceso_completado = !empty($estudiante->ci) && !empty($estudiante->foto_perfil_url);
        $estudiante->save();

        $this->registrarAuditoria($request, 'ESTUDIANTE_FOTO_ACTUALIZADA', [
            'estudiante_id' => $estudiante->id,
            'codigo_sis'    => $estudiante->codigo_sis,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Fotografía facial validada y guardada localmente.',
            'data'    => [
                'id'                       => $estudiante->id,
                'codigo_sis'               => $estudiante->codigo_sis,
                'ci'                       => $estudiante->ci,
                'ci_extension'             => $estudiante->ci_extension,
                'foto_perfil_url'          => url('/api/estudiante/foto/' . $estudiante->id),
                'primer_acceso_completado' => (bool) $estudiante->primer_acceso_completado,
            ],
        ], 200);
    }

    public function verFoto(Request $request, string $idEstudiante): BinaryFileResponse|JsonResponse
    {
        $usuario = $request->user();

        if (!$usuario) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado.',
            ], 401);
        }

        // Determinar el rol de manera infalible
        $esEstudiante = ($usuario instanceof Estudiante) 
            || strtolower($usuario->rol ?? '') === 'estudiante'
            || class_basename($usuario) === 'Estudiante';

        // si es estudiante, SOLO puede ver SU propia foto
        if ($esEstudiante) {
            $idAutenticado = strtolower(trim((string) $usuario->id));
            $idSolicitado  = strtolower(trim($idEstudiante));

            if ($idAutenticado !== $idSolicitado) {
                return response()->json([
                    'success' => false,
                    'message' => 'Acceso denegado: no puedes acceder a la fotografía de otro estudiante.',
                ], 403);
            }
        }

        // Si es Docente, Auxiliar o Admin, o el estudiante dueño: buscar y entregar
        $estudiante = Estudiante::find($idEstudiante);

        if (!$estudiante || !$estudiante->foto_perfil_url) {
            return response()->json([
                'success' => false,
                'message' => 'Fotografía no encontrada.',
            ], 404);
        }

        if (!Storage::disk('local')->exists($estudiante->foto_perfil_url)) {
            return response()->json([
                'success' => false,
                'message' => 'El archivo físico no existe en el servidor local.',
            ], 404);
        }

        $rutaFisica = Storage::disk('local')->path($estudiante->foto_perfil_url);

        return response()->file($rutaFisica);
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

        // enviar la fotografía tomada en ese instante
        // Límite de formato y tamaño (JPG, PNG, máx 3 MB)
        $request->validate([
            'foto_verificacion' => [
                'required',
                'file',
                'image',
                'mimes:jpeg,png,jpg',
                'max:3072',
            ],
        ], [
            'foto_verificacion.required' => 'Debe capturar su fotografía facial para generar el código QR.',
            'foto_verificacion.image'    => 'El archivo enviado debe ser una imagen válida.',
            'foto_verificacion.mimes'    => 'Solo se permiten formatos JPG, JPEG o PNG.',
            'foto_verificacion.max'      => 'La fotografía no debe superar los 3 MB de tamaño.',
        ]);

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

        // Verificar que haya completado su registro previo
        if (!$estudiante->primer_acceso_completado) {
            return response()->json([
                'success'    => false,
                'message'    => 'Debe registrar su Carnet de Identidad y foto de perfil inicial antes de generar su QR.',
                'error_type' => 'REGISTRO_INCOMPLETO',
            ], 403);
        }

        // Verificar que esté inscrito en el examen
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

        // Verificar si está inhabilitado
        if ($inscripcion->estado !== 'Habilitado') {
            return response()->json([
                'success'       => false,
                'message'       => 'No se puede generar el código QR: el estudiante no está habilitado.',
                'error_type'    => 'ESTUDIANTE_INHABILITADO',
                'motivo_estado' => $inscripcion->motivo_estado,
            ], 403);
        }

        // Guardar la foto de verificación en storage local seguro
        $archivo = $request->file('foto_verificacion');
        $nombreFotoQr = 'qr_token_' . $estudiante->id . '_' . $idExamen . '_' . time() . '.' . $archivo->getClientOriginalExtension();
        $rutaGuardada = $archivo->storeAs('fotos_verificacion_qr', $nombreFotoQr, 'local');

        // Generar Payload y Token firmado con HMAC 
        $payload = [
            'id_estudiante' => $estudiante->id,
            'codigo_sis'    => $estudiante->codigo_sis,
            'ci'            => $estudiante->ci,
            'id_examen'     => $idExamen,
            'timestamp'     => now()->timestamp,
        ];

        $payloadBase64 = base64_encode(json_encode($payload));
        $firma = hash_hmac('sha256', $payloadBase64, config('app.key'));
        $qrToken = "{$payloadBase64}.{$firma}";

        return response()->json([
            'success' => true,
            'message' => 'Token QR generado exitosamente tras confirmar la fotografía.',
            'data'    => [
                'qr_token'   => $qrToken,
                'estudiante' => [
                    'codigo_sis'      => $estudiante->codigo_sis,
                    'nombre_completo' => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                    'foto_url'        => $estudiante->foto_perfil_url ? url('/api/estudiante/foto/' . $estudiante->id) : null,
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