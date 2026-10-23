<?php

namespace Database\Seeders;

use App\Models\Aula;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Materia;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ExamenSeeder2 extends Seeder
{
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
                'activo'            => true,
            ]
        );

        $ahora = Carbon::now('America/La_Paz');

        // 1. Examen Activo (Ventana abierta: comenzó hace 15m, vence en 15m)
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
            'hora_fin'   => $ahora->copy()->addMinutes(17)->format('H:i:s'),
        ]);
        $examenActivo->save();

        // 2. Examen por concluir (Programado para permitir emitir QR, por vencer en 7m)
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

        // 3. Inscripciones

        // A. Todos los estudiantes al examen activo (Habilitados)
        $todosEstudiantes = Estudiante::all();
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
        }

        // B. Examen "por concluir": solo los 3 estudiantes específicos
        $syncEspecificos = [];

        // 1. Estudiante 1 (Habilitado)
        $est1 = Estudiante::where('codigo_sis', '202104512CTR')
            ->orWhere('codigo_sis', '202104512')
            ->first();
        if ($est1) {
            $syncEspecificos[$est1->id] = [
                'estado'        => 'Habilitado',
                'motivo_estado' => null,
                'created_at'    => now(),
                'updated_at'    => now(),
            ];
        }

        // 2. Estudiante 2 (Habilitado)
        $est2 = Estudiante::where('codigo_sis', '202209123MVF')
            ->orWhere('codigo_sis', '202209123')
            ->first();
        if ($est2) {
            $syncEspecificos[$est2->id] = [
                'estado'        => 'Habilitado',
                'motivo_estado' => null,
                'created_at'    => now(),
                'updated_at'    => now(),
            ];
        }

        // 3. Estudiante 3 (Inhabilitado)
        $est3 = Estudiante::where('codigo_sis', '20202020GMC')
            ->orWhere('codigo_sis', '20202020')
            ->first();
        if ($est3) {
            $syncEspecificos[$est3->id] = [
                'estado'        => 'Inhabilitado',
                'created_at'    => now(),
                'updated_at'    => now(),
            ];
        }

        $examenExpirado->estudiantes()->sync($syncEspecificos);
    }
}