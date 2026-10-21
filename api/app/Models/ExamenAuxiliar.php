<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamenAuxiliar extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'examen_auxiliar';

    protected $fillable = [
        'id_examen',
        'id_auxiliar',
        'estado',
        'fecha_invitacion',
        'fecha_respuesta',
    ];

    protected function casts(): array
    {
        return [
            'fecha_invitacion' => 'datetime',
            'fecha_respuesta'  => 'datetime',
        ];
    }

    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'id_examen');
    }

    public function auxiliar(): BelongsTo
    {
        return $this->belongsTo(Auxiliar::class, 'id_auxiliar');
    }
}