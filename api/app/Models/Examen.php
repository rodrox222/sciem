<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\Models\Estudiante;


class Examen extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'examenes';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'nombre',
        'id_materia',
        'estado',
        'fecha',
        'hora_ini',
        'hora_fin',
        'id_aula',
        'id_docente',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date',
        ];
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'id_materia');
    }

    public function aula(): BelongsTo
    {
        return $this->belongsTo(Aula::class, 'id_aula');
    }

    public function docente(): BelongsTo
    {
        return $this->belongsTo(Docente::class, 'id_docente');
    }

    public function normas(): BelongsToMany
    {
    return $this->belongsToMany(Norma::class, 'examen_norma', 'id_examen', 'id_norma');
    }

    public function estudiantes(): BelongsToMany
    {
        return $this->belongsToMany(Estudiante::class, 'estudiante_examen', 'id_examen', 'id_estudiante')
            ->withPivot('estado', 'motivo_inhabilitacion')
            ->withTimestamps();
    }
}