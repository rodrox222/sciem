<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntentoNoAutorizado extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'intentos_no_autorizados';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'id_examen',
        'codigo_sis',
        'ci',
        'ci_extension',
        'id_estudiante',
        'registrado_por_id',
        'registrado_por_rol',
        'fecha_hora',
        'motivo',
        'observacion',
    ];

    protected function casts(): array
    {
        return [
            'fecha_hora' => 'datetime',
        ];
    }

    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'id_examen');
    }

    public function estudiante(): BelongsTo
    {
        return $this->belongsTo(Estudiante::class, 'id_estudiante');
    }
}