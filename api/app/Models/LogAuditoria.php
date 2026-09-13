<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use RuntimeException;

class LogAuditoria extends Model
{
    use HasFactory;

    protected $table = 'logs_auditoria';

    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'rol_en_el_momento',
        'usuario_nombre',
        'usuario_email',
        'accion',
        'modulo',
        'ip_origen',
        'user_agent',
        'detalles',
    ];

    protected $casts = [
        'detalles' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

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
