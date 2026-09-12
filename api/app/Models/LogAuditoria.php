<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LogAuditoria extends Model
{
    use HasFactory;

    protected $table = 'logs_auditoria';

    // Desactivar updated_at porque tu tabla solo tiene created_at
    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'accion',
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
}
