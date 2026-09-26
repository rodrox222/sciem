<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

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

    public function estudiantes(): BelongsToMany
    {
        return $this->belongsToMany(Estudiante::class, 'estudiante_examen', 'id_examen', 'id_estudiante')
            ->withPivot('estado', 'motivo_inhabilitacion')
            ->withTimestamps();
    }
}