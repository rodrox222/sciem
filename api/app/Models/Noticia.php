<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Noticia extends Model
{
    use HasUuids;

    protected $table = 'noticias';

    protected $fillable = [
        'titulo',
        'contenido',
        'id_examen',
        'es_publica',
        'autor_id',
        'autor_tipo',
    ];

    protected $casts = [
        'es_publica' => 'boolean',
    ];

    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'id_examen');
    }

    public function autor(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'autor_tipo', 'autor_id');
    }
}