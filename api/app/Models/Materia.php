<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Materia extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'materias';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'nombre',
    ];

    public function examenes(): HasMany
    {
        return $this->hasMany(Examen::class, 'id_materia');
    }
}