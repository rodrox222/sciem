<?php

namespace Database\Seeders;

use App\Models\Norma;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class NormaSeeder extends Seeder
{
    public function run(): void
    {
        $normas = [
            [
                'titulo'      => 'Presentación obligatoria de documento de identidad',
                'descripcion' => 'Es requisito indispensable presentar credencial universitaria o carnet de identidad vigente para ingresar al examen.',
            ],
            [
                'titulo'      => 'Presentación de código QR impreso',
                'descripcion' => 'El estudiante debe portar su credencial o boleto con el código QR impreso de forma legible para el control de ingreso.',
            ],
            [
                'titulo'      => 'Prohibición de mochilas en pupitres',
                'descripcion' => 'Queda prohibido conservar mochilas, bolsos, carteras o riñoneras en los asientos o pupitres durante la evaluación.',
            ],
            [
                'titulo'      => 'Ubicación de pertenencias en zona asignada',
                'descripcion' => 'Las mochilas y pertenencias personales deben dejarse al frente del aula o en el espacio específicamente designado antes de sentarse.',
            ],
            [
                'titulo'      => 'Prohibición de dispositivos electrónicos',
                'descripcion' => 'Está terminantemente prohibido portar teléfonos móviles, smartwatches, audífonos o cualquier otro dispositivo electrónico durante la prueba.',
            ],
            [
                'titulo'      => 'Dispositivos móviles apagados',
                'descripcion' => 'Todos los teléfonos móviles y dispositivos permitidos para el escaneo previo deben permanecer completamente apagados una vez dentro del aula.',
            ],
            [
                'titulo'      => 'Prohibición de relojes de pulsera',
                'descripcion' => 'No se permite el uso ni porte de relojes de pulsera, ya sean analógicos o digitales, durante el desarrollo del examen.',
            ],
            [
                'titulo'      => 'Útiles escolares en cartuchera transparente',
                'descripcion' => 'Solo se autoriza portar los útiles de escritorio estrictamente necesarios, preferentemente en fundas o cartucheras plásticas transparentes.',
            ],
            [
                'titulo'      => 'Puntualidad en el ingreso al aula',
                'descripcion' => 'El estudiante debe presentarse en la puerta del aula asignada con al menos 15 minutos de anticipación al horario fijado para la prueba.',
            ],
            [
                'titulo'      => 'Tolerancia de ingreso al examen',
                'descripcion' => 'Se establece una tolerancia máxima de 10 minutos posterior al inicio oficial de la prueba; pasado este lapso no se admitirá ningún ingreso.',
            ],
            [
                'titulo'      => 'Restricción de prendas accesorias en la cabeza',
                'descripcion' => 'Queda prohibido el uso de gorras, capuchas o lentes de sol oscuros dentro del aula durante el examen, manteniendo el rostro visible en todo momento.',
            ],
            [
                'titulo'      => 'Calculadoras autorizadas únicamente',
                'descripcion' => 'Solo se admiten calculadoras científicas estándar básicas aprobadas por la cátedra; queda prohibido el uso de calculadoras programables o graficadoras.',
            ],
            [
                'titulo'      => 'Prohibición de hojas o material de apoyo externo',
                'descripcion' => 'No está permitido ingresar con hojas en blanco, resúmenes, apuntes ni ningún formulario no provisto o autorizado expresamente por el docente.',
            ],
            [
                'titulo'      => 'Asignación estricta de pupitre',
                'descripcion' => 'Cada estudiante debe ocupar única y estrictamente el pupitre o asiento asignado en la nómina oficial o por el personal de control.',
            ],
            [
                'titulo'      => 'Prohibición de alimentos y bebidas',
                'descripcion' => 'No se permite el ingreso ni consumo de alimentos o bebidas durante el examen, con excepción de una botella plástica transparente con agua.',
            ],
        ];

        foreach ($normas as $norma) {
            Norma::firstOrCreate(
                ['titulo' => $norma['titulo']],
                [
                    'id'          => (string) Str::uuid(),
                    'descripcion' => $norma['descripcion'],
                    'tipo'        => 'General',
                    'estado'      => 'Activo',
                ]
            );
        }
    }
}