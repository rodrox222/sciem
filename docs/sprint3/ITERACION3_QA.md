# Iteración 3: seguimiento de QA (2026-10-28)

## Bloqueo de construcción de la imagen QA

La ejecución en Windows confirma que Docker Desktop ya responde mediante el
contexto `desktop-linux`. El build de `api-qa` falla antes de ejecutar Composer,
migraciones o PHPUnit:

```text
ext/xmlreader/php_xmlreader.c:29:10: fatal error: ext/dom/dom_ce.h: No such file or directory
```

El Dockerfile intentaba recompilar `mbstring`, `dom`, `xml`, `xmlreader` y
`xmlwriter`, que la imagen oficial PHP CLI ya incorpora. El registro confirma
`already loaded` para mbstring, dom y xml antes del fallo. El instalador oficial
ejecuta `make clean` después de cada extensión; no es necesario reconstruir esta
familia para SCIEM.

Se compilan únicamente `pdo_pgsql`, `zip`, `gd` y `bcmath`. Una comprobación PHP
durante el build exige además mbstring, DOM, XML, XMLReader, XMLWriter y SimpleXML;
la imagen falla explícitamente si alguna falta. Se retiran las dependencias de
compilación redundantes libonig-dev y libxml2-dev.

Validación: revisión del registro, del Dockerfile oficial y del instalador de
extensiones; comprobación local del guard de extensiones y `git diff --check`.
El entorno de edición no dispone de Docker: la reconstrucción real y las suites
PostgreSQL siguen pendientes de la siguiente ejecución en Windows. Este ajuste
no modifica código funcional, migraciones ni servicios compartidos.

Reejecutar desde la rama `rescue/sprint3-iteracion2-20261028`:

```powershell
git pull --ff-only origin rescue/sprint3-iteracion2-20261028
if ($LASTEXITCODE -eq 0) {
    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\SCIEM_Sprint3_QA.ps1
}
```

No se considera aprobada la suite ni se habilita el PR hacia Develop con esta
corrección del entorno.

## Corrección del bootstrap y preflight (continuación, 2026-10-28)

Base verificada en GitHub: `642ef8127067c9241d79e016db5fb3a8f9410a52`.
La ejecución Windows posterior al arreglo Docker llegó a Composer y falló antes
de migrar con `Target class [Kernel] does not exist`. En ambos scripts, el
`use Illuminate\\Contracts\\Console\\Kernel` aparecía después de
`$app->make(Kernel::class)->bootstrap()`.

Se movieron únicamente los imports al inicio de
`api/scripts/sprint3-test-bootstrap.php` y `api/scripts/sprint3-preflight.php`.
Se conservan las guardas de escritura, entorno, driver, nombre real de BD y
marcador QA; no se ejecutaron migraciones ni semillas sobre datos del usuario.

Validación nueva, con PHP 8.3.6 y las dependencias de composer.lock:

- Lint de ambos scripts: PASS.
- Bootstrap real, APP_ENV=testing, SCIEM_QA_ALLOW_WRITE=0, DB_CONNECTION=pgsql
  y puerto local cerrado: salida 2 y mensaje REFUSADO esperado. Laravel resuelve
  el Kernel antes de esa guarda; no se intenta conectar ni migrar.
- Preflight real con driver configurado mysql: salida 2 y "Se requiere PostgreSQL."
  esperados. Verifica el arranque y la guarda de driver, no una consulta SQL.
- PHPUnit Sprint3Unit: 10 pruebas, 40 aserciones, PASS.
- Contratos frontend: 4 pruebas, PASS.
- TypeScript/Vite build: PASS; continúa el aviso del bundle >500 kB.

Límite del host Work: no dispone de Docker, y `runuser -u nobody -- id`
falla con "cannot set groups: Operation not permitted". Las pruebas anteriores
NO certifican PostgreSQL, migraciones, concurrencia, exportaciones ni QA visual.
Se continuará buscando ejecución aislada; si no está disponible, usar el bloque
PowerShell anterior con esta corrección publicada, nunca con el HEAD viejo.

Reconsulta oficial: Develop avanzó a
`d9e52d8ff78c88659d600e543358eb12c2e62c3d` (Fix:Seeders, cinco archivos:
config/database.php y cuatro seeders); ExNayra-PrimoLukas permanece en
`b77445db084d46738fb06be611e8869b19978991`; no hay PR abiertos en la consulta.
Es necesario integrar esa novedad conservadoramente en el paso 5 y repetir la
regresión afectada. No se ha actualizado ninguna rama oficial ni abierto PR.

## QA remoto disponible: primer fallo de checkout limpio

Se habilitó GitHub Actions solo en la rama de rescate del sandbox, con permisos
de lectura, claves efímeras y el mismo compose aislado. Run 40720748576 construyó
la imagen e inició PostgreSQL 15.10, pero Docker rechazó montar el volumen vendor
porque /app es read-only y api/vendor no existe en un checkout limpio.
Se preparan los directorios de montaje en Actions y PowerShell antes de iniciar
compose. No se cambia el montaje read-only ni se añaden puertos públicos.
Este primer run es FAIL de entorno; no alcanzó migraciones ni PHPUnit.

## PostgreSQL PASS y ampliación de cobertura

Run 40721330761, commit b724f3e: migraciones en PostgreSQL 15.10 PASS;
PHPUnit 18 pruebas / 141 aserciones / cero skips; contratos frontend 4 PASS;
build PASS. Métrica del fixture de 300: 10.65 ms, 2 consultas (sin SLA aprobado).

Run 40722383725: la suite base volvió a aprobar; el QA HTTP ampliado aprobó
login de cuatro roles, sesiones duales, token antiguo/cuenta inactiva, alcance,
revocación, búsqueda y lectura sin escrituras. Dos clientes HTTP/servidores y
conexiones PostgreSQL contendieron: una alta 201, otra 409 y auditoría única.
El historial reveló responsable null al precargar la relación polimórfica:
MorphTo se denominaba expulsado_por, pero el método/carga usaban expulsadoPor.
Se conserva el esquema y se declara el nombre del método con ambas columnas
explícitas. Se añade regresión de responsable.id/rol al historial tras baja.
El lote ampliado no se declara aprobado hasta completar su reejecución.
