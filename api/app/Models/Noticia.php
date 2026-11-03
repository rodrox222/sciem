<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Noticia extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'noticias';

    protected $fillable = [
        'titulo',
        'contenido',
        'publico_objetivo',
        'es_publica',
        'autor_id',
        'autor_tipo',
        'id_examen',
    ];

    protected function casts(): array
    {
        return [
            'es_publica' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function autor()
    {
        return $this->morphTo(__FUNCTION__, 'autor_tipo', 'autor_id');
    }

    public function examen()
    {
        return $this->belongsTo(Examen::class, 'id_examen');
    }
}