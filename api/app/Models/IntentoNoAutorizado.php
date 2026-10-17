<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntentoNoAutorizado extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'intentos_no_autorizados';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id_examen',
        'id_estudiante',
        'identificador_presentado',
        'tipo_intento',
        'motivo',
        'registrado_por_user_type',
        'registrado_por_user_id',
        'fecha_hora',
    ];

    protected function casts(): array
    {
        return [
            'fecha_hora' => 'datetime',
        ];
    }

    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'id_examen');
    }

    public function estudiante(): BelongsTo
    {
        return $this->belongsTo(Estudiante::class, 'id_estudiante');
    }
}