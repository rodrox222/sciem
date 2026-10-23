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
            'hora_fin'   => $ahora->copy()->addMinutes(15)->format('H:i:s'),
        ]);
        $examenActivo->save();

        // 2. Examen por concluir
        $examenExpirado = Examen::firstOrNew(['nombre' => 'Primer Parcial - por concluir']);
        if (!$examenExpirado->exists) {
            $examenExpirado->id = (string) Str::uuid();
        }
        $examenExpirado->fill([
            'id_materia' => $materia->id,
            'id_aula'    => $aula->id,
            'id_docente' => $docente->id,
            'estado'     => 'Terminado',
            'fecha'      => $ahora->format('Y-m-d'),
            'hora_ini'   => $ahora->copy()->subMinutes(90)->format('H:i:s'),
            'hora_fin'   => $ahora->copy()->addMinutes(7)->format('H:i:s'),
        ]);
        $examenExpirado->save();

        // 3. Inscribir estudiantes
        $estudiantes = Estudiante::all();

        if ($estudiantes->isNotEmpty()) {
            // A. Todos los estudiantes al examen activo
            $syncTodos = [];
            foreach ($estudiantes as $estudiante) {
                $syncTodos[$estudiante->id] = [
                    'estado'        => 'Habilitado',
                    'motivo_estado' => null,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ];
            }
            $examenActivo->estudiantes()->sync($syncTodos);

            // B. Solo 2 estudiantes al examen por concluir
            $syncDos = [];
            foreach ($estudiantes->take(2) as $estudiante) {
                $syncDos[$estudiante->id] = [
                    'estado'        => 'Habilitado',
                    'motivo_estado' => null,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ];
            }
            $examenExpirado->estudiantes()->sync($syncDos);
        }
    }
}