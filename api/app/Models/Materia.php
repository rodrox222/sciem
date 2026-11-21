<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Materia extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'materias';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'nombre',
    ];

    protected function casts(): array
    {
        return [];
    }

    public function examenes(): HasMany
    {
        return $this->hasMany(Examen::class, 'id_materia');
    }

    public function docentes(): BelongsToMany
    {
        return $this->belongsToMany(Docente::class, 'docente_materia', 'id_materia', 'id_docente')->withTimestamps();
    }
}
