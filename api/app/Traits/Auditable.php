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
            $model->registrarAuditoria('crear');
        });

        static::updated(function ($model) {
            // Ignorar campos automáticos o de control de sesión para no ensuciar la auditoría
            $ignorar = array_merge($model->auditExcept ?? [], [
                'updated_at',
                'ultimo_acceso',
                'password', // Evita registrar cambios o hashes de contraseñas
            ]);

            $cambios = array_diff_key($model->getChanges(), array_flip($ignorar));

            if (empty($cambios)) {
                return;
            }

            $model->registrarAuditoria('editar');
        });

        static::deleted(function ($model) {
            $model->registrarAuditoria('eliminar');
        });
    }

    protected function registrarAuditoria(string $accion): void
    {
        $usuario = Auth::user();

        // Armar nombre completo
        $nombreCompleto = null;
        if ($usuario) {
            $partes = array_filter([
                $usuario->nombre ?? null,
                $usuario->apellido_paterno ?? null,
                $usuario->apellido_materno ?? null,
            ]);
            $nombreCompleto = !empty($partes) ? implode(' ', $partes) : null;
        }

        // Resolver rol según la clase del usuario (admin, docente, auxiliar)
        $rol = $usuario ? strtolower(class_basename($usuario)) : 'sistema';

        // Obtener correo de forma segura
        $emailOIdentificador = $usuario?->email ?? ($usuario ? $usuario->ci : null);

        LogAuditoria::create([
            'user_type'         => $usuario ? get_class($usuario) : null,
            'user_id'           => $usuario?->id, // UUID del usuario
            'rol_en_el_momento' => $rol,          // 'admin', 'docente', 'auxiliar'
            'usuario_nombre'    => $nombreCompleto,
            'usuario_email'     => $emailOIdentificador,
            'modulo'            => class_basename($this), // Nombre de la entidad afectada
            'accion'            => $accion,
            'ip_origen'         => Request::ip(),
            'user_agent'        => Request::userAgent(),
        ]);
    }
}