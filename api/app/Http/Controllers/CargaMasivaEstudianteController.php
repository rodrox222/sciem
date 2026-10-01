<?php

namespace App\Http\Controllers;

use App\Http\Requests\CargaMasivaEstudiantesRequest;
use App\Models\Estudiante;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CargaMasivaEstudianteController extends Controller
{
    private const TAMANO_LOTE = 50;

    public function store(CargaMasivaEstudiantesRequest $request): JsonResponse
    {
        $archivo = $request->file('archivo');
        $handle = fopen($archivo->getRealPath(), 'r');

        if ($handle === false) {
            return response()->json([
                'message' => 'No se pudo abrir el archivo CSV para su lectura.'
            ], 422);
        }

        // 1. Detectar y validar cabecera esperada
        $cabecera = fgetcsv($handle, 0, ',');
        if (!$cabecera) {
            fclose($handle);
            return response()->json(['message' => 'El archivo CSV se encuentra vacío.'], 422);
        }

        // Limpiar posibles caracteres BOM UTF-8 y espacios
        $cabeceraLimpia = array_map(function ($col) {
            return trim(preg_replace('/[\x00-\x1F\x80-\xFF]/', '', strtolower($col)));
        }, $cabecera);

        $cabeceraEsperada = ['codigo_sis', 'ci', 'ci_extension', 'nombre', 'apellido_paterno', 'apellido_materno', 'email_institucional'];
        
        if (array_slice($cabeceraLimpia, 0, count($cabeceraEsperada)) !== $cabeceraEsperada) {
            fclose($handle);
            return response()->json([
                'message' => 'Estructura de cabecera inválida. Se espera: ' . implode(',', $cabeceraEsperada)
            ], 422);
        }

        // 2. Pre-cargar llaves únicas existentes en base de datos para detección rápida (HU-07 / T3)
        $sisExistentesBd = Estudiante::pluck('codigo_sis')->flip()->toArray();
        $emailsExistentesBd = Estudiante::pluck('email_institucional')->flip()->toArray();

        $sisEnArchivo = [];
        $emailsEnArchivo = [];

        $loteParaInsertar = [];
        $rechazados = [];
        $totalProcesados = 0;
        $totalValidos = 0;
        $numeroFila = 1; // Fila 1 es cabecera

        // Iniciar transacción de base de datos
        DB::beginTransaction();

        try {
            while (($fila = fgetcsv($handle, 0, ',')) !== false) {
                $numeroFila++;

                // Omitir filas en blanco
                if (count(array_filter($fila)) === 0) {
                    continue;
                }

                $totalProcesados++;

                $registro = [
                    'codigo_sis'          => isset($fila[0]) ? trim($fila[0]) : '',
                    'ci'                  => isset($fila[1]) ? trim($fila[1]) : '',
                    'ci_extension'        => isset($fila[2]) && trim($fila[2]) !== '' ? trim($fila[2]) : null,
                    'nombre'              => isset($fila[3]) ? trim($fila[3]) : '',
                    'apellido_paterno'    => isset($fila[4]) ? trim($fila[4]) : '',
                    'apellido_materno'    => isset($fila[5]) && trim($fila[5]) !== '' ? trim($fila[5]) : null,
                    'email_institucional' => isset($fila[6]) ? trim($fila[6]) : '',
                ];

                // Reglas sintácticas de la fila (Tarea #76 / T2)
                $validador = Validator::make($registro, [
                    'codigo_sis'          => ['required', 'string', 'max:20'],
                    'ci'                  => ['required', 'string', 'max:20'],
                    'ci_extension'        => ['nullable', 'string', 'max:10'],
                    'nombre'              => ['required', 'string', 'max:100'],
                    'apellido_paterno'    => ['required', 'string', 'max:100'],
                    'apellido_materno'    => ['nullable', 'string', 'max:100'],
                    'email_institucional' => ['required', 'string', 'max:150', 'regex:/^[a-zA-Z0-9._%+-]+@est\.umss\.edu$/i'],
                ]);

                if ($validador->fails()) {
                    $rechazados[] = [
                        'fila'   => $numeroFila,
                        'datos'  => $registro,
                        'motivo' => implode(' | ', $validador->errors()->all()),
                    ];
                    continue;
                }

                // Detección de duplicados en el mismo archivo (Tarea #77 / T3)
                if (isset($sisEnArchivo[$registro['codigo_sis']])) {
                    $rechazados[] = [
                        'fila'   => $numeroFila,
                        'datos'  => $registro,
                        'motivo' => "El código SIS '{$registro['codigo_sis']}' ya se encuentra repetido dentro del mismo archivo.",
                    ];
                    continue;
                }

                if (isset($emailsEnArchivo[$registro['email_institucional']])) {
                    $rechazados[] = [
                        'fila'   => $numeroFila,
                        'datos'  => $registro,
                        'motivo' => "El correo institucional '{$registro['email_institucional']}' ya está repetido en el archivo.",
                    ];
                    continue;
                }

                // Detección de duplicados contra base de datos (Tarea #77 / T3)
                if (isset($sisExistentesBd[$registro['codigo_sis']])) {
                    $rechazados[] = [
                        'fila'   => $numeroFila,
                        'datos'  => $registro,
                        'motivo' => "El código SIS '{$registro['codigo_sis']}' ya existe en el sistema.",
                    ];
                    continue;
                }

                if (isset($emailsExistentesBd[$registro['email_institucional']])) {
                    $rechazados[] = [
                        'fila'   => $numeroFila,
                        'datos'  => $registro,
                        'motivo' => "El correo institucional '{$registro['email_institucional']}' ya está registrado en el sistema.",
                    ];
                    continue;
                }

                // Registrar en memoria para evitar colisiones en líneas posteriores
                $sisEnArchivo[$registro['codigo_sis']] = true;
                $emailsEnArchivo[$registro['email_institucional']] = true;

                // Preparar tupla para inserción
                $loteParaInsertar[] = [
                    'id'                  => (string) Str::uuid(),
                    'codigo_sis'          => $registro['codigo_sis'],
                    'ci'                  => $registro['ci'],
                    'ci_extension'        => $registro['ci_extension'],
                    'nombre'              => $registro['nombre'],
                    'apellido_paterno'    => $registro['apellido_paterno'],
                    'apellido_materno'    => $registro['apellido_materno'],
                    'email_institucional' => $registro['email_institucional'],
                    'activo'              => true,
                    'created_at'          => now(),
                    'updated_at'          => now(),
                ];

                $totalValidos++;

                // Inserción en bloques de 50
                if (count($loteParaInsertar) >= self::TAMANO_LOTE) {
                    Estudiante::insert($loteParaInsertar);
                    $loteParaInsertar = [];
                }
            }

            // Insertar remanente final (si quedaron menos de 50 filas)
            if (!empty($loteParaInsertar)) {
                Estudiante::insert($loteParaInsertar);
            }

            fclose($handle);

            // Confirmar transacción
            DB::commit();

            return response()->json([
                'message'          => 'Carga masiva procesada correctamente.',
                'total_procesados' => $totalProcesados,
                'total_insertados' => $totalValidos,
                'total_rechazados' => count($rechazados),
                'rechazados'       => $rechazados, // Servirá para la tarea T4 y visualización T6
            ], 201);

        } catch (\Throwable $e) {
            // Reversión total si ocurre cualquier excepción crítica no controlada
            DB::rollBack();
            if (is_resource($handle)) {
                fclose($handle);
            }

            return response()->json([
                'message' => 'Ocurrió un error crítico durante el procesamiento. La transacción fue revertida (Rollback).',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}