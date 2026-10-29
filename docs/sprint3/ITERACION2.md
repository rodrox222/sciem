# SCIEM Sprint 3 — Implementación de rescate, iteración 2

Fecha: 2026-10-28. Alcance: HU15, HU16, HU17 y HU20; adaptadores mínimos de autenticación/ingreso necesarios para esas cuatro HU.

## Base y requisito corregido

Base exacta: `03700d8aa2f6296ea871e5a5ac8c1b20a1a2a549`, árbol `41a8bccafe1b040c2907e5a44c2ef6d53993c505`, de `integration/develop-exnayra-sprint3-20261028` en el sandbox. La copia local se verificó por SHA de cada blob y del árbol completo; se recuperó también el objeto commit original y se verificó su SHA. Sus padres son `8aacedf`, `b77445d` y `d1c614d`. No se fabricó un merge ni se reemplazó la historia por un snapshot. Git local tiene un límite shallow en ese commit; GitHub conserva los ancestros completos.

Rama de entrega: `rescue/sprint3-iteracion2-20261028`, exclusivamente en `MiguelVarMer/sciem-frontend-integracion`. No se modifica `rodrox222/sciem:ExNayra-PrimoLukas` ni `Develop` en esta fase. Ambos HEAD oficiales se revalidan antes de publicar y siguen en `b77445d` y `d1c614d`, respectivamente. No hace falta otro merge con esos HEAD.

**Aclaración vinculante del usuario/cliente:** edición y eliminación de expulsiones SÍ son necesarias aunque no estén reflejadas en el TXT. Quedan sustituidos HU15-G12 y H09 del dossier de iteración 1, así como sus instrucciones de rechazar PATCH/DELETE. Se conserva PATCH; se agrega DELETE. No se modifica el TXT original ni se pierde la evidencia del requisito anterior.

Decisiones de implementación explícitas: eliminación lógica con motivo, responsable y auditoría; edición y eliminación durante la misma ventana temporal que ya tenía la edición. El ingreso previo se conserva. Una expulsión eliminada deja de bloquear por EXPULSADO, pero no autoriza a duplicar un ingreso ya registrado. Si hay duplicados históricos activos, eliminar uno no elimina los otros. No se declaran falsos ni se borran incidentes históricos automáticamente.

## Cambios concretos

- `RolOperativo` resuelve un único rol del token y comprueba cuenta activa y roles disponibles. Los tokens duales antiguos requieren volver a iniciar sesión; no se revocan masivamente. Login, `/me`, middleware, listados privados, autorización por examen y dashboard usan ese contrato. Auxiliar Estudiante usa `examen_auxiliar` con `Activo`; el modelo Auxiliar legado conserva su pivote propio.
- Se retira la ruta pública `/seed-render-now` sin ejecutarla.
- `AccesoExamen` concentra propiedad, asignación y horario boliviano. `OperacionExamen` bloquea la fila del examen dentro de una transacción para los productores QR/manual/offline y las escrituras HU15. Se escoge bloqueo por examen, más simple de verificar que bloqueos heterogéneos; la contención debe medirse en fase 3.
- HU15 identifica inscritos con elegibilidad oficial sin registrar ingresos. Verifica firma HMAC y expiración del formato emitido actualmente; conserva identificación JSON SIS. Registro exige inscripción e ingreso previo; duplica con 409. PATCH guarda motivo anterior/nuevo y DELETE conserva la fila con `deleted_at`. Historial incluye todas las filas, filtros, responsable, motivo original y ediciones; sus consultas evitan N+1 de responsables/auditorías.
- La interfaz conserva formularios, cámara y diseño. Lista todos los inscritos y muestra quién aún no puede ser expulsado; historial independiente por nombre/SIS/estado, edición y eliminación con confirmación. Usa desfase del reloj servidor y bloquea cierre mientras se guarda. El POST/PATCH/DELETE vuelve a validar en servidor.
- `AsistenciaExamen` define inscritos actuales + primer log PERMITIDO. HU16, HU17 y métricas de asistencia HU20 consultan esa misma relación. No se generan logs históricos artificiales ni se cambian silenciosamente datos de la BD existente. El script preflight cuantifica discrepancias.
- HU16 entrega resumen y listas de una misma instantánea. La revisión incluye identidad/contenido, no solo cantidades; listas se omiten si no cambian. Frontend conserva polling secuencial, pausa en pestaña oculta y temporizador de inactividad, y cancela transporte al desmontar.
- HU17 conserva filtros por fecha del examen, seis indicadores, 24 franjas, cuatro hojas XLSX y PDF. Usa listado privado para seleccionar examen. Las lecturas de cada respuesta/exportación comparten transacción PostgreSQL REPEATABLE READ READ ONLY. Los filtros aplicados no cambian.
- HU20 mantiene un endpoint y una UI. Separa errores por métrica/listado con savepoints; `null` significa fallo y no cero. Caché file de 60 s para cifras lentas/admin y metadatos de exámenes. El rol y las asignaciones se revalidan en cada solicitud; IDs y versiones de asignación forman la clave. Asistencia no se almacena en ese caché. File evita escrituras en la transacción PostgreSQL de solo lectura.
- Productores compartidos: ingreso manual valida alcance/ventana y registra causas negativas para HU17; QR/manual rechazan expulsión antes de duplicado. Se conservan restricciones de módulo cuando `id_auxiliar` está presente. Offline conserva su flujo y recibe solo guardas de inscripción, habilitación, expulsión y tiempo del evento; no se implementan colas ni pantallas HU21.

## Migración y datos

Nueva: `api/database/migrations/2026_10_28_120000_guardar_vigencia_y_baja_expulsiones.php`.

1. Añade `deleted_at`, `motivo_eliminacion` y `rol_responsable` a expulsiones.
2. Añade `expulsion_vigencias` con PK única `(id_examen,id_estudiante)` y FK al incidente vigente.
3. Inicializa una referencia por pareja sin borrar ni modificar incidentes antiguos. Todos los duplicados históricos siguen visibles.
4. Trigger PostgreSQL mantiene la vigencia en inserción/baja y bloquea nuevos duplicados mediante la PK, incluso fuera del controlador.
5. Índice parcial por `detalles->>'expulsion_id'` en auditoría para consultar ediciones sin escanear todo el historial.

**No aplicada a una BD real en esta iteración.** Antes de aplicar en BD existente: backup probado, `migrate:status`, ejecutar `php scripts/sprint3-preflight.php`, revisar esquema, duplicados, asistencia/proyección y auditoría. El preflight es solo lectura y no imprime PII. Las migraciones viejas no se editan ni se repiten.

El `down()` de la nueva migración se niega explícitamente a destruir historial. No ejecutar rollback genérico. Una vez que existan eliminaciones lógicas, volver a un controlador antiguo que ignore `deleted_at` reactivaría incidentes visualmente: el rollback debe conservar los adaptadores de baja lógica y la migración. Antes de uso real, se puede revertir el cambio completo de código solo si se verifica que no se registraron nuevas bajas/operaciones.

## Verificación ejecutada y límites

| Comprobación | Resultado actual |
| --- | --- |
| `npm --prefix gui ci` | Dependencias instaladas desde lockfile, sin cambios de versiones |
| `npm --prefix gui run build` | PASS TS/Vite; advertencia de bundle >500 kB, sin ampliación de alcance para dividir módulos ajenos |
| ESLint de los 10 archivos frontend modificados | PASS |
| Sintaxis PHP de app/rutas/migraciones/tests nuevos/scripts | 124 archivos, cero errores |
| `php vendor/bin/phpunit -c phpunit.sprint3.xml --testsuite Sprint3Unit` | 10 pruebas, 40 aserciones, PASS |
| `node --test gui/tests/sprint3.test.cjs` | 4 pruebas, PASS |
| PHPUnit existente | 2 pruebas base, 2 aserciones, PASS; no certifican las HU |
| `php artisan test` | exit 0; aviso por falta de `.env` local, sin errores de aplicación en los dos ejemplos |
| Rutas Laravel | Registro/PATCH/DELETE y productores comparten middleware; ruta de seeding ausente |
| `git diff --check` | PASS |
| Suite Sprint3Postgres | 8 pruebas preparadas, SKIP por entorno; NO contadas como aprobadas |
| Docker/PowerShell y SQL de migración | Preparados, no ejecutados en este host |
| Visual, cámara, concurrencia real y rendimiento completo | Pendientes de iteración 3 |

Se prepararon PHP 8.3 y Composer locales y se instalaron dependencias backend. PostgreSQL se descargó pero `initdb` rechaza root; el host no permite cambiar a un usuario sin privilegios. No se usó la BD/Docker del usuario ni se simuló una certificación PostgreSQL con SQLite. El entorno Docker de QA separado resuelve ese requisito para la siguiente fase.

## Ejecutar la suite PostgreSQL aislada

Desde la raíz del checkout, con Docker Desktop y Node/npm disponibles:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\SCIEM_Sprint3_QA.ps1
```

El script genera claves temporales, usa únicamente el proyecto Docker `sciem-sprint3-qa`, PostgreSQL en tmpfs y servicios `db-qa`/`api-qa` sin puertos públicos. No monta `data/pg_data`; configura explícitamente la conexión QA, ignora cachés de configuración/rutas existentes y monta el código de API como lectura. No ejecuta semillas generales, fresh, wipe ni borra registros de la BD de trabajo. Los fixtures de Feature se revierten por transacción. El bootstrap se niega a adoptar una BD no vacía sin marcador de QA. `--fail-on-skipped` impide aprobar una suite incompleta.

La suite PostgreSQL cubre alta/edición/eliminación/historial, duplicado, reingreso, auxiliar/dual/revocación, motivo aislado, ventana, QR sin escritura, asistencia coherente incluso con proyección divergente, XLSX/PDF, rollback de auditoría, 300 alumnos y reutilización de caché. No reemplaza la carrera real de dos procesos ni la comprobación visual.

Se recuperaron y adaptaron los tres scripts históricos en `scripts/SCIEM_Sprint3_QA_API_v2.ps1`, `SCIEM_Sprint3_QA_Roles.ps1` y `SCIEM_Sprint3_QA_Negativas.ps1`. Exigen IDs explícitos de fixtures; no contienen IDs históricos ni credenciales. Roles exige escenarios propios/ajenos y añade PDF propio y auxiliar asignado. Negativas exige estudiante inscrito y examen en horario y verifica `errors.motivo`. No se ejecutaron estas variantes PowerShell en esta sesión; el antiguo 39/39 no se traslada a ellas.

## Pendientes exclusivos de fase 3

- Ejecutar Docker QA y resolver cualquier error de migración/SQL/contrato; los SKIP no son aceptación.
- Revisar preflight/backup de la BD que vaya a integrarse; no deduplicar ni reconciliar sin evidencia.
- Dos procesos concurrentes: doble expulsión, expulsión vs ingreso y alta vs eliminación; comprobar filas y auditoría, no solo HTTP.
- QA HTTP completa por cuatro roles, login real y tokens duales antiguos; error parcial inducido y reasignación durante TTL.
- Medir consultas/latencia p50-p95/memoria con 300 alumnos y usuarios simultáneos. El caso de carga preparado registra una medición inicial; no inventa un SLA aprobado.
- Parsear cifras de PDF y todas las hojas XLSX frente a SQL/API en la misma instantánea, franjas y límites horarios; descargas repetidas/fallidas.
- Verificar en navegador HU15 registro/edición/eliminación/QR, HU16 polling y 5 minutos de inactividad, HU17 desktop/390 px y HU20 cuatro roles. Preservar el diseño actual; corregir solo fallos observados.
- Reconsultar HEAD oficiales, integrar cambios nuevos en sandbox si aparecen, repetir regresión afectada y recién entonces publicar `ExNayra-PrimoLukas` y abrir PR hacia `Develop`. Sin force ni push directo a Develop.

## Matriz de las 37 Tasks después de implementar

Cada fila describe código presente o conservado. Ninguna declara aceptación integral de producto; los escenarios PostgreSQL/visuales pendientes se enumeran arriba.

| Task | Capa | Cambio o conservación | Estado de salida |
| --- | --- | --- | --- |
| T15.1 | Backend | Migración incremental, baja lógica y vigencia única con trigger; conserva duplicados históricos. | Código candidato; verificación integral pendiente |
| T15.2 | Backend | Modelo conserva relaciones y añade SoftDeletes, motivo de eliminación y rol responsable. | Código candidato; verificación integral pendiente |
| T15.3 | Backend | GET específico por examen: nombre/SIS y QR firmado; elegibilidad oficial y cero escrituras. | Código candidato; verificación integral pendiente |
| T15.4 | Backend | Alta con alcance, horario, inscripción, ingreso previo, transacción y auditoría atómica. | Código candidato; verificación integral pendiente |
| T15.5 | Backend | Historial completo paginado con filtros, responsables precargados y ediciones en lote. | Código candidato; verificación integral pendiente |
| T15.6 | Backend | 409 duplicado, reingreso EXPULSADO, bloqueo común; edición/eliminación autorizadas por aclaración del cliente. | Código candidato; verificación integral pendiente |
| T15.7 | Frontend | Todos los inscritos, QR firmado, estados de elegibilidad, cancelación y reloj servidor. | Código candidato; verificación integral pendiente |
| T15.8 | Frontend | Conserva formulario/confirmación; reloj servidor y bloqueo del cierre durante envío. | Código candidato; verificación integral pendiente |
| T15.9 | Frontend | Historial independiente, todas las filas, filtros; conserva edición y añade eliminación con motivo. | Código candidato; verificación integral pendiente |
| T15.10 | Integración/QA | Suite PostgreSQL de flujo/negativas/rollback preparada; carrera y cámara pendientes. | QA de fase 3 pendiente |
| T16.1 | Backend | Servicio común de asistencia: inscritos + primer PERMITIDO; sin modificar eventos históricos. | Código candidato; verificación integral pendiente |
| T16.2 | Backend | Totales y listas del mismo universo y misma respuesta versionada. | Código candidato; verificación integral pendiente |
| T16.3 | Backend | Conserva endpoint por estado; utiliza consulta canónica y devuelve revisión. | Código candidato; verificación integral pendiente |
| T16.4 | Backend | Mantiene admin/docente titular; UUID controlado y rol efectivo. | Código candidato; verificación integral pendiente |
| T16.5 | Backend | Conserva agregación e índices existentes; medición de consultas/300 preparada. | Código candidato; verificación integral pendiente |
| T16.6 | Backend/Frontend | Polling secuencial con revisión de contenido; omite listas sin cambios. | Código candidato; verificación integral pendiente |
| T16.7 | Frontend | Tarjetas/nodos/etapas/diseño conservados; QA temporal/visual pendiente. | Código candidato; verificación integral pendiente |
| T16.8 | Frontend | Listas/búsqueda/pestañas conservadas y conectadas al snapshot consistente. | Código candidato; verificación integral pendiente |
| T16.9 | Frontend | Cancela transporte al desmontar; preserva pausa, reintento y timer de inactividad. | Código candidato; verificación integral pendiente |
| T16.10 | Integración/QA | Fixture de ingreso y snapshot preparado; carga simultánea, 5 minutos y visual en fase 3. | QA de fase 3 pendiente |
| T17.1 | Backend | Corrige categorías de rechazo y cobertura de manual; conserva categorías oficiales. | Código candidato; verificación integral pendiente |
| T17.2 | Backend | Totales usan la misma asistencia que HU16/HU20. | Código candidato; verificación integral pendiente |
| T17.3 | Backend | 24 franjas desde fuente canónica; convención horaria histórica requiere preflight/QA. | Código candidato; verificación integral pendiente |
| T17.4 | Backend | Conserva filtros por fecha de examen y 422; identificador de ruta controlado. | Código candidato; verificación integral pendiente |
| T17.5 | Backend | XLSX/PDF conservados con asistencia común y snapshot de lectura. | Código candidato; verificación integral pendiente |
| T17.6 | Backend | Consultas agregadas sin consulta por estudiante; carga/query metrics preparadas. | Código candidato; verificación integral pendiente |
| T17.7 | Frontend | Conserva selector vacío, seis tarjetas y diseño aprobado. | Código candidato; verificación integral pendiente |
| T17.8 | Frontend | Conserva gráfica aprobada; inspección real 390 px pendiente antes de decidir ajustes. | Código candidato; verificación integral pendiente |
| T17.9 | Frontend | Conserva descargas, validación de firma de archivo, timeout y filtros. | Código candidato; verificación integral pendiente |
| T17.10 | Frontend | Selector obtiene listado privado autorizado; conserva validación/cancelación de filtros. | Código candidato; verificación integral pendiente |
| T17.11 | Integración/QA | Suite de coherencia con logs no inscritos y proyección divergente preparada. | QA de fase 3 pendiente |
| T17.12 | Integración/QA | Prueba preparada de XLSX cuatro hojas/acentos y PDF; cotejo completo de cifras y visual en fase 3. | QA de fase 3 pendiente |
| HU20/T1 | Backend | Índices existentes conservados; comprobar EXPLAIN/latencias en PostgreSQL real. | Código candidato; verificación integral pendiente |
| HU20/T2 | Backend | Endpoint por rol operativo, auxiliar asignado/estudiante propio y fallos independientes. | Código candidato; verificación integral pendiente |
| HU20/T3 | Backend | Caché de 60 s para metadatos/métricas lentas, clave por identidad y alcance actual; asistencia fresca. | Código candidato; verificación integral pendiente |
| HU20/T4 | Frontend | Estructura React/ShadCN conservada; fallo no se presenta como cero. | Código candidato; verificación integral pendiente |
| HU20/T5 | Frontend | Render por rol servidor; sección fallida identificable sin descartar las restantes. | Código candidato; verificación integral pendiente |

## Índice de archivos por Task

| Task | Archivos de referencia |
| --- | --- |
| T15.1 | [2026_10_17_182200_create_expulsiones_table.php](../../api/database/migrations/2026_10_17_182200_create_expulsiones_table.php), [Migración nueva](../../api/database/migrations/2026_10_28_120000_guardar_vigencia_y_baja_expulsiones.php) |
| T15.2 | [Expulsion.php](../../api/app/Models/Expulsion.php) |
| T15.3 | [ExpulsionController.php](../../api/app/Http/Controllers/ExpulsionController.php), [DetalleExpulsionesTab.tsx](../../gui/src/components/examenes/DetalleExpulsionesTab.tsx), [expulsiones.service.ts](../../gui/src/services/expulsiones.service.ts) |
| T15.4 | [ExpulsionController.php](../../api/app/Http/Controllers/ExpulsionController.php), [VerificacionController.php](../../api/app/Http/Controllers/VerificacionController.php) |
| T15.5 | [ExpulsionController.php](../../api/app/Http/Controllers/ExpulsionController.php) |
| T15.6 | [ExpulsionController.php](../../api/app/Http/Controllers/ExpulsionController.php), [VerificacionController.php](../../api/app/Http/Controllers/VerificacionController.php), [api.php](../../api/routes/api.php) |
| T15.7 | [DetalleExpulsionesTab.tsx](../../gui/src/components/examenes/DetalleExpulsionesTab.tsx), [expulsiones.service.ts](../../gui/src/services/expulsiones.service.ts) |
| T15.8 | [ExpulsionForm.tsx](../../gui/src/components/examenes/ExpulsionForm.tsx), [horarioExpulsion.ts](../../gui/src/components/examenes/horarioExpulsion.ts) |
| T15.9 | [DetalleExpulsionesTab.tsx](../../gui/src/components/examenes/DetalleExpulsionesTab.tsx), [expulsiones.service.ts](../../gui/src/services/expulsiones.service.ts) |
| T15.10 | [ExpulsionController.php](../../api/app/Http/Controllers/ExpulsionController.php), [VerificacionController.php](../../api/app/Http/Controllers/VerificacionController.php), [DetalleExpulsionesTab.tsx](../../gui/src/components/examenes/DetalleExpulsionesTab.tsx), [ExpulsionForm.tsx](../../gui/src/components/examenes/ExpulsionForm.tsx) |
| T16.1 | [MonitoreoController.php](../../api/app/Http/Controllers/MonitoreoController.php), [ReporteEstadisticoController.php](../../api/app/Http/Controllers/ReporteEstadisticoController.php), [DashboardController.php](../../api/app/Http/Controllers/DashboardController.php), [VerificacionController.php](../../api/app/Http/Controllers/VerificacionController.php) |
| T16.2 | [MonitoreoController.php](../../api/app/Http/Controllers/MonitoreoController.php) |
| T16.3 | [MonitoreoController.php](../../api/app/Http/Controllers/MonitoreoController.php) |
| T16.4 | [MonitoreoController.php](../../api/app/Http/Controllers/MonitoreoController.php), [api.php](../../api/routes/api.php) |
| T16.5 | [MonitoreoController.php](../../api/app/Http/Controllers/MonitoreoController.php), [2026_10_26_032635_add_dashboard_indexes_to_main_tables.php](../../api/database/migrations/2026_10_26_032635_add_dashboard_indexes_to_main_tables.php) |
| T16.6 | [DetalleMonitoreoTab.tsx](../../gui/src/components/monitoreo/DetalleMonitoreoTab.tsx), [MonitoreoController.php](../../api/app/Http/Controllers/MonitoreoController.php) |
| T16.7 | [DetalleMonitoreoTab.tsx](../../gui/src/components/monitoreo/DetalleMonitoreoTab.tsx), [EtapasExamen.tsx](../../gui/src/components/monitoreo/EtapasExamen.tsx), [DetalleExamenPage.tsx](../../gui/src/pages/DetalleExamenPage.tsx) |
| T16.8 | [DetalleMonitoreoTab.tsx](../../gui/src/components/monitoreo/DetalleMonitoreoTab.tsx), [monitoreo.service.ts](../../gui/src/services/monitoreo.service.ts) |
| T16.9 | [DetalleMonitoreoTab.tsx](../../gui/src/components/monitoreo/DetalleMonitoreoTab.tsx), [monitoreo.service.ts](../../gui/src/services/monitoreo.service.ts), [useIdleTimer.ts](../../gui/src/hooks/useIdleTimer.ts) |
| T16.10 | [MonitoreoController.php](../../api/app/Http/Controllers/MonitoreoController.php), [VerificacionController.php](../../api/app/Http/Controllers/VerificacionController.php), [DetalleMonitoreoTab.tsx](../../gui/src/components/monitoreo/DetalleMonitoreoTab.tsx) |
| T17.1 | [ReporteEstadisticoController.php](../../api/app/Http/Controllers/ReporteEstadisticoController.php), [VerificacionController.php](../../api/app/Http/Controllers/VerificacionController.php) |
| T17.2 | [ReporteEstadisticoController.php](../../api/app/Http/Controllers/ReporteEstadisticoController.php) |
| T17.3 | [ReporteEstadisticoController.php](../../api/app/Http/Controllers/ReporteEstadisticoController.php) |
| T17.4 | [ReporteEstadisticoController.php](../../api/app/Http/Controllers/ReporteEstadisticoController.php) |
| T17.5 | [ReporteEstadisticoController.php](../../api/app/Http/Controllers/ReporteEstadisticoController.php) |
| T17.6 | [ReporteEstadisticoController.php](../../api/app/Http/Controllers/ReporteEstadisticoController.php), [2026_10_26_032635_add_dashboard_indexes_to_main_tables.php](../../api/database/migrations/2026_10_26_032635_add_dashboard_indexes_to_main_tables.php) |
| T17.7 | [ReportesEstadisticosPage.tsx](../../gui/src/pages/ReportesEstadisticosPage.tsx), [TarjetasEstadisticas.tsx](../../gui/src/components/reportes/TarjetasEstadisticas.tsx) |
| T17.8 | [GraficoFranjas.tsx](../../gui/src/components/reportes/GraficoFranjas.tsx), [reportes.service.ts](../../gui/src/services/reportes.service.ts) |
| T17.9 | [ReportesEstadisticosPage.tsx](../../gui/src/pages/ReportesEstadisticosPage.tsx), [reportes.service.ts](../../gui/src/services/reportes.service.ts), [api.ts](../../gui/src/services/api.ts) |
| T17.10 | [ReportesEstadisticosPage.tsx](../../gui/src/pages/ReportesEstadisticosPage.tsx), [reportes.service.ts](../../gui/src/services/reportes.service.ts), [ExamenController.php](../../api/app/Http/Controllers/ExamenController.php) |
| T17.11 | [ReporteEstadisticoController.php](../../api/app/Http/Controllers/ReporteEstadisticoController.php), [MonitoreoController.php](../../api/app/Http/Controllers/MonitoreoController.php), [DashboardController.php](../../api/app/Http/Controllers/DashboardController.php), [ReportesEstadisticosPage.tsx](../../gui/src/pages/ReportesEstadisticosPage.tsx) |
| T17.12 | [ReporteEstadisticoController.php](../../api/app/Http/Controllers/ReporteEstadisticoController.php), [ReportesEstadisticosPage.tsx](../../gui/src/pages/ReportesEstadisticosPage.tsx), [reportes.service.ts](../../gui/src/services/reportes.service.ts) |
| HU20/T1 | [2026_10_26_032635_add_dashboard_indexes_to_main_tables.php](../../api/database/migrations/2026_10_26_032635_add_dashboard_indexes_to_main_tables.php), [MonitoreoController.php](../../api/app/Http/Controllers/MonitoreoController.php), [DashboardController.php](../../api/app/Http/Controllers/DashboardController.php) |
| HU20/T2 | [DashboardController.php](../../api/app/Http/Controllers/DashboardController.php), [AuthController.php](../../api/app/Http/Controllers/AuthController.php), [ExamenController.php](../../api/app/Http/Controllers/ExamenController.php), [CheckRole.php](../../api/app/Http/Middleware/CheckRole.php) |
| HU20/T3 | [DashboardController.php](../../api/app/Http/Controllers/DashboardController.php) |
| HU20/T4 | [DashboardUnificado.tsx](../../gui/src/components/dashboard/DashboardUnificado.tsx), [dashboard.service.ts](../../gui/src/services/dashboard.service.ts), [DashboardPage.tsx](../../gui/src/pages/DashboardPage.tsx) |
| HU20/T5 | [DashboardUnificado.tsx](../../gui/src/components/dashboard/DashboardUnificado.tsx), [dashboard.service.ts](../../gui/src/services/dashboard.service.ts), [App.tsx](../../gui/src/App.tsx), [ProtectedRoute.tsx](../../gui/src/components/ProtectedRoute.tsx) |

## Commits de implementación

- Backend: [`0db384e`](https://github.com/MiguelVarMer/sciem-frontend-integracion/commit/0db384e6da316c2ffce388d68da6463331b5f13f), hijo directo de `03700d8`.
- Frontend y contratos: [`ced0247`](https://github.com/MiguelVarMer/sciem-frontend-integracion/commit/ced02479643a473d0fbf3f09029ecb9ea1e3c8f5); árbol verificado local/remoto `43c6aab30b959266823c685f68aa604168df7fb3`.
- QA/documentación: commit final de esta entrega, sin cambios en ramas oficiales.

Los árboles enviados a GitHub se contrastan con `git write-tree`; no se publican dependencias, builds, configuración privada ni datos de usuarios.
