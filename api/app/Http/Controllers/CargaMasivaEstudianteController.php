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

        // Cargar el archivo con PhpSpreadsheet (soporta .xlsx, .xls y .csv)
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

        $filasValidadas = [];
        $sisProcesados = [];
        $errores = [];

        // Recorrer hoja por hoja
        foreach ($spreadsheet->getAllSheets() as $hoja) {
            $nombreHoja = $hoja->getTitle();
            $maxFila = $hoja->getHighestRow();

            // Buscar la celda con exactamente '#' en las primeras 30 filas
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

            // Si la hoja no tiene la cabecera '#' esperada, continuar con la siguiente hoja
            if (!$filaCabecera) {
                continue;
            }

            // Mapeo relativo de columnas a partir de '#'
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
                    // Condición de parada: 3 líneas consecutivas vacías
                    if ($filasVaciasConsecutivas >= 3) {
                        break;
                    }
                    continue;
                }

                $filasVaciasConsecutivas = 0;

                // Omitir separadores u otras filas que no tengan código SIS numérico
                if (!preg_match('/^[0-9]{6,12}$/', $rawSis)) {
                    continue;
                }

                // Validar duplicados dentro del mismo archivo
                if (isset($sisProcesados[$rawSis])) {
                    $errores[] = [
                        'hoja'          => $nombreHoja,
                        'fila'          => $fila,
                        'identificador' => $rawSis,
                        'motivo'        => "El estudiante con SIS '{$rawSis}' aparece duplicado en el archivo.",
                    ];
                    continue;
                }

                // Validar si ya está inscrito en el examen
                if (isset($estudiantesBdPorSis[$rawSis])) {
                    $idExistente = $estudiantesBdPorSis[$rawSis];
                    if (isset($inscritosEnEsteExamen[$idExistente])) {
                        $errores[] = [
                            'hoja'          => $nombreHoja,
                            'fila'          => $fila,
                            'identificador' => $rawSis,
                            'motivo'        => "El estudiante con SIS '{$rawSis}' ya se encuentra inscrito en este examen.",
                        ];
                        continue;
                    }
                }

                // Separar apellidos (Paterno y Materno)
                $partesApellidos = preg_split('/\s+/', $rawApellidos);
                $apellidoPaterno = $partesApellidos[0] ?? '';
                $apellidoMaterno = count($partesApellidos) > 1 ? implode(' ', array_slice($partesApellidos, 1)) : null;

                // Formatear correo institucional si viene incompleto
                $email = str_contains($rawEmail, '@') ? $rawEmail : "{$rawSis}@est.umss.edu";

                $registro = [
                    'codigo_sis'          => $rawSis,
                    'ci'                  => null,
                    'ci_extension'        => null,
                    'nombre'              => $rawNombres,
                    'apellido_paterno'    => $apellidoPaterno,
                    'apellido_materno'    => $apellidoMaterno,
                    'email_institucional' => $email,
                ];

                $sisProcesados[$rawSis] = true;
                $filasValidadas[] = $registro;
            }
        }

        // FASE DE VALIDACIÓN ATÓMICA: Si se detectó algún conflicto, se rechaza todo
        if (count($errores) > 0) {
            return response()->json([
                'message'       => 'Se encontraron conflictos en el archivo. La operación fue cancelada.',
                'error_type'    => 'CONFLICTOS_EN_CARGA',
                'total_errores' => count($errores),
                'errores'       => $errores,
            ], 422);
        }

        if (count($filasValidadas) === 0) {
            return response()->json([
                'message'    => 'No se encontraron registros de estudiantes válidos en el archivo.',
                'error_type' => 'SIN_REGISTROS_VALIDOS',
            ], 422);
        }

        // FASE DE INSERCIÓN: Solo se ejecuta si NO hubo ningún error en todo el archivo
        DB::beginTransaction();

        try {
            $loteNuevosEstudiantes = [];
            $lotePivote = [];

            foreach ($filasValidadas as $datos) {
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
                    $idEstudiante = (string) Str::uuid();
                    $estudiantesBdPorSis[$datos['codigo_sis']] = $idEstudiante;

                    $loteNuevosEstudiantes[] = [
                        'id'                  => $idEstudiante,
                        'codigo_sis'          => $datos['codigo_sis'],
                        'ci'                  => null,
                        'ci_extension'        => null,
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
                    'motivo_estado'             => 'No cumple con los prerrequisitos asignados.',
                    'ajuste_manual'             => false,
                    'modificado_por_docente_id' => null,
                    'fecha_ajuste_manual'       => null,
                    'created_at'                => now(),
                    'updated_at'                => now(),
                ];

                if (count($lotePivote) >= self::TAMANO_LOTE) {
                    if (!empty($loteNuevosEstudiantes)) {
                        Estudiante::insert($loteNuevosEstudiantes);
                        $loteNuevosEstudiantes = [];
                    }

                    DB::table('estudiante_examen')->insert($lotePivote);
                    $lotePivote = [];
                }
            }

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
                'message'          => 'Carga completada con éxito.',
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