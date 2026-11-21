# AGENTS.md — Guía del Proyecto SCIEM

Este documento describe la arquitectura, convenciones, flujo de trabajo y reglas operativas para cualquier agente de IA que colabore en el repositorio **SCIEM** (*Sistema de Control de Ingreso de Exámenes Masivos*).

---

## 1. Descripción General del Proyecto

**SCIEM** es una plataforma web y móvil para gestionar la programación, habilitación, control de ingreso (mediante QR y registro manual), monitoreo en tiempo real, disciplina (expulsiones e intentos no autorizados) y reportes estadísticos de exámenes masivos universitarios.

---

## 2. Stack Tecnológico y Despliegue

* **Backend (`api/`)**:
  * **Laravel 11** (PHP `^8.2`), autenticación con **Laravel Sanctum** (`^4.3`).
  * **Base de datos**: PostgreSQL 15 (`postgres:15.10-alpine` en local).
  * **Librerías clave**: `barryvdh/laravel-dompdf` (reportes/actas PDF), `phpoffice/phpspreadsheet` (carga masiva y exportación Excel), `cloudinary/cloudinary_php` (fotos de estudiantes).
  * **Calidad y testing**: `phpunit/phpunit`, `laravel/pint`, scripts QA en `scripts/` y `api/tests/`.
* **Frontend (`gui/`)**:
  * **React 19** + **TypeScript** + **Vite 8**.
  * **Estilos y UI**: Tailwind CSS v4, **shadcn/ui** (`gui/components.json` con estilo `radix-nova`, `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide`), `radix-ui`, `lucide-react`, `sonner`.
  * **Enrutamiento y HTTP**: `react-router-dom` v7, `axios`.
  * **QR y Modo Offline**: `html5-qrcode`, `qrcode.react`, `dexie` (IndexedDB para padrón y sincronización offline).
  * **Móvil**: **Capacitor Android** (`@capacitor/android`, `@capacitor/core`).
* **Infraestructura**:
  * **Local**: Docker Compose (`docker-compose.yml`) con servicios `sciem_db` (`:5432`), `sciem_api` (`:8200`) y `sciem_gui` (`:4173`).
  * **Producción (CI/CD)**: El repositorio está conectado a **Vercel** (frontend) y **Render** (backend), con despliegue automático al actualizar las ramas correspondientes.

---

## 3. Estructura del Repositorio

```text
sciem/
├── api/                         # Backend Laravel 11
│   ├── app/
│   │   ├── Http/Controllers/    # Controladores REST por módulo
│   │   ├── Http/Middleware/     # CheckRole, OperacionExamen, InstantaneaLectura, etc.
│   │   ├── Models/              # Modelos Eloquent con UUID (Admin, Docente, Auxiliar, Estudiante, Examen, etc.)
│   │   ├── Services/            # Lógica de dominio (AccesoExamen, AsistenciaExamen, IdentificadorQr, RolOperativo)
│   │   └── Traits/              # Auditable, etc.
│   ├── database/
│   │   ├── migrations/          # Esquema PostgreSQL, triggers e índices
│   │   └── seeders/             # Seeders iniciales (Users, Materias, Aulas, Normas, Exámenes, etc.)
│   ├── routes/api.php           # Definición de rutas públicas y protegidas (Sanctum + role)
│   └── tests/                   # Feature, Unit y Sprint3 tests
├── gui/                         # Frontend React + Vite + Capacitor
│   ├── src/
│   │   ├── components/          # Componentes UI y ProtectedRoute
│   │   ├── db/                  # offlineStorage.ts (Dexie / IndexedDB)
│   │   ├── hooks/               # Hooks personalizados (ej. useLogin)
│   │   ├── layouts/             # PublicLayout, MainLayout, AuthLayout
│   │   ├── pages/               # Vistas públicas, estudiante, docente, auxiliar y admin
│   │   ├── services/            # Clientes Axios y sincronización offline
│   │   └── types/               # Tipos TypeScript
│   ├── android/                 # Proyecto Capacitor Android
│   └── tests/                   # Pruebas de integración/navegador (.cjs)
├── scripts/                     # Scripts PowerShell/Python de QA
├── docs/                        # Documentación por sprint
├── docker-compose.yml           # Entorno local (db, api, gui)
└── .clinerules                  # Reglas de seguridad y alcance del repositorio
```

---

## 4. Arquitectura de Dominio y Reglas de Negocio Clave

1. **Esquema multi-actor con UUIDs**:
   * No existe una tabla única `users` para el login operativo; los actores viven en tablas separadas: `admin`, `docente`, `auxiliar` y `estudiantes`.
   * Todos los modelos principales usan **UUID** como clave primaria.
   * El rol autenticado se resuelve dinámicamente según la clase del modelo (`RolOperativo` / `CheckRole`).
   * **Regla de login**: El `admin` inicia sesión con su **CI**, mientras que `docente` y `auxiliar` pueden usar correo o CI.
2. **Auditoría Inmutable (`logs_auditoria`)**:
   * Relación polimórfica (`user_id` + `user_type`) con snapshots (`rol_en_el_momento`, `usuario_nombre`, `usuario_email`).
   * Protegida a nivel de PostgreSQL por el trigger `prevent_logs_auditoria_modification` (rechaza `UPDATE` y `DELETE`) y en Eloquent en `LogAuditoria`.
   * El trait `App\Traits\Auditable` captura automáticamente `created`, `updated` y `deleted`.
3. **Control de Ingreso, Prerrequisitos y Disciplina**:
   * **Prerrequisitos y Habilitación**: Un examen puede tener prerrequisitos que condicionan la habilitación del estudiante (`HabilitacionExamenController`, `PrerrequisitoController`).
   * **Ingreso QR y Manual**: `VerificacionController` + servicios `AccesoExamen`, `AsistenciaExamen` e `IdentificadorQr`. Las rutas de operación crítica usan el middleware `OperacionExamen`.
   * **Expulsiones**: Soportan baja lógica (`softDeletesTz`) y una tabla/trigger de vigencia (`expulsion_vigencias` + `sciem_expulsion_vigencia_trigger`) para proteger el historial auditable.
   * **Intentos no autorizados**: Registrados en `intento_no_autorizados` cuando un estudiante intenta ingresar sin corresponderle o sin habilitación.
4. **Modo Offline (Auxiliares)**:
   * Los auxiliares pueden descargar el padrón (`GET /api/examenes/{id}/descargar-padron`), registrar asistencias localmente en IndexedDB (`gui/src/db/offlineStorage.ts`) y sincronizarlas luego (`POST /api/examenes/{id}/sincronizar-asistencias` mediante `offlineSyncService.ts`).
5. **Monitoreo y Reportes**:
   * Rutas de monitoreo (`MonitoreoController`) y estadísticas (`ReporteEstadisticoController`) usan el middleware `InstantaneaLectura` y generan PDF/Excel/gráficos (incluyendo actas disciplinarias, auditoría de puerta y matriz de habilitación/asistencia).
6. **Catálogos (Materias, Aulas, Normas, Noticias)**:
   * `materias` y `aulas` usan soft deletes. Nota: actualmente `materias` no persiste columna de semestre/gestión en BD (el orden por semestre solo existe como comentario en `MateriaSeeder.php`).
   * `normas` distingue entre `General` (solo admin) y `Particular` (admin o docente).
7. **Convenciones de UI en Frontend (`shadcn/ui`) y Paleta Institucional**:
   * Usar **componentes de shadcn/ui** ubicados en `gui/src/components/ui/` (ya existen `alert`, `alert-dialog`, `badge`, `button`, `card`, `checkbox`, `dialog`, `dropdown-menu`, `input`, `label`, `pagination`, `select`, `skeleton`, `table`, `tabs`, `textarea`, además de `ConfirmDialog` y `SciLogoIcon`).
   * Priorizar reutilizar estos componentes (y agregar nuevos mediante `npx shadcn@latest add <componente>` en `gui/`) en lugar de crear controles UI crudos o duplicados.
   * Mantener el estilo configurado en `gui/components.json` (`radix-nova`, íconos de `lucide-react`, utilidades en `@/lib/utils` y notificaciones con `sonner`).
   * **Paleta de colores y tipografía**: La fuente institucional es `Poppins` (`font-sans`) y los tokens de color están definidos en `gui/tailwind.config.js` (`sci.blue` `#003770`, `sci.red` `#E30613`, `sci.bg` `#F8FAFC`, `sci.dark` `#1E293B`, `sci.muted` `#64748B`, `sci.border` `#E2E8F0`) y en `gui/src/index.css` (variables `--color-sci-*` en OKLCH y tokens CSS de `shadcn/ui`). Evitar colores hardcodeados fuera de estos tokens.

---

## 5. Reglas de Seguridad, Alcance y Entorno (OBLIGATORIO)

Todo agente debe respetar estrictamente las siguientes normas (incluidas las de `.clinerules`):

1. **Sin comandos destructivos**: NUNCA usar `rm`, `rmdir`, `git reset --hard`, `git clean` ni `del /f`.
2. **Ediciones puntuales**: NUNCA eliminar archivos de código existentes; realizar únicamente ediciones puntuales (diffs).
3. **Protección de configuración y secretos**: NO modificar archivos de configuración de base de datos ni los archivos `.env` (`.env`, `api/.env`, `gui/.env`, etc.).
4. **Confirmación explícita**: Si es necesario borrar o renombrar un archivo, solicitar confirmación explícita al usuario primero.
5. **Rama Git**: Trabajar exclusivamente dentro de la rama Git actual salvo indicación contraria del usuario.
6. **NO ejecutar comandos en Docker**: El agente **NO** debe ejecutar comandos dentro de contenedores Docker (`docker exec`, `docker compose up`, migraciones, seeders o `php artisan test` vía Docker). Si se requiere ejecutar un comando en Docker, **indicar el comando exacto al usuario** para que él lo ejecute.

---

## 6. Flujo de Git y Despliegue Automático

* El flujo de integración del proyecto es: **rama de trabajo → `develop` → `main`**.
* Dado que el repositorio tiene despliegue continuo hacia **Vercel** (frontend) y **Render** (backend):
  * Evitar romper el build de TypeScript/Vite (`npm run build` / `tsc -b && vite build` en `gui/`).
  * Cuidar que las migraciones de Laravel sean seguras, reversibles cuando corresponda y compatibles con **PostgreSQL** nativo (evitar sintaxis exclusiva de MySQL/SQLite).
  * Tener en cuenta las rutas protegidas por rol tanto en `api/routes/api.php` como en `gui/src/App.tsx`.

---

## 7. Comandos Útiles (Solo Referencia para Sugerir al Usuario)

Cuando sea necesario pedirle al usuario que ejecute acciones en su entorno Docker:

* **Levantar servicios**: `docker compose up -d --build`
* **Ejecutar migraciones**: `docker exec -it sciem_api php artisan migrate`
* **Ejecutar seeders**: `docker exec -it sciem_api php artisan db:seed`
* **Reiniciar BD en desarrollo**: `docker exec -it sciem_api php artisan migrate:fresh --seed`
* **Correr tests de backend**: `docker exec -it sciem_api php artisan test`
* **Verificar build de frontend** (local en `gui/`): `npm run build` y `npm run lint`
