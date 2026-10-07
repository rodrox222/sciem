<?php

namespace App\Http\Controllers;

use App\Http\Requests\CargaMasivaEstudiantesRequest;
use App\Models\Admin;
use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\LogAuditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CargaMasivaEstudianteController extends Controller
{
    private const TAMANO_LOTE = 50;

    public function storePorExamen(CargaMasivaEstudiantesRequest $request, string $idExamen): JsonResponse
    {
        // Validar existencia del examen
        $examen = Examen::find($idExamen);
        if (!$examen) {
            return response()->json([
                'message'    => 'El examen especificado no existe.',
                'error_type' => 'EXAMEN_NO_ENCONTRADO'
            ], 404);
        }

        // Control de pertenencia del docente
        $user = $request->user();
        if ($user instanceof Docente && $examen->id_docente !== $user->id) {
            return response()->json([
                'message'    => 'Acceso denegado: no es el docente titular de esta evaluación.',
                'error_type' => 'DOCENTE_NO_AUTORIZADO'
            ], 403);
        }

        $archivo = $request->file('archivo');
        $handle = fopen($archivo->getRealPath(), 'r');

        if ($handle === false) {
            return response()->json([
                'message'    => 'No se pudo abrir el archivo CSV para su lectura.',
                'error_type' => 'ARCHIVO_ILEGIBLE'
            ], 422);
        }

        // Validar cabecera esperada
        $cabecera = fgetcsv($handle, 0, ',');
        if (!$cabecera) {
            fclose($handle);
            return response()->json([
                'message'    => 'El archivo CSV proporcionado está vacío.',
                'error_type' => 'ARCHIVO_VACIO'
            ], 422);
        }

        $cabeceraLimpia = array_map(function ($col) {
            return trim(preg_replace('/[\x00-\x1F\x80-\xFF]/', '', strtolower($col)));
        }, $cabecera);

        $cabeceraEsperada = ['codigo_sis', 'ci', 'ci_extension', 'nombre', 'apellido_paterno', 'apellido_materno', 'email_institucional'];
        if (array_slice($cabeceraLimpia, 0, count($cabeceraEsperada)) !== $cabeceraEsperada) {
            fclose($handle);
            return response()->json([
                'message'           => 'La cabecera del archivo CSV no coincide con el formato oficial.',
                'error_type'        => 'CABECERA_INVALIDA',
                'cabecera_recibida' => $cabecera,
                'formato_esperado'  => implode(',', $cabeceraEsperada),
            ], 422);
        }

        // Pre-cargar identificadores existentes en BD
        $estudiantesBdPorSis = Estudiante::pluck('id', 'codigo_sis')->toArray();
        $inscritosEnEsteExamen = DB::table('estudiante_examen')
            ->where('id_examen', $idExamen)
            ->pluck('id_estudiante')
            ->flip()
            ->toArray();

        $sisEnArchivo = [];
        $emailsEnArchivo = [];

        $filasValidadas = [];
        $errores = [];
        $numeroFila = 1;

        // FASE 1: Validación fila por fila
        while (($fila = fgetcsv($handle, 0, ',')) !== false) {
            $numeroFila++;

            if (count(array_filter($fila)) === 0) {
                continue;
            }

            $registro = [
                'codigo_sis'          => isset($fila[0]) ? trim($fila[0]) : '',
                'ci'                  => isset($fila[1]) ? trim($fila[1]) : '',
                'ci_extension'        => isset($fila[2]) && trim($fila[2]) !== '' ? trim($fila[2]) : null,
                'nombre'              => isset($fila[3]) ? trim($fila[3]) : '',
                'apellido_paterno'    => isset($fila[4]) ? trim($fila[4]) : '',
                'apellido_materno'    => isset($fila[5]) && trim($fila[5]) !== '' ? trim($fila[5]) : null,
                'email_institucional' => isset($fila[6]) ? trim($fila[6]) : '',
            ];

            // Reglas de formato
            $validador = Validator::make($registro, [
                'codigo_sis'          => ['required', 'string', 'max:20'],
                'ci'                  => ['required', 'string', 'max:20'],
                'ci_extension'        => ['nullable', 'string', 'max:10'],
                'nombre'              => ['required', 'string', 'max:100'],
                'apellido_paterno'    => ['required', 'string', 'max:100'],
                'apellido_materno'    => ['nullable', 'string', 'max:100'],
                'email_institucional' => ['required', 'string', 'max:150', 'regex:/^[a-zA-Z0-9._%+-]+@est\.umss\.edu$/i'],
            ], [
                'codigo_sis.required'          => 'El código SIS es obligatorio.',
                'ci.required'                  => 'El CI es obligatorio.',
                'nombre.required'              => 'El nombre es obligatorio.',
                'apellido_paterno.required'    => 'El apellido paterno es obligatorio.',
                'email_institucional.regex'    => 'El correo debe terminar en @est.umss.edu.',
                'email_institucional.required' => 'El correo institucional es obligatorio.',
            ]);

            if ($validador->fails()) {
                $errores[] = [
                    'fila'          => $numeroFila,
                    'tipo_error'    => 'FORMATO_INVALIDO',
                    'identificador' => $registro['codigo_sis'] ?: "Línea {$numeroFila}",
                    'motivo'        => implode(' | ', $validador->errors()->all()),
                ];
                continue;
            }

            // Duplicados dentro del mismo CSV
            if (isset($sisEnArchivo[$registro['codigo_sis']])) {
                $errores[] = [
                    'fila'          => $numeroFila,
                    'tipo_error'    => 'DUPLICADO_EN_ARCHIVO',
                    'identificador' => $registro['codigo_sis'],
                    'motivo'        => "El código SIS '{$registro['codigo_sis']}' aparece duplicado en el archivo (repetido de la fila {$sisEnArchivo[$registro['codigo_sis']]}).",
                ];
                continue;
            }

            if (isset($emailsEnArchivo[$registro['email_institucional']])) {
                $errores[] = [
                    'fila'          => $numeroFila,
                    'tipo_error'    => 'DUPLICADO_EN_ARCHIVO',
                    'identificador' => $registro['email_institucional'],
                    'motivo'        => "El correo '{$registro['email_institucional']}' aparece repetido en el archivo.",
                ];
                continue;
            }

            // Duplicados contra el examen actual
            if (isset($estudiantesBdPorSis[$registro['codigo_sis']])) {
                $idEstudianteExistente = $estudiantesBdPorSis[$registro['codigo_sis']];
                if (isset($inscritosEnEsteExamen[$idEstudianteExistente])) {
                    $errores[] = [
                        'fila'          => $numeroFila,
                        'tipo_error'    => 'YA_INSCRITO_EN_EXAMEN',
                        'identificador' => $registro['codigo_sis'],
                        'motivo'        => "El estudiante con SIS '{$registro['codigo_sis']}' ya se encuentra inscrito en este examen.",
                    ];
                    continue;
                }
            }

            $sisEnArchivo[$registro['codigo_sis']] = $numeroFila;
            $emailsEnArchivo[$registro['email_institucional']] = $numeroFila;

            $filasValidadas[] = $registro;
        }

        fclose($handle);

        // Si hubo un solo error, se rechaza la carga completa
        if (count($errores) > 0) {
            return response()->json([
                'message'       => 'Se encontraron conflictos en el archivo. La operación fue cancelada y ningún estudiante fue agregado.',
                'error_type'    => 'CONFLICTOS_EN_CARGA',
                'total_filas'   => $numeroFila - 1,
                'total_errores' => count($errores),
                'errores'       => $errores,
            ], 422);
        }

        // FASE 2: Inserción por lotes con transacción SQL
        DB::beginTransaction();

        try {
            $loteNuevosEstudiantes = [];
            $lotePivote = [];

            foreach ($filasValidadas as $datos) {
                if (isset($estudiantesBdPorSis[$datos['codigo_sis']])) {
                    $idEstudiante = $estudiantesBdPorSis[$datos['codigo_sis']];
                    
                    Estudiante::where('id', $idEstudiante)->update([
                        'ci'                  => $datos['ci'],
                        'ci_extension'        => $datos['ci_extension'],
                        'nombre'              => $datos['nombre'],
                        'apellido_paterno'    => $datos['apellido_paterno'],
                        'apellido_materno'    => $datos['apellido_materno'],
                        'email_institucional' => $datos['email_institucional'],
                        'updated_at'          => now(),
                    ]);
                } else {
                    $idEstudiante = (string) Str::uuid();
                    $estudiantesBdPorSis[$datos['codigo_sis']] = $idEstudiante;

                    $loteNuevosEstudiantes[] = [
                        'id'                  => $idEstudiante,
                        'codigo_sis'          => $datos['codigo_sis'],
                        'ci'                  => $datos['ci'],
                        'ci_extension'        => $datos['ci_extension'],
                        'nombre'              => $datos['nombre'],
                        'apellido_paterno'    => $datos['apellido_paterno'],
                        'apellido_materno'    => $datos['apellido_materno'],
                        'email_institucional' => $datos['email_institucional'],
                        'activo'              => true,
                        'created_at'          => now(),
                        'updated_at'          => now(),
                    ];
                }

                $lotePivote[] = [
                    'id_examen'                 => $idExamen,
                    'id_estudiante'             => $idEstudiante,
                    'estado'                    => 'Inhabilitado',
                    'motivo_estado'             => null,
                    'ajuste_manual'             => false,
                    'modificado_por_docente_id' => null,
                    'fecha_ajuste_manual'       => null,
                    'created_at'                => now(),
                    'updated_at'                => now(),
                ];

                // Procesamiento por lotes de 50
                if (count($lotePivote) >= self::TAMANO_LOTE) {
                    if (!empty($loteNuevosEstudiantes)) {
                        Estudiante::insert($loteNuevosEstudiantes);
                        $loteNuevosEstudiantes = [];
                    }

                    DB::table('estudiante_examen')->insert($lotePivote);
                    $lotePivote = [];
                }
            }

            // Remanente
            if (!empty($loteNuevosEstudiantes)) {
                Estudiante::insert($loteNuevosEstudiantes);
            }
            if (!empty($lotePivote)) {
                DB::table('estudiante_examen')->insert($lotePivote);
            }

            $this->registrarAuditoria($request, 'CARGA_MASIVA_EXITOSA', [
                'examen_id'        => $idExamen,
                'total_insertados' => count($filasValidadas),
            ]);

            DB::commit();

            return response()->json([
                'message'          => 'Carga masiva completada con éxito. Todos los estudiantes fueron asignados al examen.',
                'examen_id'        => $idExamen,
                'total_insertados' => count($filasValidadas),
            ], 201);

        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'message'    => 'Error interno de base de datos durante la inserción. Transacción revertida.',
                'error_type' => 'FALLO_TRANSACCION_SQL',
                'detalle'    => $e->getMessage(),
            ], 500);
        }
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
            'modulo'            => 'CARGA_MASIVA',
            'accion'            => $accion,
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}