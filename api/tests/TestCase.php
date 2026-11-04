<?php

namespace Tests;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    /**
     * Sobrescribimos actingAs para inyectar automáticamente los roles 
     * en el token simulado de Sanctum.
     * Esto evita los falsos 403 del middleware CheckRole durante las pruebas.
     *
     * @param  \Illuminate\Contracts\Auth\Authenticatable  $user
     * @param  string|null  $guard
     * @return $this
     */
    public function actingAs(Authenticatable $user, $guard = null)
    {
        if ($guard === 'sanctum') {
            // Extrae el rol automáticamente del nombre del modelo (Admin, Docente, Auxiliar)
            $rol = strtolower(class_basename($user));
            
            // Sanctum genera un token de prueba con la 'ability' que exige tu CheckRole
            Sanctum::actingAs($user, ["role:{$rol}"]);
            
            return $this;
        }

        return parent::actingAs($user, $guard);
    }
}