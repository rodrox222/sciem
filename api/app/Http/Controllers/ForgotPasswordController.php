<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Carbon\Carbon;
use App\Models\User;

class ForgotPasswordController extends Controller
{
    /**
     * Paso 1: Solicitar enlace de recuperación vía email.
     */
    public function sendResetLink(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        // Evita enumeración de usuarios registrados (para el qa no moleste)
        if (!$user) {
            return response()->json([
                'message' => 'Si el correo electrónico existe en el sistema, recibirá un enlace de recuperación.'
            ], 200);
        }

        // Generar token criptográfico unico
        $plainToken = Str::random(64);

        // Guardar hash en password_reset_tokens
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => Hash::make($plainToken),
                'created_at' => Carbon::now(),
            ]
        );


        //cambiar eso a futuro a la url de frontend
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $resetUrl = "{$frontendUrl}/reset-password?token={$plainToken}&email=" . urlencode($user->email);

        // Enviar correo real por Gmail SMTP
        Mail::send('emails.reset-password', ['user' => $user, 'resetUrl' => $resetUrl], function ($message) use ($user) {
            $message->to($user->email)
                    ->subject('Restablecimiento de Contraseña - SCIE-M');
        });

        
        DB::table('logs_auditoria')->insert([
            'user_id'        => $user->id,
            'accion'         => 'PASSWORD_RESET_SOLICITADO',
            'ip_origen'      => $request->ip() ?? '127.0.0.1',
            'detalles'       => json_encode(['email' => $user->email]),
            'created_at'     => now(),
        ]);

        return response()->json([
            'message' => 'Si el correo electrónico existe en el sistema, recibirá un enlace de recuperación.'
        ], 200);
    }

    /**
     * Paso 2: Cambiar la contraseña validando el token.
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $errorResponse = $this->validateResetRequest($request);
        if ($errorResponse) {
            return $errorResponse;
        }

        $user = User::where('email', $request->email)->first();

        // Actualizar clave hasheada
        $user->forceFill([
            'password' => Hash::make($request->password),
        ])->save();

        // Revocar sesiones anteriores
        $user->tokens()->delete();

        // Eliminar token para garantizar un solo uso
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        // Auditoría
        DB::table('logs_auditoria')->insert([
            'user_id'        => $user->id,
            'accion'         => 'PASSWORD_RESET_EXITOSO',
            'ip_origen'      => $request->ip() ?? '127.0.0.1',
            'detalles'       => json_encode(['mensaje' => 'Contraseña actualizada y tokens revocados']),
            'created_at'     => now(),
        ]);

        return response()->json([
            'message' => 'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.'
        ], 200);
    }

    /**
     * Valida el token y las restricciones de tiempo/existencia.
     */
    private function validateResetRequest(Request $request)
    {
        $errorResponse = null;
        $record = DB::table('password_reset_tokens')->where('email', $request->email)->first();

        if (!$record) {
            $errorResponse = response()->json(['message' => 'El enlace de recuperación es inválido o ya ha sido utilizado.'], 400);
        } elseif (Carbon::parse($record->created_at)->addMinutes(60)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            $errorResponse = response()->json(['message' => 'El enlace de recuperación ha expirado. Solicite uno nuevo.'], 400);
        } elseif (!Hash::check($request->token, $record->token)) {
            $errorResponse = response()->json(['message' => 'El token proporcionado no es válido.'], 400);
        } elseif (!User::where('email', $request->email)->exists()) {
            $errorResponse = response()->json(['message' => 'Usuario no encontrado.'], 404);
        }

        return $errorResponse;
    }
}
