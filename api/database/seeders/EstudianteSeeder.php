<?php

namespace Database\Seeders;

use App\Models\Estudiante;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

class EstudianteSeeder extends Seeder
{
    public function run(): void
    {
        $estudiantes = [
            [
                'id'                       => (string) Str::uuid(),
                'codigo_sis'               => '202104512',
                'ci'                       => '8765431',
                'ci_extension'             => 'CB',
                'nombre'                   => 'Carlos',
                'apellido_paterno'         => 'Torrico',
                'apellido_materno'         => 'Rojas',
                'email_institucional'      => '202104512@est.umss.edu',
                'primer_acceso_completado' => true,
                'activo'                   => true,
            ],
            [
                'id'                       => (string) Str::uuid(),
                'codigo_sis'               => '202209123',
                'ci'                       => '9123847',
                'ci_extension'             => 'LP',
                'nombre'                   => 'Mariana',
                'apellido_paterno'         => 'Vargas',
                'apellido_materno'         => 'Flores',
                'email_institucional'      => '202209123@est.umss.edu',
                'primer_acceso_completado' => true,
                'activo'                   => true,
            ],
            [
                'id'                       => (string) Str::uuid(),
                'codigo_sis'               => '202301641',
                'ci'                       => '7654129',
                'ci_extension'             => null,
                'nombre'                   => 'Rodrigo',
                'apellido_paterno'         => 'Fernandez',
                'apellido_materno'         => 'Gomez',
                'email_institucional'      => '202301641@est.umss.edu',
                'primer_acceso_completado' => false,
                'activo'                   => true,
            ],
            [
                'id'                       => (string) Str::uuid(),
                'codigo_sis'               => '20202020',
                'ci'                       => '8765431',
                'ci_extension'             => 'CB',
                'nombre'                   => 'geraldo',
                'apellido_paterno'         => 'mamani',
                'apellido_materno'         => 'crauz',
                'email_institucional'      => '20202020@est.umss.edu',
                'primer_acceso_completado' => true,
                'activo'                   => true,
            ],
        ];

        foreach ($estudiantes as $data) {
            $passwordPlano = $this->generarPasswordEstudiante(
                $data['codigo_sis'],
                $data['nombre'],
                $data['apellido_paterno'],
                $data['apellido_materno']
            );
            $data['password'] = Hash::make($passwordPlano);

            $estudiante = Estudiante::firstOrNew(['codigo_sis' => $data['codigo_sis']]);
            $estudiante->fill($data);
            $estudiante->password = $data['password'];
            $estudiante->save();
        }
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