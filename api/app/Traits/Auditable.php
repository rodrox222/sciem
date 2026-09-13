<?php

namespace App\Traits;

use App\Models\LogAuditoria;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

trait Auditable
{
    protected static function bootAuditable(): void
    {
        static::created(function ($model) {
            $model->registrarAuditoria('crear', $model->getAttributes());
        });

        static::updated(function ($model) {
            $model->registrarAuditoria('editar', $model->getChanges());
        });

        static::deleted(function ($model) {
            $model->registrarAuditoria('eliminar', $model->getOriginal());
        });
    }

    protected function registrarAuditoria(string $accion, array $detalles): void
    {
        $usuario = Auth::user();

        LogAuditoria::create([
            'user_id'           => $usuario?->id,
            'rol_en_el_momento' => $usuario?->role?->nombre,
            'usuario_nombre'    => $usuario ? trim($usuario->nombre.' '.$usuario->apellido) : null,
            'usuario_email'     => $usuario?->email,
            'accion'            => $accion,
            'modulo'            => class_basename($this),
            'ip_origen'         => Request::ip(),
            'user_agent'        => Request::userAgent(),
            'detalles'          => $detalles,
        ]);
    }
}
