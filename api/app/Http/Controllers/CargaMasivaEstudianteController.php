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
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Illuminate\Support\Facades\Hash;

class CargaMasivaEstudianteController extends Controller
{
    private const TAMANO_LOTE = 50;

    public function storePorExamen(CargaMasivaEstudiantesRequest $request, string $idExamen): JsonResponse
    {   
        set_time_limit(300);
        ini_set('memory_limit', '512M');
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

        // Cargar el archivo con PhpSpreadsheet
        $archivo = $request->file('archivo');
        try {
            $spreadsheet = IOFactory::load($archivo->getRealPath());
        } catch (\Throwable $e) {
            return response()->json([
                'message'    => 'No se pudo leer el archivo. Asegúrese de que sea un archivo Excel o CSV válido.',
                'error_type' => 'ARCHIVO_ILEGIBLE',
                'detalle'    => $e->getMessage(),
            ], 422);
        }

        // Pre-cargar identificadores existentes en BD
        $estudiantesBdPorSis = Estudiante::pluck('id', 'codigo_sis')->toArray();
        $inscritosEnEsteExamen = DB::table('estudiante_examen')
            ->where('id_examen', $idExamen)
            ->pluck('id_estudiante')
            ->flip()
            ->toArray();

        // Obtener prerrequisitos que ya tenga asignados el examen
        $prerrequisitosExamen = DB::table('prerrequisitos_examen')
            ->where('id_examen', $idExamen)
            ->pluck('id')
            ->toArray();

        $filasValidadas = [];
        $sisProcesados = [];
        $totalOmitidosPorDuplicado = 0;

        // Procesar hojas del archivo
        foreach ($spreadsheet->getAllSheets() as $hoja) {
            $maxFila = $hoja->getHighestRow();

            // Buscar celda '#' en las primeras 30 filas
            $filaCabecera = null;
            $colNumero = null;
            $limiteBusqueda = min(30, $maxFila);

            for ($f = 1; $f <= $limiteBusqueda; $f++) {
                for ($c = 'A'; $c <= 'G'; $c++) {
                    $valor = trim((string) $hoja->getCell("{$c}{$f}")->getValue());
                    if ($valor === '#') {
                        $filaCabecera = $f;
                        $colNumero = $c;
                        break 2;
                    }
                }
            }

            if (!$filaCabecera) {
                continue;
            }

            $colSis       = chr(ord($colNumero) + 1);
            $colApellidos = chr(ord($colNumero) + 2);
            $colNombres   = chr(ord($colNumero) + 3);
            $colEmail     = chr(ord($colNumero) + 4);

            $filasVaciasConsecutivas = 0;

            for ($fila = $filaCabecera + 1; $fila <= $maxFila; $fila++) {
                $rawSis       = trim((string) $hoja->getCell("{$colSis}{$fila}")->getValue());
                $rawApellidos = trim((string) $hoja->getCell("{$colApellidos}{$fila}")->getValue());
                $rawNombres   = trim((string) $hoja->getCell("{$colNombres}{$fila}")->getValue());
                $rawEmail     = trim((string) $hoja->getCell("{$colEmail}{$fila}")->getValue());

                // Detectar fila vacía
                if ($rawSis === '' && $rawApellidos === '' && $rawNombres === '') {
                    $filasVaciasConsecutivas++;
                    if ($filasVaciasConsecutivas >= 3) {
                        break;
                    }
                    continue;
                }

                $filasVaciasConsecutivas = 0;

                // Omitir filas sin formato SIS numérico válido
                if (!preg_match('/^[0-9]{6,12}$/', $rawSis)) {
                    continue;
                }

                // Se ignora y se pasa al siguiente (sin rollback) si ve duplicado
                if (isset($sisProcesados[$rawSis])) {
                    $totalOmitidosPorDuplicado++;
                    continue;
                }

                // Se ignora y se pasa al siguiente (sin rollback) si ve duplicado
                if (isset($estudiantesBdPorSis[$rawSis])) {
                    $idExistente = $estudiantesBdPorSis[$rawSis];
                    if (isset($inscritosEnEsteExamen[$idExistente])) {
                        $totalOmitidosPorDuplicado++;
                        continue;
                    }
                }

                // Separar apellidos
                $partesApellidos = preg_split('/\s+/', $rawApellidos);
                $apellidoPaterno = $partesApellidos[0] ?? '';
                $apellidoMaterno = count($partesApellidos) > 1 ? implode(' ', array_slice($partesApellidos, 1)) : null;

                $email = str_contains($rawEmail, '@') ? $rawEmail : "{$rawSis}@est.umss.edu";

                $sisProcesados[$rawSis] = true;
                $filasValidadas[] = [
                    'codigo_sis'          => $rawSis,
                    'nombre'              => $rawNombres,
                    'apellido_paterno'    => $apellidoPaterno,
                    'apellido_materno'    => $apellidoMaterno,
                    'email_institucional' => $email,
                ];
            }
        }

        // Si el archivo no tenía alumnos nuevos procesables
        if (count($filasValidadas) === 0) {
            return response()->json([
                'message'    => 'No se encontraron nuevos registros para inscribir. Es posible que todos los alumnos del archivo ya estuvieran registrados o duplicados.',
                'error_type' => 'SIN_REGISTROS_NUEVOS',
                'omitidos'   => $totalOmitidosPorDuplicado
            ], 422);
        }

        // FASE DE INSERCIÓN TRANSACCIONAL
        DB::beginTransaction();

        try {
            $loteNuevosEstudiantes = [];
            $lotePivote = [];
            $lotePrerrequisitos = [];

            foreach ($filasValidadas as $datos) {
                // Si existe en tabla estudiantes, actualiza datos
                if (isset($estudiantesBdPorSis[$datos['codigo_sis']])) {
                    $idEstudiante = $estudiantesBdPorSis[$datos['codigo_sis']];

                    Estudiante::where('id', $idEstudiante)->update([
                        'nombre'              => $datos['nombre'],
                        'apellido_paterno'    => $datos['apellido_paterno'],
                        'apellido_materno'    => $datos['apellido_materno'],
                        'email_institucional' => $datos['email_institucional'],
                        'updated_at'          => now(),
                    ]);
                } else {
                    // Si no existe en estudiantes, se prepara para crearlo
                    $idEstudiante = (string) Str::uuid();
                    $estudiantesBdPorSis[$datos['codigo_sis']] = $idEstudiante;

                    // Generar contraseña por defecto con cod sis + iniciales mayúsculas
                    $passwordPlano = Estudiante::generarPasswordPorDefecto(
                        $datos['codigo_sis'],
                        $datos['nombre'],
                        $datos['apellido_paterno'] ?? null,
                        $datos['apellido_materno'] ?? null
                    );

                    $loteNuevosEstudiantes[] = [
                        'id'                       => $idEstudiante,
                        'codigo_sis'               => $datos['codigo_sis'],
                        'ci'                       => null,
                        'ci_extension'             => null,
                        'nombre'                   => $datos['nombre'],
                        'apellido_paterno'         => $datos['apellido_paterno'],
                        'apellido_materno'         => $datos['apellido_materno'],
                        'email_institucional'      => $datos['email_institucional'],
                        'password'                 => Hash::make($passwordPlano),
                        'primer_acceso_completado' => false,
                        'activo'                   => true,
                        'created_at'               => now(),
                        'updated_at'               => now(),
                    ];
                }

                // habilitado por defecto
                $lotePivote[] = [
                    'id_examen'                 => $idExamen,
                    'id_estudiante'             => $idEstudiante,
                    'estado'                    => 'Habilitado', // <--- Habilitado por defecto
                    'motivo_estado'             => null,
                    'ajuste_manual'             => false,
                    'modificado_por_docente_id' => null,
                    'fecha_ajuste_manual'       => null,
                    'created_at'                => now(),
                    'updated_at'                => now(),
                ];

                // Crear prerrequisitos existentes en TRUE
                foreach ($prerrequisitosExamen as $idPrerreq) {
                    $lotePrerrequisitos[] = [
                        'id_prerrequisito'        => $idPrerreq,
                        'id_estudiante'           => $idEstudiante,
                        'cumplido'                => true,
                        'fecha_cumplimiento'      => now(),
                        'revisado_por_docente_id' => $user instanceof Docente ? $user->id : null,
                        'created_at'              => now(),
                        'updated_at'              => now(),
                    ];
                }

                // Inserción por lotes
                if (count($lotePivote) >= self::TAMANO_LOTE) {
                    if (!empty($loteNuevosEstudiantes)) {
                        Estudiante::insert($loteNuevosEstudiantes);
                        $loteNuevosEstudiantes = [];
                    }

                    DB::table('estudiante_examen')->insert($lotePivote);
                    $lotePivote = [];

                    if (!empty($lotePrerrequisitos)) {
                        DB::table('estudiante_prerrequisito')->insert($lotePrerrequisitos);
                        $lotePrerrequisitos = [];
                    }
                }
            }

            // Vaciar remanentes
            if (!empty($loteNuevosEstudiantes)) {
                Estudiante::insert($loteNuevosEstudiantes);
            }
            if (!empty($lotePivote)) {
                DB::table('estudiante_examen')->insert($lotePivote);
            }
            if (!empty($lotePrerrequisitos)) {
                DB::table('estudiante_prerrequisito')->insert($lotePrerrequisitos);
            }

            // Registrar auditoría
            $this->registrarAuditoria($request, 'CARGA_MASIVA_EXITOSA', [
                'examen_id'        => $idExamen,
                'total_insertados' => count($filasValidadas),
                'total_omitidos'   => $totalOmitidosPorDuplicado,
            ]);

            DB::commit();

            return response()->json([
                'success'          => true,
                'message'          => 'Carga completada con éxito.',
                'examen_id'        => $idExamen,
                'total_insertados' => count($filasValidadas),
                'total_omitidos'   => $totalOmitidosPorDuplicado,
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