<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\LogAuditoria;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status'          => session('status'),
        ]);
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $valoresAnteriores = $user->only(array_keys($request->validated()));

        $user->fill($request->validated());

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        LogAuditoria::create([
            'user_type'         => get_class($user),
            'user_id'           => $user->id,
            'rol_en_el_momento' => strtolower(class_basename($user)),
            'usuario_nombre'    => trim("{$user->nombre} {$user->apellido_paterno}"),
            'usuario_email'     => $user->email ?? $user->email_institucional ?? null,
            'modulo'            => 'PERFIL',
            'accion'            => 'PERFIL_ACTUALIZADO',
            'ip_origen'         => $request->ip() ?? '127.0.0.1',
            'user_agent'        => $request->userAgent(),
            'detalles'          => [
                'target_type'        => strtolower(class_basename($user)),
                'target_id'          => $user->id,
                'valores_anteriores' => $valoresAnteriores,
                'valores_nuevos'     => $request->validated(),
            ],
        ]);

        return Redirect::route('profile.edit');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}