<?php

namespace Database\Seeders;

use App\Models\Materia;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MateriaSeeder extends Seeder
{
    public function run(): void
    {
        $materias = [
            // 1° Semestre
            'Álgebra I',
            'Cálculo I',
            'Introducción a la Programación',
            'Metodología de la Investigación y Técnicas de Comunicación',
            'Física General',
            'Inglés I',

            // 2° Semestre
            'Álgebra II',
            'Cálculo II',
            'Matemática Discreta',
            'Elementos de Programación y Estructura de Datos',
            'Arquitectura de Computadoras',

            // 3° Semestre
            'Estadística I',
            'Ecuaciones Diferenciales',
            'Cálculo Numérico',
            'Métodos y Técnicas de Programación',
            'Base de Datos I',
            'Circuitos Electrónicos',

            // 4° Semestre
            'Estadística II',
            'Investigación Operativa I',
            'Contabilidad Básica',
            'Sistemas de Información I',
            'Base de Datos II',
            'Taller de Sistemas Operativos',

            // 5° Semestre
            'Mercadotecnia',
            'Investigación Operativa II',
            'Sistemas I',
            'Sistemas de Información II',
            'Taller de Base de Datos',
            'Aplicación de Sistemas Operativos',
            'Inglés II',

            // 6° Semestre
            'Sistemas Económicos',
            'Simulación de Sistemas',
            'Sistemas II',
            'Ingeniería de Software',
            'Inteligencia Artificial',
            'Redes de Computadoras',

            // 7° Semestre
            'Planificación y Evaluación de Proyectos',
            'Dinámica de Sistemas',
            'Tópicos Selectos I',
            'Taller de Ingeniería de Software',
            'Gestión de Calidad de Software',
            'Redes Avanzadas de Computadoras',

            // 8° Semestre
            'Gestión Estratégica de Empresas',
            'Taller de Modelación y Simulación de Sistemas',
            'Tópicos Selectos II',
            'Metodología y Planificación de Proyecto de Grado',
            'Evaluación y Auditoría de Sistemas',
            'Seguridad de Sistemas',
            'Inglés III',

            // 9° Semestre
            'Tópicos Selectos III',
            'Tópicos Selectos IV',
            'Práctica Empresarial',
            'Proyecto Final',
            'Tópicos Selectos V',
            'Tópicos Selectos VI',
        ];

        foreach ($materias as $nombre) {
            Materia::firstOrCreate(
                ['nombre' => $nombre],
                ['id' => (string) Str::uuid()]
            );
        }
    }
}