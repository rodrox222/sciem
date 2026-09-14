<?php

namespace App\Http\Controllers;

use App\Models\Auxiliar;
use App\Models\Docente;
use App\Models\LogAuditoria;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ForgotPasswordController extends Controller
{

    /**
     * Solicitar enlace de recuperación vía email.
     */
    public function sendResetLink(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $cuenta = $this->buscarPorEmail($request->email);

        // Previene la enumeración de usuarios
        if (!$cuenta) {
            return response()->json(['message' => 'Si el correo electrónico existe en el sistema, recibirá un enlace de recuperación.'], 200);
        }

        $user = $cuenta['user'];

        // Generar token criptográfico
        $plainToken = Str::random(64);

        // Guardar hash en password_reset_tokens
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token'      => Hash::make($plainToken),
                'created_at' => Carbon::now(),
            ]
        );

        $frontendUrl = env('FRONTEND_URL', 'http://localhost:4173');
        $resetUrl = "{$frontendUrl}/recuperar-contrasena?token={$plainToken}&email=" . urlencode($user->email);

        // Enviar correo SMTP
        Mail::send('emails.reset-password', ['user' => $user, 'resetUrl' => $resetUrl], function ($message) use ($user) {
            $message->to($user->email)
                    ->subject('Restablecimiento de Contraseña - SCI');
        });

        // Registrar auditoría polimórfica
        LogAuditoria::create([
            'user_type' => get_class($user),
            'user_id'   => $user->id,
            'accion'    => 'PASSWORD_RESET_SOLICITADO',
            'ip_origen' => $request->ip() ?? '127.0.0.1',
            'detalles'  => ['email' => $user->email, 'rol' => $cuenta['tipo']],
        ]);

        return response()->json(['message' => 'Si el correo electrónico existe en el sistema, recibirá un enlace de recuperación.'], 200);
    }

    /**
     * Cambiar la contraseña validando el token.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token'    => 'required|string',
            'email'    => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $cuenta = $this->buscarPorEmail($request->email);
        $errorResponse = $this->validateResetRequest($request, $cuenta);

        if ($errorResponse) {
            return $errorResponse;
        }

        $user = $cuenta['user'];

        // Actualizar clave hasheada
        $user->forceFill([
            'password' => Hash::make($request->password),
        ])->save();

        // Revocar tokens y sesiones previas
        $user->tokens()->delete();

        // Eliminar token para garantizar un solo uso
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        // Registrar auditoria
        LogAuditoria::create([
            'user_type' => get_class($user),
            'user_id'   => $user->id,
            'accion'    => 'PASSWORD_RESET_EXITOSO',
            'ip_origen' => $request->ip() ?? '127.0.0.1',
            'detalles'  => [
                'rol'     => $cuenta['tipo'],
                'mensaje' => 'Contraseña actualizada y sesiones revocadas',
            ],
        ]);

        return response()->json([
            'message' => 'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.'
        ], 200);
    }

    /**
     * Valida el token y las restricciones de tiempo y existencia.
     */
    private function validateResetRequest(Request $request, ?array $cuenta): ?JsonResponse
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
        } elseif (!$cuenta) {
            $errorResponse = response()->json(['message' => 'Usuario no encontrado.'], 404);
        }

        return $errorResponse;
    }

    /**
     * Busca la cuenta tanto en docente como en auxiliar
     */
    private function buscarPorEmail(string $email): ?array
    {
        if ($docente = Docente::where('email', $email)->first()) {
            return ['user' => $docente, 'tipo' => 'docente'];
        }

        if ($auxiliar = Auxiliar::where('email', $email)->first()) {
            return ['user' => $auxiliar, 'tipo' => 'auxiliar'];
        }

        return null;
    }
}
