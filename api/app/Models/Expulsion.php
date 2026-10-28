<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Expulsion extends Model
{
    use HasUuids, \Illuminate\Database\Eloquent\SoftDeletes;

    protected $table = 'expulsiones';

    protected $fillable = [
        'id_examen',
        'id_estudiante',
        'motivo',
        'motivo_eliminacion',
        'rol_responsable',
        'fecha_hora',
        'expulsado_por_type',
        'expulsado_por_id',
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

    public function expulsadoPor(): MorphTo
    {
        return $this->morphTo('expulsado_por');
    }
}
