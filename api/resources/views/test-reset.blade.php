<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Restablecer Contraseña - Prueba</title>
    <style>
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f2f5; }
        .card { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); width: 320px; }
        input { width: 100%; padding: 8px; margin: 8px 0 16px; box-sizing: border-box; }
        button { width: 100%; padding: 10px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="card">
        <h3>Nueva Contraseña</h3>
        <label>Correo:</label>
        <input type="text" id="email" readonly>

        <label>Nueva Contraseña:</label>
        <input type="password" id="password" placeholder="Mínimo 8 caracteres">

        <label>Confirmar Contraseña:</label>
        <input type="password" id="password_confirmation" placeholder="Repite la contraseña">

        <button onclick="enviar()">Actualizar Contraseña</button>
        <p id="msg" style="margin-top:12px; font-size: 13px;"></p>
    </div>

    <script>
        // Extrae token y email directamente de la URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const email = params.get('email');
        document.getElementById('email').value = email || '';

        async function enviar() {
            const password = document.getElementById('password').value;
            const password_confirmation = document.getElementById('password_confirmation').value;
            const msg = document.getElementById('msg');

            const res = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ email, token, password, password_confirmation })
            });

            const data = await res.json();
            if (res.ok) {
                msg.style.color = 'green';
                msg.innerText = data.message;
            } else {
                msg.style.color = 'red';
                msg.innerText = data.message || 'Error al restablecer';
            }
        }
    </script>
</body>
</html>
