# Guía de prueba frontend - HU-04 a HU-07

Esta guía valida la rama `feature/frontend-hu04-hu07-miguel` sin modificar el backend.

## 1. Preparar el proyecto

1. Abrir Git Bash en la carpeta del repositorio.
2. Ejecutar:

   ```bash
   git fetch origin
   git switch feature/frontend-hu04-hu07-miguel
   git pull origin feature/frontend-hu04-hu07-miguel
   ```

3. Crear los dos archivos locales indicados en el `README.md` del proyecto:
   - `.env` en la raíz, usado por PostgreSQL/Docker.
   - `api/.env`, usado por Laravel.
4. No agregar ni subir esos archivos a Git.
5. Con Docker Desktop iniciado, ejecutar desde la raíz:

   ```bash
   docker compose up -d --build
   ```

6. Si la base de datos todavía no fue creada en esa computadora:

   ```bash
   docker exec -it sciem_api php artisan migrate
   docker exec -it sciem_api php artisan db:seed
   ```

7. Abrir `http://localhost:4173`.

## 2. Verificación técnica rápida

Desde la carpeta `gui`:

```bash
npm install
npm run lint
npm run build
```

Los dos últimos comandos deben finalizar sin errores.

## 3. HU-04 - Catálogo de aulas

Ingresar como administrador y abrir **Aulas**.

| Caso | Acción | Resultado esperado |
|---|---|---|
| Listado | Abrir el módulo | Los datos provienen de la API y muestran nombre, ubicación, capacidad y estado. |
| Búsqueda | Buscar por nombre o ubicación | Solo aparecen coincidencias. |
| Filtro | Elegir Disponible, Mantenimiento u Ocupada | Solo aparecen aulas con ese estado. |
| Registro válido | Completar todos los campos | Aparece confirmación y el aula persiste al recargar. |
| Campos vacíos | Confirmar sin nombre o ubicación | El formulario muestra el error junto al campo. |
| Capacidad inválida | Usar 0, negativo o decimal | El formulario rechaza el dato. |
| Duplicado | Registrar exactamente el mismo nombre | Se informa que el ambiente ya existe. |
| Edición | Cambiar ubicación o capacidad | Los cambios persisten al recargar. |
| Mantenimiento | Usar la acción de la tarjeta | El estado cambia después de confirmar y persiste. |

## 4. HU-05 - Catálogo de normas

Ingresar como administrador o docente y abrir **Normas**.

| Caso | Acción | Resultado esperado |
|---|---|---|
| Listado | Abrir el módulo | Se muestran título, descripción y tipo desde la API. |
| Búsqueda | Buscar una palabra del título o descripción | Solo aparecen coincidencias. |
| Tipo | Filtrar General o Particular | Solo aparecen normas de ese tipo. |
| Registro | Completar título, descripción y tipo | Aparece confirmación y la norma persiste. |
| Espacios | Escribir únicamente espacios | El registro se rechaza. |
| Docente | Registrar con perfil docente | El formulario utiliza el tipo Particular. |
| Edición | Modificar una norma permitida | Se actualiza el mismo registro sin duplicarlo. |

## 5. HU-06 - Programación de exámenes

Ingresar como administrador o docente y abrir **Exámenes**.

| Caso | Acción | Resultado esperado |
|---|---|---|
| Catálogo | Abrir Exámenes | Aparecen datos reales, paginación y filtros. |
| Fecha pasada | Seleccionar una fecha anterior | El formulario rechaza la fecha. |
| Duración | Usar 0 o un valor negativo | El formulario rechaza la duración. |
| Hora final | Cambiar inicio o duración | La hora final se recalcula inmediatamente. |
| Aula | Intentar guardar sin aula | Se muestra el error junto al selector. |
| Normas | Intentar guardar sin normas | Se exige al menos una norma. |
| Programación válida | Completar todos los datos | Se crea el examen y se asocian sus normas. |
| Persistencia | Recargar Exámenes | El examen continúa visible. |
| Solapamiento | Usar la misma aula, fecha y horario de otro examen | Se muestra el conflicto completo y no se guarda. |
| Reprogramación | Editar aula, fecha u horario | Se revalida el conflicto y persisten los cambios. |
| Detalle | Presionar Ver | Se muestran materia, fecha, horario, aula, docente y normas. |

## 6. HU-07 - Gestión de estudiantes

Abrir **Estudiantes** o usar **Estudiantes** desde la tarjeta de un examen.

| Caso | Acción | Resultado esperado |
|---|---|---|
| Búsqueda | Buscar nombre, apellido, CI o SIS | Se muestran las coincidencias de la API. |
| Obligatorios | Omitir nombre, apellido paterno, SIS, CI o correo | Cada error aparece junto al campo. |
| Formato CI | Usar caracteres especiales o más de una letra final | El CI se rechaza. |
| CI permitido | Usar números y una letra final | El formato se acepta. |
| Correo inválido | Escribir un correo sin formato válido | El formulario lo rechaza. |
| SIS duplicado | Repetir un código SIS | Se informa el duplicado junto al campo. |
| CI duplicado real | Repetir CI y complemento exactos | Se informa el duplicado real. |
| Registro válido | Completar los datos | Aparece confirmación y persiste al recargar. |
| Examen | Abrir estudiantes desde un examen | Se muestran solo los vinculados a esa evaluación. |
| Habilitación | Agregar o editar dentro del examen | Se guarda como Habilitado o Inhabilitado. |

### Hallazgo HU-07: dominio del correo institucional (2026-09-17)

En la sesión docente, al inscribir a Ana López (SIS `202104590`, CI `8234568A`) en `EXAMEN-QA-DOCENTE`, el correo `ana@gmail.com` fue aceptado y el registro apareció en la lista. El formulario indicaba «Correo institucional». La validación del frontend ahora exige el dominio estudiantil `@est.umss.edu` al crear o editar estudiantes.

**Pendiente del equipo de backend:** las solicitudes `POST /api/estudiantes` y `POST /api/examenes/{id}/estudiantes` validan el formato del correo, pero no su dominio. Una petición directa al API puede registrar correos externos. Este hallazgo no se corrige en la API desde la rama de frontend. El dato de prueba de Ana fue corregido desde la interfaz a `202104590@est.umss.edu`; el listado mostró la dirección institucional después de guardar.

### Evidencia HU-07: duplicados y registro válido (2026-09-17)

En `EXAMEN-QA-DOCENTE`, con Ana López (SIS `202104590`, CI `8234568A`) registrada, el intento de agregar a Luis con el mismo SIS mostró «El código SIS ya está registrado.» junto al campo. Al usar SIS `202104591` y repetir CI `8234568A` sin complemento, el formulario mostró «El CI y complemento ya están registrados.» junto al CI. El listado continuó mostrando un solo estudiante tras ambos rechazos.

Al registrar a Luis Vargas con SIS `202104591`, CI `8234569A` y correo `202104591@est.umss.edu`, el listado mostró dos estudiantes habilitados, Ana y Luis. Tras recargar la página, Ana y Luis continúan visibles y el total sigue en dos. Al buscar el SIS `202104591`, solo aparece Luis; el contador de habilitados visibles indica uno por efecto del filtro y el total registrado permanece en dos.

### Evidencia HU-07: estudiantes por examen (2026-09-17)

Al abrir Estudiantes desde `EXAMEN-QA-001`, el listado mostró únicamente a Carlos Vargas Flores (SIS `202104589`, CI `8234567A`), con un estudiante registrado y cero habilitados porque había sido marcado Inhabilitado. Ana y Luis, registrados en `EXAMEN-QA-DOCENTE`, no aparecen en ese examen. Después, se editó a Carlos para volver a Habilitado y, tras recargar, los contadores mostraron un registrado y un habilitado.

## 7. Responsive y evidencias

Repetir los flujos principales con las herramientas de desarrollador del navegador:

- móvil de 390 px de ancho;
- tableta de 768 px;
- escritorio de 1366 px o superior.

Comprobar que no exista scroll horizontal, textos superpuestos ni botones cortados. Guardar capturas de:

1. listado inicial;
2. formulario válido;
3. validación de error;
4. confirmación exitosa;
5. registro persistente después de recargar;
6. la misma operación en móvil.

### Evidencia responsive a 390 px (2026-09-17)

En `EXAMEN-QA-DOCENTE`, la lista de Ana y Luis se presenta como tarjetas con SIS, CI, correo y acción de edición visibles. El modal Registrar estudiante cabe en el ancho móvil, permite desplazarse dentro del formulario y, al llegar al final, muestra completo el aviso informativo y las acciones Registrar estudiante y Cancelar. En las capturas revisadas no se observaron campos ni botones recortados horizontalmente.

## 8. Antes de solicitar integración

```bash
git status
git log --oneline --decorate -10
```

Confirmar que la rama sea `feature/frontend-hu04-hu07-miguel` y que no existan archivos `.env` preparados para commit.
