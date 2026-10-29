<!DOCTYPE html>
<html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Consola de Pruebas de Seguridad - SCIEM</title>
        <style>
            body { font-family: monospace; background: #121212; color: #00ff66; padding: 20px; }
            .box { border: 1px solid #333; padding: 15px; margin-bottom: 15px; background: #1e1e1e; }
            input { background: #000; color: #fff; border: 1px solid #555; padding: 8px; width: 350px; margin-bottom: 8px; display: block; }
            button { background: #0088ff; color: #fff; border: none; padding: 8px 16px; cursor: pointer; margin-right: 5px; }
            button.danger { background: #cc0000; }
            pre { background: #000; padding: 10px; border: 1px solid #444; overflow-x: auto; color: #ffcc00; }
        </style>
    </head>
    <body>
        <h2>[Panel de Auditoria y Pruebas de Seguridad]</h2>

        <div class="box">
            <h3>1. Formulario de Autenticacion</h3>
            <label for="email">Email:</label>
            <input type="text" id="email" name="email" value="admin@tis.umss.edu.bo">

            <label for="password">Contraseña:</label>
            <input type="text" id="password" name="password" value="Admin2026*">
            
            <button onclick="ejecutarLogin()">Iniciar Sesión</button>
            <button class="danger" onclick="probarInyeccionSQL()">Cargar Payload SQLi</button>
            <button class="danger" onclick="probarXSS()">Cargar Payload XSS</button>
        </div>

        <div class="box">
            <h3>2. Verificacion de Token y Cierre</h3>
            <button onclick="consultarMe()">Consultar /api/me (Ruta Protegida)</button>
            <button onclick="ejecutarLogout()">Cerrar Sesión (/api/logout)</button>
        </div>

        <div class="box">
            <h3>Salida de Respuesta HTTP:</h3>
            <pre id="output">Esperando accion...</pre>
        </div>

        <script>
            let authToken = '';

            function printLog(data) {
                document.getElementById('output').textContent = JSON.stringify(data, null, 2);
            }

            async function ejecutarLogin() {
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;

                try {
                    const res = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await res.json();
                    if (data.token) {
                        authToken = data.token;
                    }
                    printLog({ status: res.status, body: data });
                } catch (err) {
                    printLog({ error: err.message });
                }
            }

            async function consultarMe() {
                if (!authToken) {
                    printLog({ error: 'No hay token en memoria. Inicie sesión primero.' });
                    return;
                }
                try {
                    const res = await fetch('/api/me', {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        }
                    });
                    const data = await res.json();
                    printLog({ status: res.status, body: data });
                } catch (err) {
                    printLog({ error: err.message });
                }
            }

            async function ejecutarLogout() {
                try {
                    const res = await fetch('/api/logout', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        }
                    });
                    const data = await res.json();
                    authToken = '';
                    printLog({ status: res.status, body: data });
                } catch (err) {
                    printLog({ error: err.message });
                }
            }

            function probarInyeccionSQL() {
                document.getElementById('email').value = "' OR 1=1 --";
                document.getElementById('password').value = "' OR 'a'='a";
            }

            function probarXSS() {
                document.getElementById('email').value = "<script>alert('XSS')<" + "/script>admin@tis.umss.edu.bo";
                document.getElementById('password').value = "Admin2026*";
            }
        </script>
    </body>
</html>