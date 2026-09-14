<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class LogAuditoria extends Model
{
    use HasFactory;

    protected $table = 'logs_auditoria';

    // Como la migración solo tiene created_at (sin updated_at)
    const UPDATED_AT = null;

    protected $fillable = [
        'user_type',
        'user_id',
        'accion',
        'ip_origen',
        'detalles',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'detalles' => 'array', // Convierte automáticamente el JSONB a array asociativo en PHP
            'created_at' => 'datetime',
        ];
    }

    /**
     * Relación polimórfica que resolverá automáticamente a Admin, Docente o Auxiliar.
     */
    public function user(): MorphTo
    {
        return $this->morphTo();
    }
}
