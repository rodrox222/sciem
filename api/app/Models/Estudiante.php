<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Estudiante extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'estudiantes';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'codigo_sis',
        'ci',
        'ci_extension',
        'nombre',
        'apellido_paterno',
        'apellido_materno',
        'email_institucional',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    public function examenes(): BelongsToMany
    {
        return $this->belongsToMany(Examen::class, 'estudiante_examen', 'id_estudiante', 'id_examen')
            ->withPivot('estado', 'motivo_estado', 'ajuste_manual', 'modificado_por_docente_id', 'fecha_ajuste_manual')
            ->withTimestamps();
    }

    public function prerrequisitos(): BelongsToMany
    {
        return $this->belongsToMany(PrerrequisitoExamen::class, 'estudiante_prerrequisito', 'id_estudiante', 'id_prerrequisito')
            ->withPivot('cumplido', 'fecha_cumplimiento', 'revisado_por_docente_id')
            ->withTimestamps();
    }

    public function logsAsistencias(): HasMany
    {
        return $this->hasMany(LogAsistencia::class, 'id_estudiante');
    }
}