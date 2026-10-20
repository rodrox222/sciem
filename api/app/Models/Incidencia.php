<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Incidencia extends Model
{
    use HasUuids;

    protected $table = 'incidencias';

    protected $fillable = [
        'id_examen',
        'id_estudiante',
        'id_aula_asignada',
        'tipo_incidencia',
        'descripcion',
        'autor_id',
        'autor_tipo',
    ];

    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'id_examen');
    }

    public function estudiante(): BelongsTo
    {
        return $this->belongsTo(Estudiante::class, 'id_estudiante');
    }

    public function aulaAsignada(): BelongsTo
    {
        return $this->belongsTo(Aula::class, 'id_aula_asignada');
    }

    public function autor(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'autor_tipo', 'autor_id');
    }
}