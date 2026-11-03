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

            $param = $this->route('examene') 
                ?? $this->route('examen') 
                ?? $this->route('id') 
                ?? request()->route('examene')
                ?? request()->route('examen')
                ?? request()->route('id');

            $examenId = $param instanceof Examen ? $param->id : $param;

            if (!$examenId) {
                $examenId = $this->segment(count($this->segments()));
            }

            $examenActual = Examen::find($examenId);
            if (!$examenActual) {
                return;
            }

            $idAula   = $this->input('id_aula', $examenActual->id_aula);
            $fecha    = $this->input('fecha', $examenActual->fecha?->format('Y-m-d') ?? $examenActual->fecha);
            $horaIni  = $this->input('hora_ini', substr((string) $examenActual->hora_ini, 0, 5));
            $horaFin  = $this->input('hora_fin', substr((string) $examenActual->hora_fin, 0, 5));

            $traslape = Examen::where('id_aula', $idAula)
                ->where('fecha', $fecha)
                ->where('id', '!=', $examenActual->id) 
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

    protected function prepareForValidation(): void
    {
        $param = $this->route('examene') 
            ?? $this->route('examen') 
            ?? $this->route('id') 
            ?? $this->segment(count($this->segments()));

        $examenId = $param instanceof \App\Models\Examen ? $param->id : $param;
        $examenActual = \App\Models\Examen::find($examenId);

        if ($examenActual) {
            $merge = [];
            if (empty($this->id_aula)) {
                $merge['id_aula'] = $examenActual->id_aula;
            }
            if (empty($this->id_docente)) {
                $merge['id_docente'] = $examenActual->id_docente;
            }
            if (!empty($merge)) {
                $this->merge($merge);
            }
        }
    }
}