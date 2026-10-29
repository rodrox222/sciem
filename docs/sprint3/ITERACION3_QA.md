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


## Cierre de QA automatizado de iteración 3 (28-10-2026)

**Ejecución verde definitiva:** [GitHub Actions #40727267733](https://github.com/MiguelVarMer/sciem-frontend-integracion/actions/runs/40727267733), commit probado `607cad22e59c1e1a6190f309d9346a13dc881907`, conclusión GitHub `success`. [Artefacto de evidencias](https://github.com/MiguelVarMer/sciem-frontend-integracion/actions/runs/40727267733/artifacts/12834031129): 37 archivos, incluidas capturas desktop/390 px, datos de referencia, preflight, PDF/XLSX, logs HTTP, métricas y JSON de escenarios.

**Resultado confirmado por logs y artefactos, no inferido del build:**

- PostgreSQL 15.10 QA aislada, bootstrap y migraciones incrementales: **PASS**, sin `fresh`, `wipe` ni seed general.
- PHPUnit `phpunit.sprint3.xml`: **18 pruebas, 143 aserciones, 0 skips, PASS**. La excepción de auditoría simulada de una prueba negativa está registrada intencionalmente; valida rollback y no representa una falla de suite. Warning no fatal al intentar guardar caché de PHPUnit bajo `/app:ro`.
- QA HTTP multiconexión: **10 grupos PASS** (`extended.json`): login con admin, docente, auxiliar y estudiante; sesiones duales y token antiguo, cuenta inactiva; aislamiento/alcance y revocación; búsquedas por nombre/apellido/SIS/QR y GET sin escritura; doble alta concurrente 201/409, auditoría única; edición/eliminación auditadas, cierre horario, carreras alta/baja e ingreso/expulsión; productores QR/manual/offline; coherencia SQL de HU16/17/20, 6 métricas, 4 hojas XLSX y 24 franjas; error parcial del dashboard como `null`; 300 estudiantes; conservación de duplicados históricos en backfill.
- Verificación PDF con extracción de texto: **PASS** (6 cifras cotejadas con SQL, tablas, caracteres tildados/ñ, 24 franjas); XLSX real de cuatro hojas y descarga de UI **PASS**.
- Chromium contra HTTP y BD QA: **7 grupos PASS**, incluyendo HU20 cuatro roles en desktop y 390 px, manipulación de rol local sin escalar permisos, error parcial; HU15 cancelación/alta/edición/baja/historial tras recarga, lectura de QR firmado con cámara virtual sin escritura; HU16 polling, pestaña oculta, red caída/restablecida, cambio a examen vacío; HU17 filtros/descargas XLSX/PDF desktop/390 px; **inactividad 5 minutos y logout real con reloj Playwright controlado**. Se comprueba ausencia de desbordamiento horizontal en las capturas.
- Contratos frontend Node: **4/4 PASS, 0 fallos/0 skips**; build TypeScript/Vite: **PASS**. Advertencia no bloqueante de chunk >500 kB. Se preserva diseño aprobado de HU17.

**Medición de rendimiento de esta ejecución:** consulta del fixture 300 estudiantes `11.13 ms`, 2 queries; carga HTTP 20 peticiones con 4 clientes simultáneos `p50=84.29 ms`, `p95=115.39 ms`, memoria del orquestador 35,651,584 bytes. Tres carreras con 2 clientes/2 conexiones bloqueadas cada una; duraciones registradas en `extended.json`. No hay SLA cuantificado aprobado; no generalizar estas cifras a producción.

### Defectos hallados y cambios de la continuación

| Commit en sandbox | Corrección y justificación |
| --- | --- |
| `f4d8517` | Instalación explícita de ffmpeg para cámara QR virtual en CI; el run anterior terminó con `ffmpeg: command not found` |
| `e3192b9` | Test de autorización usaba URL inexistente `/api/usuarios` (404); usa `/api/dashboard/stats` restringida a admin (403) |
| `10c9811` | Inicio de sesión conservaba el nombre pero no `user.id`, ocultando Monitoreo al docente titular; persiste el ID interno y el fixture obtiene identidad real desde `/api/me` |
| `b9c9027` | Incorporación sin sobrescrituras de los cinco archivos cambiados en `rodrox222/sciem:Develop` `d9e52d8` (config BD y cuatro seeders), con SHA de blobs coincidente |
| `021933c` | El test de inactividad verifica primero HEAD real `/api/health` y estabiliza esa respuesta durante el reloj virtual, evitando confundir timeout artificial con desconexión |
| `607cad2` | GitHub Actions cancela runs obsoletos del mismo grupo; solo la ejecución del HEAD vigente sirve como evidencia de cierre |

### Relación Task/CA con archivos y evidencia

La matriz individual de **37 Tasks** y rutas está en `docs/sprint3/ITERACION2.md` y en el documento de continuidad. El código no sustituye la evidencia: los grupos siguientes enlazan esa matriz con pruebas reales.

| Tasks / CA funcionales | Archivos de implementación principales | Evidencia objetiva | Resultado |
| --- | --- | --- | --- |
| HU15 T15.1–T15.6, T15.10: vigencia, búsqueda, permisos, alta, edición/baja solicitadas por cliente, auditoría, duplicados y rollback | Migración `2026_10_28_120000_...`, `ExpulsionController.php`, `Expulsion.php`, `IdentificadorQr.php` | `postgres.txt`, `extended.json`, 8 pruebas feature/10 unitarias | PASS QA aislado |
| HU15 T15.7–T15.9: formulario, cámara/QR, confirmación, historial y responsive | `DetalleExpulsionesTab.tsx`, `ExpulsionForm.tsx`, `gui/src/services/expulsiones.service.ts` | `browser/resultados.json`, capturas `HU15-*.png` | PASS con cámara virtual |
| HU16 T16.1–T16.10: fuente única, totales/listas, permisos, actualización, reconexión, inactividad y móvil | `AsistenciaExamen.php`, `MonitoreoController.php`, `DetalleMonitoreoTab.tsx`, `useIdleTimer.ts` | PHPUnit/HTTP SQL, `browser/HU16-*.png`, inactividad controlada | PASS automatizado |
| HU17 T17.1–T17.12: seis indicadores, filtros, franjas, reportes XLSX/PDF y UI aprobada | `ReporteEstadisticoController.php`, `ReportesEstadisticosPage.tsx` y componentes de reportes | `referencia.json`, `reporte-pdf.txt`, `reporte.xlsx`, `browser/descarga-ui.*`, capturas `HU17-*.png` | PASS automatizado |
| HU20 T1–T5: rol operativo, asignación, caché y errores parciales | `RolOperativo.php`, `DashboardController.php`, `DashboardUnificado.tsx` | tests PHP/HTTP, `browser/HU20-*.png` para cuatro roles y 390 px | PASS automatizado |
| Contratos compartidos necesarios para estas HU | Productores QR/manual/offline, `AuthController.php`, `useLogin.ts` | `extended.json`, pruebas de aislamiento/rollback | PASS limitado al alcance |

### Gates de publicación y límites

| Gate | Estado al cierre de la validación |
| --- | --- |
| G1 matriz Task/CA y decisión del cliente sobre editar/eliminar | Trazada en dossier y aquí; conserva PATCH/DELETE con auditoría |
| G2 conservación de trabajo del equipo | No se borraron ramas ni archivos; integración de cinco novedades oficiales por SHA. Revalidar ancestros y diff en la rama oficial al publicar |
| G3 build, PostgreSQL, PHP/HTTP y frontend sin skips | **PASS** en workflow #40727267733 |
| G4 cuatro roles, asignaciones y aislamiento | **PASS** HTTP/Chromium; identidad del login corregida |
| G5 concurrencia, horario, expulsiones y auditoría | **PASS** en procesos/conexiones QA reales |
| G6 coherencia HU16/HU17/HU20 y PDF/XLSX | **PASS** con SQL/JSON/PDF/XLSX; 24 franjas |
| G7 migración/backfill incremental y preservación | **PASS** en BD desechable, incluidos duplicados. Backup real y preflight de una BD existente siguen siendo requisitos previos al despliegue, NO ejecutados aquí |
| G8 verificación visual | **PASS** Chromium desktop/390 px; QR con cámara virtual. Hardware físico y redes reales no comprobados |
| G9 HEAD oficiales, diff y PR | **BLOQUEADO**: el conector GitHub recibe HTTP 403 `Resource not accessible by integration` al crear blob/tree en `rodrox222/sciem`. No se publicó `ExNayra-PrimoLukas`, no existe PR creado por este rescate. Reconsultar refs antes de intentar desde un cliente con permisos |
| G10 secretos/datos/no destrucción/fuera de alcance | No se modificó BD real ni se publicaron secretos; fixtures aislados y permisos mínimos. CI y evidencia están solo en el sandbox |

**Advertencias sin ocultar:** no se certificaron cámara física, condiciones de red reales, métricas de rendimiento de producción ni respaldo/preflight sobre una BD de despliegue. Los seeders incorporados desde Develop no se ejecutaron porque el QA prohíbe seed general. `npm ci` informó vulnerabilidades en dependencias existentes, que requieren análisis separado y no justifican `npm audit fix --force` fuera de alcance. No ejecutar rollback destructivo: conservar soft delete e historial.

### Estado de integración y transferencia

- Sandbox: rama `rescue/sprint3-iteracion2-20261028`, integró cinco archivos de `Develop` `d9e52d8` sin eliminar otros archivos. Antes de editar esta sección, la diferencia de árboles con `Develop` era 29 archivos nuevos, 33 modificados y 0 eliminados; comparar nuevamente con refs vivos antes del PR.
- La rama `ExNayra-PrimoLukas` del repositorio compartido y su `Develop` no fueron alteradas por esta instancia. Los metadatos de permiso indicaban `push`, pero las operaciones de escritura reales respondieron 403: **prevalece la evidencia de la operación rechazada**.
- Los cambios oficiales de `Develop` se aplicaron como contenidos, no como merge de ancestro Git. Una estación con autorización efectiva debe integrar preservando el historial de `ExNayra-PrimoLukas` y `Develop`, revisar conflictos, ejecutar QA afectado, hacer push sin force y abrir PR `ExNayra-PrimoLukas` → `Develop`. **Nunca ejecutar Merge del PR sin instrucción del equipo.**
- La ejecución QA verde antecede a esta adición documental; este archivo no modifica comportamiento ni invalida las verificaciones ya realizadas.
