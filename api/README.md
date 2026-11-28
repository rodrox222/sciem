# SCIEM — Backend API (`api/` / `sci_api`)

Backend REST del **Sistema de Control de Ingreso de Exámenes Masivos (SCI)** construido con **Laravel 11** (PHP `^8.2`), **Laravel Sanctum** y **PostgreSQL**.

---

## 1. Archivos y directorios importantes para subir por primera vez

Si vas a comprimir el proyecto en un `.zip` para subirlo por primera vez mediante **net2ftp** / FTP a la carpeta `sci_api/` del servidor:

### Carpetas que SÍ debes incluir
* `app/` — Controladores, modelos, middleware, servicios, comandos Artisan y traits.
* `bootstrap/` — Arranque de Laravel (asegurar permisos de escritura en `bootstrap/cache/`).
* `config/` — Archivos de configuración de Laravel.
* `database/` — Migraciones y seeders.
* `public/` — Punto de entrada HTTP (`index.php`, `.htaccess`, `robots.txt`).
* `resources/` — Vistas Blade (actas/reportes PDF, plantillas).
* `routes/` — Definición de rutas (`api.php`, `web.php`, `console.php`).
* `storage/` — Almacenamiento de archivos, caché, sesiones y logs (asegurar permisos de escritura en `storage/` y que exista `storage/app/public/`).
* `vendor/` — **Incluirla en el `.zip` si el hosting compartido no permite ejecutar Composer**. Si el servidor tiene SSH + Composer, puedes omitir `vendor/` y ejecutar `composer install --no-dev --optimize-autoloader`.

### Archivos de la raíz que SÍ debes incluir
* `artisan`
* `composer.json`
* `composer.lock`
* `.env` — Configurado con las variables de producción del servidor (base de datos, `APP_URL`, `APP_KEY`, `FRONTEND_URL`, correo, etc.). Puedes partir de `.env.example`.

### Qué NO es necesario subir al servidor
* `tests/`, `scripts/`
* `node_modules/`
* `Dockerfile`, `Dockerfile.sprint3-qa`, `.dockerignore`
* `phpunit.xml`, `phpunit.sprint3.xml`
* `vite.config.js`, `package.json`
* `.env.local`, `.env.hibrido`, `.env.nube`, `database.zip`
* `.gitattributes`, `.gitignore`

---

## 2. ¿Dónde colocar el `dist/` compilado de `gui/`?

De acuerdo con [routes/web.php](routes/web.php), Laravel busca automáticamente el `index.html` del frontend compilado en cualquiera de estas ubicaciones:

1. **`sci_api/public/`** (cuando el Document Root del servidor apunta directamente a `sci_api/public`).
2. **`public_html/`** al mismo nivel que `sci_api/` (estructura típica de hosting compartido / net2ftp, por ejemplo: `/htdocs` o `/public_html` junto a `/sci_api`).

### Qué copiar de `gui/dist/`
Copia **todo el contenido interno** de `gui/dist/` (no la carpeta `dist` como tal, sino su contenido):
* `index.html`
* `assets/`
* `apk/sci.apk`
* Cualquier otro archivo estático generado en `gui/dist/`

> **Precaución si lo colocas dentro de `sci_api/public/`:**
> **No borres** `index.php`, `.htaccess`, `robots.txt` ni el acceso simbólico/carpeta `storage/` al subir o actualizar el frontend. Si deseas limpiar builds anteriores, borra únicamente los archivos viejos dentro de `public/assets/` antes de subir el nuevo `.zip`.

---

## 3. Verificaciones recomendadas en el servidor (primera instalación)

Si el servidor cuenta con consola / SSH o panel de tareas programadas:

1. **Enlace público para fotos de estudiantes:**
   ```bash
   php artisan storage:link
   ```
   *(Si el hosting compartido no permite enlaces simbólicos, asegúrate de que `public/storage` apunte o sincronice con `storage/app/public`.)*

2. **Ejecutar migraciones y seeders iniciales:**
   ```bash
   php artisan migrate --force
   php artisan db:seed --force
   ```

3. **Limpiar / regenerar cachés tras subir cambios en rutas o configuración:**
   ```bash
   php artisan optimize:clear
   ```

4. **Programador de tareas (Cron) para limpieza de fotos QR (24 h post-examen):**
   ```bash
   * * * * * cd /ruta/a/sci_api && php artisan schedule:run >> /dev/null 2>&1
   ```
   *(O ejecutar periódicamente `php artisan fotos:limpiar-verificaciones`.)*
