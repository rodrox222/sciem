<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Norma extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'normas';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'titulo',
        'descripcion',
        'tipo',
    ];

    public function examenes(): BelongsToMany
    {
        return $this->belongsToMany(Examen::class, 'examen_norma', 'id_norma', 'id_examen');
    }
}