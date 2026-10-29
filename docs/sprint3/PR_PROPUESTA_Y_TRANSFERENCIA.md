# SCIEM Sprint 3 — PR preparado, publicación oficial pendiente

**Fecha:** 28-10-2026, `America/La_Paz`. **Rama candidata de sandbox:** `rescue/sprint3-iteracion2-20261028` en `MiguelVarMer/sciem-frontend-integracion`.

## PR a crear desde el repositorio compartido

- **Repositorio:** `rodrox222/sciem`.
- **HEAD requerido:** `ExNayra-PrimoLukas`.
- **BASE requerida:** `Develop`.
- **Título propuesto:** `feat(sprint3): integrar HU15, HU16, HU17 y HU20 con QA PostgreSQL y navegador`.
- **Estado:** NO CREADO. Conector GitHub rechazó creación de blobs/tree en repositorio oficial con HTTP 403 `Resource not accessible by integration`, pese a que los metadatos mostraban `push`. No intentar PR de sandbox independiente directamente a Develop.

### Descripción de PR lista para usar

#### Alcance funcional

- **HU15:** búsqueda de inscritos por nombre/apellido/SIS o QR firmado, registro de expulsión con fecha del servidor y auditoría transaccional, historial paginado, rechazo de duplicados y reingreso; **edición de motivo y eliminación lógica auditada mantenidas por decisión expresa del cliente**. Permisos por rol y examen, horario Bolivia y concurrencia.
- **HU16:** monitoreo basado en inscritos y primer ingreso PERMITIDO; lista y resumen coherentes en la misma instantánea; polling 15 s con revisión, pausa oculta, recuperación de red y sesión de inactividad no renovada por polling.
- **HU17:** métricas coherentes, filtro de fecha, 24 franjas horarias y exportaciones XLSX cuatro hojas/PDF, preservando UI previamente aprobada.
- **HU20:** dashboard por rol operativo confirmado en backend, caché selectiva, autorización por alcance y fallos parciales `null` sin simular ceros.
- **Contratos compartidos mínimos:** productores QR/manual/offline, selección de rol, identificación de docente en login; sin implementar otras HU ni reescribir bases existentes.

#### QA comprobado

- [Workflow CI PASS #40727267733](https://github.com/MiguelVarMer/sciem-frontend-integracion/actions/runs/40727267733) en commit `607cad22e59c1e1a6190f309d9346a13dc881907`.
- [37 archivos de evidencia](https://github.com/MiguelVarMer/sciem-frontend-integracion/actions/runs/40727267733/artifacts/12834031129): capturas HU15/HU16/HU17/HU20 desktop y 390 px, preflight PostgreSQL, informes XLSX/PDF, JSON SQL, logs HTTP y del navegador.
- PostgreSQL 15.10: migraciones incrementales PASS; PHPUnit 18 tests/143 aserciones sin skips; 10 grupos HTTP/SQL/concurrencia PASS; 7 grupos Chromium PASS; 4 contratos frontend PASS y TypeScript/Vite PASS.
- Carga: 300 inscritos, 20 peticiones, 4 usuarios simultáneos: p50 84.29 ms, p95 115.39 ms, sin SLA aprobado.
- QA visual de cámara **virtual**, no verificación de hardware físico. Timer de cinco minutos probado con reloj virtual y logout real.

#### Migración, seguridad y despliegue

- Migración incremental `2026_10_28_120000_guardar_vigencia_y_baja_expulsiones.php`: conserva duplicados históricos, vigencia única, baja lógica y trazabilidad. `down()` impide rollback destructivo. Antes de migrar BD existente: backup recuperable, `migrate:status`, `api/scripts/sprint3-preflight.php` solo lectura y revisión de diferencias.
- Entorno de QA desechable en Docker, sin puertos públicos de BD, sin `migrate:fresh`, `wipe`, `truncate` ni seed general. CI no expone credenciales.
- Dependencias frontend mantienen advertencia de bundle >500 kB y vulnerabilidades npm por evaluar separadamente. No cambiar versiones en este PR fuera de alcance.
- El cambio nuevo en Develop `d9e52d8ff78c88659d600e543358eb12c2e62c3d` (configuración de BD y cuatro seeders) fue incorporado al sandbox con el contenido exacto de los blobs. **No** reemplaza un merge de historia Git con Develop en la rama compartida.

## Integración conservadora desde un clon Windows autorizado

Solo cuando se disponga de credenciales `git push` efectivas a `rodrox222/sciem`. La secuencia prepara una rama LOCAL, no publica sin pasar los controles. Requiere que `origin` sea el sandbox y que `equipo` sea exactamente el repositorio compartido.

```powershell
cd C:\Users\Micky\sciem-trabajo

git status --porcelain
# Si aparece CUALQUIER archivo aquí: detenerse y conservar esos cambios antes de proseguir.
git remote -v
# Comprobar origin = MiguelVarMer/sciem-frontend-integracion
# Comprobar equipo = rodrox222/sciem

git fetch origin rescue/sprint3-iteracion2-20261028
git fetch equipo Develop ExNayra-PrimoLukas
git switch -c integration/sprint3-pr-20261028 equipo/ExNayra-PrimoLukas
git merge --no-ff --no-edit origin/rescue/sprint3-iteracion2-20261028
# Si hay conflictos: resolver sin borrar trabajo; NO pasar automáticamente al siguiente comando.
git merge --no-ff --no-edit equipo/Develop
# Si cambió alguna rama remota desde el último fetch, revalidar antes de publicar.

git status --short
git diff --check equipo/Develop...HEAD
git diff --stat equipo/Develop...HEAD
git diff --exit-code origin/rescue/sprint3-iteracion2-20261028 HEAD
# Se espera un árbol de aplicación equivalente al sandbox; si hay diferencias, revisarlas y repetir QA afectado.

powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\SCIEM_Sprint3_QA.ps1
# Ejecutar el push ÚNICAMENTE tras QA PASS, revisión del diff y HEAD remotos todavía vigentes.
git push equipo HEAD:ExNayra-PrimoLukas
```

El push es deliberadamente **sin force**: Git lo rechazará si otra persona avanzó `ExNayra-PrimoLukas`; reconciliar la novedad en ese caso y repetir pruebas. Crear el PR *en* `rodrox222/sciem` de `ExNayra-PrimoLukas` hacia `Develop`, sin pulsar Merge hasta autorización del equipo.

**Riesgos residuales de aceptación/producción:** antes del despliegue se necesita backup verificable y preflight sobre BD real; no hay cámara física certificada, prueba de internet real ni SLA de producción. Los cinco seeders de Develop no se ejecutaron en QA porque las pruebas se ejecutan sin seed general. Registrar cualquier bloqueo en revisión; no ocultarlo.

**Matriz de Tasks/CA, archivos, gates y resultados:** ver `docs/sprint3/ITERACION2.md` y `docs/sprint3/ITERACION3_QA.md`.
