<?php

namespace App\Http\Controllers;

use App\Http\Requests\CompletarDatosEstudianteRequest;
use App\Http\Requests\InscribirEstudianteExamenRequest;
use App\Http\Requests\StoreEstudianteRequest;
use App\Http\Requests\SubirFotoEstudianteRequest;
use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\LogAuditoria;
use App\Traits\DistribuyeAuxiliares;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class EstudianteController extends Controller
{
    use DistribuyeAuxiliares;

    public function index(Request $request): JsonResponse
    {
        $query = Estudiante::query();

        if ($request->boolean('solo_alumnos', false)) {
            $query->whereRaw('es_auxiliar is false');
        }

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

    public function buscar(Request $request): JsonResponse
    {
        $request->validate([
            'search'  => 'nullable|string|max:255',
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
            'target_type'   => 'estudiante',
            'target_id'     => $estudiante->id,
            'estudiante_id' => $estudiante->id,
            'codigo_sis'    => $estudiante->codigo_sis,
            'ci'            => $estudiante->ci,
        ]);

        return response()->json([
            'message'    => 'Estudiante registrado exitosamente.',
            'estudiante' => $estudiante,
        ], 201);
    }

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

    public function estudiantesPorExamen(Request $request, string $idExamen): JsonResponse
    {
        $examen = Examen::find($idExamen);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        $query = $examen->estudiantes()->withPivot('id_auxiliar', 'estado', 'motivo_estado', 'fecha_ingreso');

        if ($estado = $request->query('estado')) {
            $query->wherePivot('estado', $estado);
        }

        if ($idAuxiliar = $request->query('id_auxiliar')) {
            $query->wherePivot('id_auxiliar', $idAuxiliar);
        }

        return response()->json($query->paginate(15));
    }

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

        $estudianteExistente = Estudiante::where('codigo_sis', $data['codigo_sis'])->first();
        if ($estudianteExistente) {
            $esAuxiliarEnEsteExamen = DB::table('examen_auxiliar')
                ->where('id_examen', $examen->id)
                ->where('id_auxiliar', $estudianteExistente->id) 
                ->exists();

            if ($esAuxiliarEnEsteExamen) {
                return response()->json([
                    'success'    => false,
                    'message'    => 'Conflicto de roles: este usuario ya está asignado como auxiliar en este examen y no puede rendirlo.',
                    'error_type' => 'ROL_DUPLICADO_AUXILIAR',
                ], 422);
            }
        }

        $estadoPorDefecto = ($examen->prerrequisitos_count > 0) ? 'Inhabilitado' : 'Habilitado';
        $estado = $data['estado'] ?? $estadoPorDefecto;

        $inscripcionPrevia = $estudianteExistente ? DB::table('estudiante_examen')
            ->where('id_examen', $examen->id)
            ->where('id_estudiante', $estudianteExistente->id)
            ->first() : null;

        $estadoAnterior = $inscripcionPrevia ? $inscripcionPrevia->estado : null;

        $estudiante = DB::transaction(function () use ($examen, $data, $estado) {
            $estudiante = Estudiante::where('codigo_sis', $data['codigo_sis'])->first();

            if (!$estudiante) {
                $defaultPassword = Estudiante::generarPasswordPorDefecto(
                    $data['codigo_sis'],
                    $data['nombre'],
                    $data['apellido_paterno'] ?? null,
                    $data['apellido_materno'] ?? null
                );

                $estudiante = Estudiante::create([
                    'codigo_sis'               => $data['codigo_sis'],
                    'ci'                       => $data['ci'] ?? null,
                    'ci_extension'             => $data['ci_extension'] ?? null,
                    'nombre'                   => $data['nombre'],
                    'apellido_paterno'         => $data['apellido_paterno'],
                    'apellido_materno'         => $data['apellido_materno'] ?? null,
                    'email_institucional'      => $data['email_institucional'],
                    'password'                 => $defaultPassword,
                    'activo'                   => DB::raw('true'),
                    'es_auxiliar'              => DB::raw('false'),
                    'primer_acceso_completado' => DB::raw('false'),
                ]);
            } else {
                $estudiante->update([
                    'ci'                  => $data['ci'] ?? $estudiante->ci,
                    'ci_extension'        => $data['ci_extension'] ?? $estudiante->ci_extension,
                    'nombre'              => $data['nombre'],
                    'apellido_paterno'    => $data['apellido_paterno'],
                    'apellido_materno'    => $data['apellido_materno'] ?? null,
                    'email_institucional' => $data['email_institucional'],
                ]);
            }

            $examen->estudiantes()->syncWithoutDetaching([
                $estudiante->id => [
                    'estado'        => $estado,
                    'motivo_estado' => null,
                    'ajuste_manual' => DB::raw('false'),
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ],
            ]);

            return $estudiante;
        });

        $this->redistribuirEstudiantesExamen($examen->id);

        $this->registrarAuditoria($request, 'ESTUDIANTE_INSCRITO_EXAMEN', [
            'target_type'        => 'estudiante_examen',
            'target_id'          => $estudiante->id,
            'id_examen'          => $examen->id,
            'id_estudiante'      => $estudiante->id,
            'codigo_sis'         => $estudiante->codigo_sis,
            'valores_anteriores' => $estadoAnterior ? ['estado' => $estadoAnterior] : null,
            'valores_nuevos'     => ['estado' => $estado, 'ajuste_manual' => false],
        ]);

        return response()->json([
            'message'    => 'Estudiante vinculado al examen exitosamente y distribuido a su auxiliar.',
            'estudiante' => $estudiante->load(['examenes' => function ($q) use ($idExamen) {
                $q->where('examenes.id', $idExamen);
            }]),
        ], 200);
    }

    public function desvincularDeExamen(Request $request, string $idExamen, string $idEstudiante): JsonResponse
    {
        $examen = Examen::find($idExamen);

        if (!$examen) {
            return response()->json(['message' => 'Examen no encontrado.'], 404);
        }

        $pivote = DB::table('estudiante_examen')
            ->where('id_examen', $idExamen)
            ->where('id_estudiante', $idEstudiante)
            ->first();

        $examen->estudiantes()->detach($idEstudiante);

        $this->redistribuirEstudiantesExamen($examen->id);

        $this->registrarAuditoria($request, 'ESTUDIANTE_DESVINCULADO_EXAMEN', [
            'target_type'        => 'estudiante_examen',
            'target_id'          => $idEstudiante,
            'id_examen'          => $idExamen,
            'id_estudiante'      => $idEstudiante,
            'valores_anteriores' => $pivote ? [
                'estado'        => $pivote->estado,
                'motivo_estado' => $pivote->motivo_estado,
                'ajuste_manual' => filter_var($pivote->ajuste_manual, FILTER_VALIDATE_BOOLEAN),
            ] : null,
        ]);

        return response()->json(['message' => 'Estudiante desvinculado del examen correctamente y carga rebalanceada.']);
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

        $ciAnterior = $estudiante->ci;
        $ciExtAnterior = $estudiante->ci_extension;

        $estudiante->ci           = trim($data['ci']);
        $estudiante->ci_extension = !empty($data['ci_extension']) ? strtoupper(trim($data['ci_extension'])) : null;

        $accesoCompleto = (!empty($estudiante->ci) && !empty($estudiante->foto_perfil_url));
        $estudiante->primer_acceso_completado = $accesoCompleto ? DB::raw('true') : DB::raw('false');
        $estudiante->save();

        $this->registrarAuditoria($request, 'ESTUDIANTE_DATOS_COMPLETADOS', [
            'target_type'        => 'estudiante',
            'target_id'          => $estudiante->id,
            'valores_anteriores' => ['ci' => $ciAnterior, 'ci_extension' => $ciExtAnterior],
            'valores_nuevos'     => ['ci' => $estudiante->ci, 'ci_extension' => $estudiante->ci_extension],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Carnet de identidad registrado correctamente.',
            'data'    => [
                'id'                       => (string) $estudiante->id,
                'codigo_sis'               => (string) $estudiante->codigo_sis,
                'ci'                       => $estudiante->ci,
                'ci_extension'             => $estudiante->ci_extension,
                'foto_perfil_url'          => $estudiante->foto_perfil_url,
                'primer_acceso_completado' => $accesoCompleto,
            ],
        ], 200);
    }

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
            'foto' => [
                'required',
                'file',
                'image',
                'mimes:jpeg,png,jpg',
                'max:3072',
            ],
        ], [
            'foto.required' => 'Es obligatorio subir una fotografía facial.',
            'foto.image'    => 'El archivo debe ser una imagen válida.',
            'foto.mimes'    => 'Solo se permiten formatos JPG, JPEG o PNG.',
            'foto.max'      => 'La fotografía no debe superar los 3 MB de tamaño.',
        ]);

        $fotoAnterior = $estudiante->foto_perfil_url;

        if ($estudiante->foto_perfil_url && Storage::disk('public')->exists(str_replace('/storage/', '', $estudiante->foto_perfil_url))) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $estudiante->foto_perfil_url));
        }

        $archivo = $request->file('foto');
        $nombreArchivo = 'estudiante_' . $estudiante->id . '_' . time() . '.' . $archivo->getClientOriginalExtension();
        
        $rutaAlmacenada = $archivo->storeAs('fotos_estudiantes', $nombreArchivo, 'public');

        $estudiante->foto_perfil_url = '/storage/' . $rutaAlmacenada;

        $accesoCompleto = (!empty($estudiante->ci) && !empty($estudiante->foto_perfil_url));
        $estudiante->primer_acceso_completado = $accesoCompleto ? DB::raw('true') : DB::raw('false');
        $estudiante->save();

        $this->registrarAuditoria($request, 'ESTUDIANTE_FOTO_ACTUALIZADA', [
            'target_type'        => 'estudiante',
            'target_id'          => $estudiante->id,
            'valores_anteriores' => ['foto_perfil_url' => $fotoAnterior],
            'valores_nuevos'     => ['foto_perfil_url' => $estudiante->foto_perfil_url],
            'codigo_sis'         => $estudiante->codigo_sis,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Fotografía facial validada y guardada correctamente.',
            'data'    => [
                'id'                       => (string) $estudiante->id,
                'codigo_sis'               => (string) $estudiante->codigo_sis,
                'ci'                       => $estudiante->ci,
                'ci_extension'             => $estudiante->ci_extension,
                'foto_perfil_url'          => $estudiante->foto_perfil_url,
                'primer_acceso_completado' => $accesoCompleto,
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

        $esEstudiante = ($usuario instanceof Estudiante) 
            || strtolower($usuario->rol ?? '') === 'estudiante'
            || class_basename($usuario) === 'Estudiante';

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

        $estudiante = Estudiante::find($idEstudiante);

        if (!$estudiante || !$estudiante->foto_perfil_url) {
            return response()->json([
                'success' => false,
                'message' => 'Fotografía no encontrada.',
            ], 404);
        }

        $relPath = str_replace('/storage/', '', $estudiante->foto_perfil_url);
        if (!Storage::disk('public')->exists($relPath)) {
            return response()->json([
                'success' => false,
                'message' => 'El archivo físico no existe en el almacenamiento.',
            ], 404);
        }

        return response()->file(Storage::disk('public')->path($relPath));
    }

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

        if (empty($estudiante->ci) || empty($estudiante->foto_perfil_url)) {
            return response()->json([
                'success'    => false,
                'message'    => 'Debe completar su perfil obligatorio (Carnet de Identidad y Fotografía de perfil) antes de solicitar su código QR.',
                'error_type' => 'REGISTRO_INCOMPLETO',
            ], 403);
        }

        if (in_array(strtolower($examen->estado), ['terminado', 'finalizado', 'concluido'])) {
            return response()->json([
                'success'    => false,
                'message'    => 'El examen ya ha finalizado. No se permite generar credenciales QR.',
                'error_type' => 'EXAMEN_FINALIZADO',
            ], 403);
        }

        if ($examen->fecha && $examen->hora_fin) {
            $soloFecha = $examen->fecha instanceof \Carbon\Carbon 
                ? $examen->fecha->format('Y-m-d') 
                : explode(' ', (string) $examen->fecha)[0];

            $soloHoraFin = explode(' ', (string) $examen->hora_fin);
            $horaFinStr = end($soloHoraFin);

            $finExamen = \Carbon\Carbon::createFromFormat(
                'Y-m-d H:i:s', 
                "{$soloFecha} {$horaFinStr}", 
                'America/La_Paz'
            );
            $ahora = \Carbon\Carbon::now('America/La_Paz');

            if ($ahora->gt($finExamen)) {
                return response()->json([
                    'success'    => false,
                    'message'    => 'El horario del examen ha concluido. No se puede generar el código QR.',
                    'error_type' => 'HORARIO_EXPIRADO',
                ], 403);
            }

            $timestampExpiracion = $finExamen->timestamp;
        } else {
            $timestampExpiracion = now()->addHours(2)->timestamp;
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

        if (!empty($inscripcion->fecha_ingreso)) {
            return response()->json([
                'success'    => false,
                'message'    => 'Ya se registró su ingreso al examen. Su código QR ha quedado sin efecto.',
                'error_type' => 'INGRESO_PREVIO_REGISTRADO',
            ], 403);
        }

        if (strtolower($inscripcion->estado ?? '') !== 'habilitado') {
            return response()->json([
                'success'       => false,
                'message'       => 'No se puede generar el código QR: el estudiante no está habilitado.',
                'error_type'    => 'ESTUDIANTE_INHABILITADO',
                'motivo_estado' => $inscripcion->motivo_estado ?? null,
            ], 403);
        }

        $request->validate([
            'foto_verificacion' => [
                'required',
                'file',
                'image',
                'mimes:jpeg,png,jpg',
                'max:5120',
            ],
        ], [
            'foto_verificacion.required' => 'Es obligatorio capturar una fotografía facial para verificar su identidad.',
            'foto_verificacion.image'    => 'El archivo de verificación debe ser una imagen válida.',
            'foto_verificacion.mimes'    => 'La captura debe estar en formato JPG, JPEG o PNG.',
            'foto_verificacion.max'      => 'La fotografía de captura no debe superar los 5 MB.',
        ]);

        $rutaRelativaPerfil = str_replace('/storage/', '', $estudiante->foto_perfil_url);

        if (!Storage::disk('public')->exists($rutaRelativaPerfil)) {
            return response()->json([
                'success'    => false,
                'message'    => 'No se encuentra su fotografía de perfil oficial registrada. Vuelva a subir su foto de perfil.',
                'error_type' => 'FOTO_PERFIL_INEXISTENTE',
            ], 422);
        }

        $archivoCaptura = $request->file('foto_verificacion');
        $rutaCaptura = $archivoCaptura->storeAs(
            'fotos_verificacion_qr',
            'qr_token_' . $estudiante->id . '_' . $idExamen . '_' . time() . '.' . $archivoCaptura->getClientOriginalExtension(),
            'public'
        );

        $rutaFotoPerfil = Storage::disk('public')->path($rutaRelativaPerfil);
        $rutaFotoCapturada = Storage::disk('public')->path($rutaCaptura);

        $coincide = $this->compararFotografiasFaciales($rutaFotoPerfil, $rutaFotoCapturada);

        if (Storage::disk('public')->exists($rutaCaptura)) {
            Storage::disk('public')->delete($rutaCaptura);
        }

        if (!$coincide) {
            $this->registrarAuditoria($request, 'INTENTO_QR_FALLO_FACIAL', [
                'estudiante_id' => $estudiante->id,
                'examen_id'     => $idExamen,
                'codigo_sis'    => $estudiante->codigo_sis,
            ]);

            return response()->json([
                'success'    => false,
                'message'    => 'La fotografía capturada no coincide con la foto oficial de su perfil.',
                'error_type' => 'BIOMETRIA_NO_COINCIDE',
            ], 403);
        }

        $payload = [
            'id_estudiante' => $estudiante->id,
            'codigo_sis'    => $estudiante->codigo_sis,
            'ci'            => $estudiante->ci,
            'id_examen'     => $idExamen,
            'timestamp'     => now()->timestamp,
            'expira_at'     => $timestampExpiracion,
        ];

        $payloadBase64 = base64_encode(json_encode($payload));
        $firma = hash_hmac('sha256', $payloadBase64, config('app.key'));
        $qrToken = "{$payloadBase64}.{$firma}";

        $this->registrarAuditoria($request, 'QR_GENERADO_EXITOSO', [
            'estudiante_id' => $estudiante->id,
            'examen_id'     => $idExamen,
            'codigo_sis'    => $estudiante->codigo_sis,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Identidad verificada exitosamente. Token QR generado.',
            'data'    => [
                'qr_token'   => $qrToken,
                'expira_at'  => $timestampExpiracion,
                'estudiante' => [
                    'codigo_sis'      => $estudiante->codigo_sis,
                    'nombre_completo' => trim("{$estudiante->nombre} {$estudiante->apellido_paterno} {$estudiante->apellido_materno}"),
                    'foto_url'        => url('/api/estudiante/foto/' . $estudiante->id),
                ],
            ],
        ], 200);
    }

    private function compararFotografiasFaciales(string $rutaPerfil, string $rutaCaptura): bool
    {
        if (!file_exists($rutaPerfil) || !file_exists($rutaCaptura)) {
            return false;
        }

        $imgPerfil = @imagecreatefromstring((string) file_get_contents($rutaPerfil));
        $imgCaptura = @imagecreatefromstring((string) file_get_contents($rutaCaptura));

        if (!$imgPerfil || !$imgCaptura) {
            return false;
        }

        $tamanio = 32;
        $matrizPerfil = imagecreatetruecolor($tamanio, $tamanio);
        $matrizCaptura = imagecreatetruecolor($tamanio, $tamanio);

        imagecopyresampled($matrizPerfil, $imgPerfil, 0, 0, 0, 0, $tamanio, $tamanio, imagesx($imgPerfil), imagesy($imgPerfil));
        imagecopyresampled($matrizCaptura, $imgCaptura, 0, 0, 0, 0, $tamanio, $tamanio, imagesx($imgCaptura), imagesy($imgCaptura));

        $diferenciaTotal = 0;
        $totalPixeles = $tamanio * $tamanio;

        for ($x = 0; $x < $tamanio; $x++) {
            for ($y = 0; $y < $tamanio; $y++) {
                $rgbP = imagecolorat($matrizPerfil, $x, $y);
                $rP = ($rgbP >> 16) & 0xFF;
                $gP = ($rgbP >> 8) & 0xFF;
                $bP = $rgbP & 0xFF;

                $rgbC = imagecolorat($matrizCaptura, $x, $y);
                $rC = ($rgbC >> 16) & 0xFF;
                $gC = ($rgbC >> 8) & 0xFF;
                $bC = $rgbC & 0xFF;

                $distancia = sqrt(pow($rP - $rC, 2) + pow($gP - $gC, 2) + pow($bP - $bC, 2));
                $diferenciaTotal += $distancia;
            }
        }

        imagedestroy($imgPerfil);
        imagedestroy($imgCaptura);
        imagedestroy($matrizPerfil);
        imagedestroy($matrizCaptura);

        $diferenciaPromedio = $diferenciaTotal / $totalPixeles;

        return $diferenciaPromedio <= 65.0;
    }

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

        if (!Hash::check($request->input('current_password'), $estudiante->password)) {
            return response()->json([
                'success'    => false,
                'message'    => 'La contraseña actual ingresada es incorrecta.',
                'error_type' => 'PASSWORD_ACTUAL_INCORRECTA',
            ], 422);
        }

        if (Hash::check($request->input('new_password'), $estudiante->password)) {
            return response()->json([
                'success'    => false,
                'message'    => 'La nueva contraseña no puede ser igual a la anterior.',
                'error_type' => 'MISMA_PASSWORD',
            ], 422);
        }

        $estudiante->password = Hash::make($request->input('new_password'));
        $estudiante->save();

        $this->registrarAuditoria($request, 'ESTUDIANTE_PASSWORD_ACTUALIZADA', [
            'target_type'   => 'estudiante',
            'target_id'     => $estudiante->id,
            'estudiante_id' => $estudiante->id,
            'codigo_sis'    => $estudiante->codigo_sis,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Contraseña actualizada exitosamente.',
        ], 200);
    }

    public function toggleAuxiliar(Request $request, string $id): JsonResponse
    {
        $estudiante = Estudiante::findOrFail($id);
        $estadoAnterior = (bool) $estudiante->es_auxiliar;
        $nuevoEstado = !$estadoAnterior;

        $estudiante->es_auxiliar = $nuevoEstado ? DB::raw('true') : DB::raw('false');
        $estudiante->save();

        $this->registrarAuditoria($request, 'ESTUDIANTE_ROL_AUXILIAR_MODIFICADO', [
            'target_type'        => 'estudiante',
            'target_id'          => $estudiante->id,
            'valores_anteriores' => ['es_auxiliar' => $estadoAnterior],
            'valores_nuevos'     => ['es_auxiliar' => $nuevoEstado],
        ]);

        return response()->json([
            'success'     => true,
            'message'     => $nuevoEstado ? 'Estudiante asignado como auxiliar.' : 'Rol de auxiliar retirado.',
            'es_auxiliar' => $nuevoEstado,
        ]);
    }

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
}