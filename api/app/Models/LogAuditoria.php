<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class LogAuditoria extends Model
{
    use HasFactory;

    protected $table = 'logs_auditoria';

    // Desactiva updated_at ya que la migración solo usa created_at
    const UPDATED_AT = null;

    protected $fillable = [
        'user_type', // Requerido para el polimorfismo
        'user_id',
        'accion',
        'ip_origen',
        'detalles',
        // 'user_agent', // Agrega esto solo si lo incluiste en la migración
    ];

    protected $casts = [
        'detalles' => 'array', // Mapea automáticamente el JSONB de PostgreSQL a array PHP
    ];

    /**
     * Obtiene el modelo propietario (Admin, Docente o Auxiliar).
     */
    public function user(): MorphTo
    {
        return $this->morphTo();
    }
}