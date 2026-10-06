<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogAsistencia extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'logs_asistencias';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id_examen',
        'id_estudiante',
        'codigo_sis_escaneado',
        'resultado',
        'mensaje',
        'payload_qr_recibido',
        'fecha_escaneo',
    ];

    protected function casts(): array
    {
        return [
            'payload_qr_recibido' => 'array',
            'fecha_escaneo' => 'datetime',
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