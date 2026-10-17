<?php

namespace Database\Seeders;

use App\Models\Aula;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Materia;
use App\Models\PrerrequisitoExamen;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PrerrequisitoSeeder extends Seeder
{
    public function run(): void
    {
        // Obtener al docente institucional
        $docente = Docente::where('email', 'docente@fcyt.umss.edu.bo')->first() ?? Docente::first();

        if (!$docente) {
            $this->command->error('No se encontró ningún docente en la base de datos.');
            return;
        }

        // Asegurar Materia y Aula de prueba
        $materia = Materia::firstOrCreate(
            ['nombre' => 'Taller de Ingeniería de Software'],
            ['id' => (string) Str::uuid()]
        );

        $aula = Aula::firstOrCreate(
            ['nombre' => 'Laboratorio TIS'],
            [
                'id'        => (string) Str::uuid(),
                'ubicacion' => 'Edificio FCyT',
                'estado'    => 'Disponible',
                'capacidad' => 50,
            ]
        );

        // Crear el Examen con UUID fijo
        $examenIdFijo = '11111111-2222-3333-4444-555555555555';

        $examen = Examen::updateOrCreate(
            ['id' => $examenIdFijo],
            [
                'nombre'     => 'Examen Parcial - Carga Masiva Pruebas',
                'id_materia' => $materia->id,
                'id_aula'    => $aula->id,
                'id_docente' => $docente->id,
                'estado'     => 'Programado',
                'fecha'      => '2026-10-20',
                'hora_ini'   => '08:15:00',
                'hora_fin'   => '10:00:00',
            ]
        );

        // Crear los 3 Prerrequisitos para este examen
        $prerrequisitosData = [
            [
                'id'          => 'aaaaaaaa-1111-1111-1111-111111111111',
                'id_examen'   => $examen->id,
                'titulo'      => 'Asistencia mínima del 80%',
                'descripcion' => 'Haber asistido al menos al 80% de las clases teóricas y prácticas registradas.',
            ],
            [
                'id'          => 'bbbbbbbb-2222-2222-2222-222222222222',
                'id_examen'   => $examen->id,
                'titulo'      => 'Defensa de Sprint 1 Aprobada',
                'descripcion' => 'Aprobación satisfactoria de la entrega y sustentación del Sprint 1 del proyecto.',
            ],
            [
                'id'          => 'cccccccc-3333-3333-3333-333333333333',
                'id_examen'   => $examen->id,
                'titulo'      => 'Sin deudas en Laboratorio de Computación',
                'descripcion' => 'No registrar pendientes de devolución de material ni equipos en los laboratorios de FCyT.',
            ],
        ];

        foreach ($prerrequisitosData as $data) {
            PrerrequisitoExamen::updateOrCreate(
                ['id' => $data['id']],
                $data
            );
        }

        // Obtener los estudiantes existentes y asegurar que su contraseña 
        $estudiantes = Estudiante::all();

        foreach ($estudiantes as $estudiante) {
            $passwordGenerada = $this->generarPasswordEstudiante(
                $estudiante->codigo_sis,
                $estudiante->nombre,
                $estudiante->apellido_paterno,
                $estudiante->apellido_materno
            );

            $estudiante->password = Hash::make($passwordGenerada);
            $estudiante->save();
        }

        // Vincular y evaluar el cumplimiento de los 3 estudiantes de muestra
        if ($estudiantes->count() > 0) {
            $req1 = 'aaaaaaaa-1111-1111-1111-111111111111';
            $req2 = 'bbbbbbbb-2222-2222-2222-222222222222';
            $req3 = 'cccccccc-3333-3333-3333-333333333333';

            // Estudiante 1: Cumple los 3 -> Habilitado
            if (isset($estudiantes[0])) {
                $e1 = $estudiantes[0]->id;
                $this->asignarCumplimiento($req1, $e1, true, $docente->id);
                $this->asignarCumplimiento($req2, $e1, true, $docente->id);
                $this->asignarCumplimiento($req3, $e1, true, $docente->id);

                DB::table('estudiante_examen')->updateOrInsert(
                    ['id_examen' => $examen->id, 'id_estudiante' => $e1],
                    [
                        'estado'                    => 'Habilitado',
                        'motivo_estado'             => null,
                        'ajuste_manual'             => false,
                        'modificado_por_docente_id' => null,
                        'fecha_ajuste_manual'       => null,
                        'updated_at'                => now(),
                    ]
                );
            }

            // Estudiante 2: Falta Sprint 1 -> Inhabilitada
            if (isset($estudiantes[1])) {
                $e2 = $estudiantes[1]->id;
                $this->asignarCumplimiento($req1, $e2, true, $docente->id);
                $this->asignarCumplimiento($req2, $e2, false, $docente->id);
                $this->asignarCumplimiento($req3, $e2, true, $docente->id);

                DB::table('estudiante_examen')->updateOrInsert(
                    ['id_examen' => $examen->id, 'id_estudiante' => $e2],
                    [
                        'estado'                    => 'Inhabilitado',
                        'motivo_estado'             => null,
                        'ajuste_manual'             => false,
                        'modificado_por_docente_id' => null,
                        'fecha_ajuste_manual'       => null,
                        'updated_at'                => now(),
                    ]
                );
            }

            // Estudiante 3: Falta asistencia -> Inhabilitado
            if (isset($estudiantes[2])) {
                $e3 = $estudiantes[2]->id;
                $this->asignarCumplimiento($req1, $e3, false, $docente->id);
                $this->asignarCumplimiento($req2, $e3, true, $docente->id);
                $this->asignarCumplimiento($req3, $e3, true, $docente->id);

                DB::table('estudiante_examen')->updateOrInsert(
                    ['id_examen' => $examen->id, 'id_estudiante' => $e3],
                    [
                        'estado'                    => 'Inhabilitado',
                        'motivo_estado'             => null,
                        'ajuste_manual'             => false,
                        'modificado_por_docente_id' => null,
                        'fecha_ajuste_manual'       => null,
                        'updated_at'                => now(),
                    ]
                );
            }
        }

        $this->command->info("Examen con UUID {$examenIdFijo}, 3 prerrequisitos y estudiantes actualizados con su contraseña por fórmula.");
    }

    private function asignarCumplimiento(string $prerrequisitoId, string $estudianteId, bool $cumplido, ?string $docenteId): void
    {
        DB::table('estudiante_prerrequisito')->updateOrInsert(
            [
                'id_prerrequisito' => $prerrequisitoId,
                'id_estudiante'    => $estudianteId,
            ],
            [
                'cumplido'                => $cumplido,
                'fecha_cumplimiento'      => $cumplido ? now() : null,
                'revisado_por_docente_id' => $docenteId,
                'created_at'              => now(),
                'updated_at'              => now(),
            ]
        );
    }

    /**
     * Genera la contraseña combinando Código SIS + Iniciales de nombres y apellidos en mayúsculas
     */
    private function generarPasswordEstudiante(string $sis, string $nombres, string $paterno, ?string $materno): string
    {
        $iniciales = '';

        foreach (preg_split('/\s+/', trim($nombres)) as $nombre) {
            if ($nombre !== '') {
                $iniciales .= mb_substr($nombre, 0, 1);
            }
        }

        if (!empty($paterno)) {
            $partesPaterno = preg_split('/\s+/', trim($paterno));
            $iniciales .= mb_substr($partesPaterno[0], 0, 1);
        }

        if (!empty($materno)) {
            $partesMaterno = preg_split('/\s+/', trim($materno));
            $iniciales .= mb_substr($partesMaterno[0], 0, 1);
        }

        return $sis . mb_strtoupper($iniciales);
    }
}