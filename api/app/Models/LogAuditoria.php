<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use RuntimeException;

class LogAuditoria extends Model
{
    use HasFactory;

    protected $table = 'logs_auditoria';

    // La migración solo maneja created_at (sin updated_at)
    const UPDATED_AT = null;

    protected $fillable = [
        'user_type',
        'user_id',
        'rol_en_el_momento',
        'usuario_nombre',
        'usuario_email',
        'modulo',
        'accion',
        'ip_origen',
        'user_agent',
        'detalles',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'detalles' => 'array', // Retirar si tu migración final no tiene esta columna
            'created_at' => 'datetime',
        ];
    }

    /**
     * Relación polimórfica que resuelve automáticamente a Admin, Docente o Auxiliar.
     */
    public function user(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Inmutabilidad en la capa de aplicación (defensa en profundidad frente al trigger PL/pgSQL).
     */
    protected static function booted(): void
    {
        static::updating(function () {
            throw new RuntimeException('Los registros de auditoría son inmutables: no se permite actualizar.');
        });

        static::deleting(function () {
            throw new RuntimeException('Los registros de auditoría son inmutables: no se permite eliminar.');
        });
    }
}