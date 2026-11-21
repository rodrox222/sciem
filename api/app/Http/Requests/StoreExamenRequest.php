<?php

namespace App\Http\Requests;

use App\Models\Examen;
use App\Models\Gestion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreExamenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre'     => ['required', 'string', 'max:150'],
            'id_materia' => ['required', 'uuid', 'exists:materias,id'],
            'estado'     => ['nullable', 'string', Rule::in(['Programado', 'En proceso', 'Terminado'])],
            'fecha'      => ['required', 'date_format:Y-m-d'],
            'hora_ini'   => ['required', 'date_format:H:i'],
            'hora_fin'   => ['required', 'date_format:H:i', 'after:hora_ini'],
            'id_aula'    => ['required', 'uuid', 'exists:aulas,id'],
            'id_docente' => ['required', 'uuid', 'exists:docente,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $idAula   = $this->input('id_aula');
            $fecha    = $this->input('fecha');
            $horaIni  = $this->input('hora_ini');
            $horaFin  = $this->input('hora_fin');

            $gestionActiva = Gestion::activa();
            if (!$gestionActiva) {
                $validator->errors()->add(
                    'id_gestion',
                    'No existe una gestión/semestre activo. El administrador debe iniciar un semestre en Configuración antes de programar exámenes.'
                );
                return;
            }

            if ($gestionActiva->estaVencida()) {
                $finFormatted = $gestionActiva->fecha_fin?->format('d/m/Y');
                $validator->errors()->add(
                    'fecha',
                    "La gestión activa ({$gestionActiva->codigo}) finalizó el {$finFormatted}. No se pueden programar nuevos exámenes."
                );
                return;
            }

            if (!$gestionActiva->contieneFecha((string) $fecha)) {
                $inicioFormatted = $gestionActiva->fecha_inicio?->format('d/m/Y');
                $finFormatted = $gestionActiva->fecha_fin?->format('d/m/Y');
                $validator->errors()->add(
                    'fecha',
                    "La fecha del examen debe estar dentro del rango de la gestión activa {$gestionActiva->codigo} ({$inicioFormatted} al {$finFormatted})."
                );
                return;
            }

            $traslape = Examen::where('id_aula', $idAula)
                ->where('fecha', $fecha)
                ->whereIn('estado', ['Programado', 'En proceso'])
                ->where(function ($query) use ($horaIni, $horaFin) {
                    $query->where('hora_ini', '<', $horaFin)
                          ->where('hora_fin', '>', $horaIni);
                })
                ->first();

            if ($traslape) {
                $validator->errors()->add(
                    'id_aula',
                    "El aula ya se encuentra ocupada por la evaluación '{$traslape->nombre}' en el horario de {$traslape->hora_ini} a {$traslape->hora_fin}."
                );
            }
        });
    }
}