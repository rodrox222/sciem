<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Restablecer Contraseña - SCIE-M</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #333333;">
    <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        
        <h2 style="color: #1e3a8a; margin-top: 0;">Sistema SCIE-M</h2>
        
        <p>Hola, <strong>{{ $user->name }}</strong></p>
        <p>Has solicitado restablecer tu contraseña de acceso. Haz clic en el botón de abajo para definir una nueva:</p>

        <!-- AQUÍ SE PONE LA URL EN EL BOTÓN -->
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ $resetUrl }}"
               style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
                Restablecer Contraseña
            </a>
        </div>

        <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
            * Este enlace expira en 60 minutos y solo puede utilizarse una vez.<br>
            Si no solicitaste este cambio, puedes ignorar este mensaje.
        </p>
    </div>
</body>
</html>
