<?php

namespace Database\Seeders;

use App\Models\Aula;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Materia;
use App\Traits\DistribuyeAuxiliares;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;


// toma los 4 estudiantes del seeder estudiantes y pone al segundo parcial
// toma 2 estudiantes 202104512 / 202209123 y pone 20202020 como inhabilitado, y el 202301641 no esta en el sistema
// los 3 auxiliares se van a primer parcial y seegundo parcial
class ExamenSeeder2 extends Seeder
{
    use DistribuyeAuxiliares;

    public function run(): void
    {
        $materia = Materia::firstOrCreate(
            ['nombre' => 'Introduccion a la programacion'],
            ['id' => (string) Str::uuid()]
        );

        $aula = Aula::firstOrCreate(
            ['nombre' => 'Aula 691B'],
            [
                'id'        => (string) Str::uuid(),
                'ubicacion' => 'Edificio Nuevo FCyT - Planta Baja',
                'estado'    => 'Disponible',
                'capacidad' => 50,
            ]
        );

        $docente = Docente::firstOrCreate(
            ['email' => 'docente@fcyt.umss.edu.bo'],
            [
                'id'                => (string) Str::uuid(),
                'ci'                => '11111111',
                'ci_extension'      => null,
                'nombre'            => 'jackson',
                'apellido_paterno'  => 'Orellana',
                'apellido_materno'  => 'mamani',
                'email_verified_at' => now(),
                'password'          => Hash::make('docente123'),
                'activo'            => DB::raw('true'),
            ]
        );

        // ==========================================
        // Estudiantes con rol de Auxiliar habilitados
        // ==========================================
        $auxiliaresSeed = [
            [
                'codigo_sis'          => '11111111',
                'email_institucional' => '11111111@est.umss.edu',
                'ci'                  => '111111110',
                'nombre'              => 'du',
                'apellido_paterno'    => 'gutierrez',
                'apellido_materno'    => 'lopez',
            ],
            [
                'codigo_sis'          => '22222222',
                'email_institucional' => '22222222@est.umss.edu',
                'ci'                  => '222222220',
                'nombre'              => 'dudu',
                'apellido_paterno'    => 'gutierrez',
                'apellido_materno'    => 'lopez',
            ],
            [
                'codigo_sis'          => '33333333',
                'email_institucional' => '33333333@est.umss.edu',
                'ci'                  => '333333330',
                'nombre'              => 'edu',
                'apellido_paterno'    => 'gutierrez',
                'apellido_materno'    => 'lopez',
            ],
        ];

        foreach ($auxiliaresSeed as $aux) {
            DB::table('estudiantes')->updateOrInsert(
                ['email_institucional' => $aux['email_institucional']],
                [
                    'id'                       => (string) Str::uuid(),
                    'codigo_sis'               => $aux['codigo_sis'],
                    'ci'                       => $aux['ci'],
                    'ci_extension'             => null,
                    'nombre'                   => $aux['nombre'],
                    'apellido_paterno'         => $aux['apellido_paterno'],
                    'apellido_materno'         => $aux['apellido_materno'],
                    'password'                 => Hash::make('SMG43210'),
                    'primer_acceso_completado' => DB::raw('false'),
                    'activo'                   => DB::raw('true'),
                    'es_auxiliar'              => DB::raw('true'),
                    'created_at'               => now(),
                    'updated_at'               => now(),
                ]
            );
        }

        $auxiliaresIds = DB::table('estudiantes')
            ->whereIn('email_institucional', [
                '11111111@est.umss.edu',
                '22222222@est.umss.edu',
                '33333333@est.umss.edu',
            ])
            ->pluck('id')
            ->toArray();

        $ahora = Carbon::now('America/La_Paz');

        // Examen Activo
        $examenActivo = Examen::firstOrNew(['nombre' => 'Segundo Parcial - Activo']);
        if (!$examenActivo->exists) {
            $examenActivo->id = (string) Str::uuid();
        }
        $examenActivo->fill([
            'id_materia' => $materia->id,
            'id_aula'    => $aula->id,
            'id_docente' => $docente->id,
            'estado'     => 'Programado',
            'fecha'      => $ahora->format('Y-m-d'),
            'hora_ini'   => $ahora->copy()->subMinutes(15)->format('H:i:s'),
            'hora_fin'   => $ahora->copy()->addMinutes(12)->format('H:i:s'),
        ]);
        $examenActivo->save();

        // Examen por concluir
        $examenExpirado = Examen::firstOrNew(['nombre' => 'Primer Parcial - por concluir']);
        if (!$examenExpirado->exists) {
            $examenExpirado->id = (string) Str::uuid();
        }
        $examenExpirado->fill([
            'id_materia' => $materia->id,
            'id_aula'    => $aula->id,
            'id_docente' => $docente->id,
            'estado'     => 'Programado',
            'fecha'      => $ahora->format('Y-m-d'),
            'hora_ini'   => $ahora->copy()->subMinutes(90)->format('H:i:s'),
            'hora_fin'   => $ahora->copy()->addMinutes(12)->format('H:i:s'),
        ]);
        $examenExpirado->save();

        // Asignar los auxiliares a examen_auxiliar con tiempos secuenciales para orden estable
        foreach ([$examenActivo->id, $examenExpirado->id] as $idExamen) {
            foreach ($auxiliaresIds as $index => $idAuxiliar) {
                DB::table('examen_auxiliar')->updateOrInsert(
                    [
                        'id_examen'   => $idExamen,
                        'id_auxiliar' => $idAuxiliar,
                    ],
                    [
                        'id'               => (string) Str::uuid(),
                        'estado'           => 'Activo',
                        'fecha_asignacion' => now()->addSeconds($index),
                        'created_at'       => now()->addSeconds($index),
                        'updated_at'       => now(),
                    ]
                );
            }
        }

        // Todos los estudiantes al examen activo usando sintaxis SQL nativa para booleanos
        $todosEstudiantes = Estudiante::whereRaw('es_auxiliar is false')->get();
        if ($todosEstudiantes->isNotEmpty()) {
            $syncTodos = [];
            foreach ($todosEstudiantes as $estudiante) {
                $syncTodos[$estudiante->id] = [
                    'estado'        => 'Habilitado',
                    'motivo_estado' => null,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ];
            }
            $examenActivo->estudiantes()->sync($syncTodos);
            // Repartir automáticamente entre los auxiliares (50/50 o en tercios)
            $this->redistribuirEstudiantesExamen($examenActivo->id);
        }

        // Examen "por concluir" con estudiantes específicos
        $syncEspecificos = [];
        $matriculas = [
            '202104512' => 'Habilitado',
            '202209123' => 'Habilitado',
            '20202020'  => 'Inhabilitado',
        ];

        foreach ($matriculas as $cod => $estado) {
            $est = Estudiante::where('codigo_sis', 'LIKE', "{$cod}%")->first();
            if ($est) {
                $syncEspecificos[$est->id] = [
                    'estado'        => $estado,
                    'motivo_estado' => $estado === 'Inhabilitado' ? 'Inhabilitado por inasistencia' : null,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ];
            }
        }

        if (!empty($syncEspecificos)) {
            $examenExpirado->estudiantes()->sync($syncEspecificos);
            $this->redistribuirEstudiantesExamen($examenExpirado->id);
        }
    }
}