<?php

namespace App\Http\Requests;

use App\Models\Examen;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateExamenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre'     => ['sometimes', 'required', 'string', 'max:150'],
            'id_materia' => ['sometimes', 'required', 'uuid', 'exists:materias,id'],
            'estado'     => ['sometimes', 'required', 'string', Rule::in(['Programado', 'En proceso', 'Terminado'])],
            'fecha'      => ['sometimes', 'required', 'date_format:Y-m-d'],
            'hora_ini'   => ['sometimes', 'required', 'date_format:H:i'],
            'hora_fin'   => ['sometimes', 'required', 'date_format:H:i', 'after:hora_ini'],
            'id_aula'    => ['sometimes', 'required', 'uuid', 'exists:aulas,id'],
            'id_docente' => ['sometimes', 'required', 'uuid', 'exists:docente,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            // Obtener el ID del examen en la ruta (soporta 'id' o 'examene')
            $examenId = $this->route('id') ?? $this->route('examen');
            if ($examenId instanceof Examen) {
                $examenId = $examenId->id;
            }

            $examenActual = Examen::find($examenId);
            if (!$examenActual) {
                return;
            }

            $idAula   = $this->input('id_aula', $examenActual->id_aula);
            $fecha    = $this->input('fecha', $examenActual->fecha?->format('Y-m-d') ?? $examenActual->fecha);
            $horaIni  = $this->input('hora_ini', substr($examenActual->hora_ini, 0, 5));
            $horaFin  = $this->input('hora_fin', substr($examenActual->hora_fin, 0, 5));

            $traslape = Examen::where('id_aula', $idAula)
                ->where('fecha', $fecha)
                ->where('id', '!=', $examenId)
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