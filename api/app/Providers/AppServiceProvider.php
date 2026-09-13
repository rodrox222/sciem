<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Events\Failed; 
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Request;
use App\Models\LogAuditoria;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
	Event::listen(Login::class, function (Login $event) {
		LogAuditoria::create([
            		'user_id'           => $event->user->id,
            		'rol_en_el_momento' => $event->user->role?->nombre,
            		'usuario_nombre'    => trim($event->user->nombre.' '.$event->user->apellido),
            		'usuario_email'     => $event->user->email,
            		'accion'            => 'inicio_sesion',
            		'modulo'            => 'Autenticacion',
            		'ip_origen'         => Request::ip(),
            		'user_agent'        => Request::userAgent(),
            		'detalles'          => null,
        	]);
    	});

    	Event::listen(Logout::class, function (Logout $event) {
        	LogAuditoria::create([
            		'user_id'           => $event->user?->id,
            		'rol_en_el_momento' => $event->user?->role?->nombre,
            		'usuario_nombre'    => $event->user ? trim($event->user->nombre.' '.$event->user->apellido) : null,
            		'usuario_email'     => $event->user?->email,
            		'accion'            => 'cierre_sesion',
            		'modulo'            => 'Autenticacion',
            		'ip_origen'         => Request::ip(),
            		'user_agent'        => Request::userAgent(),
            		'detalles'          => null,
        	]);
    	});

    	Event::listen(Failed::class, function (Failed $event) {
        	LogAuditoria::create([
            		'user_id'           => $event->user?->id,
            		'rol_en_el_momento' => $event->user?->role?->nombre,
            		'usuario_nombre'    => $event->user ? trim($event->user->nombre.' '.$event->user->apellido) : null,
            		'usuario_email'     => $event->user?->email,
            		'accion'            => 'login_fallido',
            		'modulo'            => 'Autenticacion',
            		'ip_origen'         => Request::ip(),
            		'user_agent'        => Request::userAgent(),
            		'detalles'          => ['email_intentado' => $event->credentials['email'] ?? null],
        	]);
    	});
    }
}
