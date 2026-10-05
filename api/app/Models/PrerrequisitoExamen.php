<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class PrerrequisitoExamen extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'prerrequisitos_examen';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id_examen',
        'titulo',
        'descripcion',
    ];

    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'id_examen');
    }

    public function estudiantes(): BelongsToMany
    {
        return $this->belongsToMany(Estudiante::class, 'estudiante_prerrequisito', 'id_prerrequisito', 'id_estudiante')
            ->withPivot('cumplido', 'fecha_cumplimiento', 'revisado_por_docente_id')
            ->withTimestamps();
    }
}