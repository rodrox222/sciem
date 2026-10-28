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
