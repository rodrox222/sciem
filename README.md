#GitHub #TIS
# Como instalar el repositorio
Para poder instalar el repositorio se debe hacer lo siguiente
Tener instalado git.
[Ir a la pagina de git](https://git-scm.com/install/windows)

Una vez teniendo instalado la herramienta de git.
Deberán ingresar a git bash y moverse en el directorio que lo desean instalar
Realizar el siguiente comando

```
git clone https://github.com/rodrox222/sciem.git 
```

Con eso tendrian el repositorio instalado
Ya con eso si quieren ingresar directamente desde vscode tendran que hacer lo sigueinte
```
cd sciem
code .
```

Esto ejecutara vscode apuntando a este directorio

---
# Como instalar docker
Debera descargar docker desde su pagina principal o desde la microsoft store
[Ir a la pagina de docker](https://docs.docker.com/desktop/setup/install/windows-install/)

Despues lo ejecutan y con eso lo tendrian
Seguido de eso les pedirá que reinicien su maquina.

Una vez reiniciado deberán ejecutar el siguiente comando

```
wsl -install
```

Ya con todo esto ya deberian tener instalado docker
Ya despues  solo ejecutan docker

---
# Como hacer correr el proyecto

Una vez en el directorio del proyecto

**/sciem**

Deberan ingresar crear las variables de entorno en el directorio raiz y otro en el directorio /api 

Para el **.env** del directorio raiz deberan copiar lo siguiente
[Codigo](https://drive.google.com/file/d/1Dtn8kuVBRAUvKBuUnWvXxmglbCGH1EY8/view?usp=drive_link)
Avisan por dm para darles acceso
Ahora para el .env  del directorio /api 
[Codigo](https://drive.google.com/file/d/1zer89_U1Dk8ObLyq9KrwNN06koE6jhoX/view?usp=drive_link)

Una vez copiado ambos deberan ejecutar lo siguiente
**Ojo deben tener docker corriendo**

```
docker compose up -d --build
```
Con eso ya pueden ir a su puerto local 4173 para ver el proyecto

Ahora para poder crear la base de datos se deben ejecutar el siguiente comando
```
docker exec -it sciem_api php artisan migrate
```

Ahora para poder poblar la base de datos se ejecuta el siguiente comando
```
docker exec -it sciem_api php artisan db:seed
```

Ahora si alguna vez cambias la estructura de la base de datos se realiza el siguiente comando
```
docker exec -it sciem_api php artisan migrate:fresh --seed
```


## Y listo ya estas listo para programar, AHORA PONTE A CHAMBEAR
 

 # Documentación de Endpoints de la API (SCI)

**Host base:** `http://localhost:8200/api`

**Headers requeridos para todas las peticiones:**

- `Accept`: `application/json`
- `Content-Type`: `application/json`
- `Authorization`: `Bearer <token>` (en endpoints protegidos)

---

## 2. Módulo de Aulas

### Listar Aulas

- **Método:** GET
- **Dirección:** `http://localhost:8200/api/aulas`
- **Acceso:** admin, docente, auxiliar
- **Query Params opcionales:** `search` (búsqueda por nombre o ubicación), `estado`, `per_page` (default: 10)
- **Descripción:** Retorna la colección de aulas paginadas.
- **Body:** No aplica.

### Obtener un Aula

- **Método:** GET
- **Dirección:** `http://localhost:8200/api/aulas/{id}`
- **Acceso:** admin, docente, auxiliar
- **Descripción:** Devuelve el detalle del aula cuyo UUID coincide con `{id}`. Retorna 404 si no existe.
- **Body:** No aplica.

### Crear un Aula

- **Método:** POST
- **Dirección:** `http://localhost:8200/api/aulas`
- **Acceso:** admin, docente
- **Descripción:** Registra una nueva aula en el sistema y crea un registro en el log de auditoría.
- **Body:**

```json
{
  "nombre": "Aula 691B",
  "ubicacion": "Edificio Nuevo - Piso 2",
  "estado": "Disponible",
  "capacidad": 45
}
```

### Actualizar Aula

- **Método:** PUT
- **Dirección:** `http://localhost:8200/api/aulas/{id}`
- **Acceso:** admin, docente
- **Descripción:** Actualiza de forma parcial o total los campos permitidos del aula y registra el cambio en auditoría.
- **Body:**

```json
{
  "estado": "Mantenimiento",
  "capacidad": 50
}
```

### Eliminar Aula

- **Método:** DELETE
- **Dirección:** `http://localhost:8200/api/aulas/{id}`
- **Acceso:** admin, docente
- **Descripción:** Elimina físicamente el registro del aula si no viola restricciones de llave foránea con exámenes.
- **Body:** No aplica.

---

## 3. Módulo de Materias

### Listar Materias

- **Método:** GET
- **Dirección:** `http://localhost:8200/api/materias`
- **Acceso:** admin, docente, auxiliar
- **Query Params opcionales:** `search` (filtro por nombre), `per_page`, `all=true` (retorna listado plano sin paginar para selectores del frontend).
- **Descripción:** Devuelve las materias registradas ordenadas alfabéticamente.
- **Body:** No aplica.

### Obtener una Materia

- **Método:** GET
- **Dirección:** `http://localhost:8200/api/materias/{id}`
- **Acceso:** admin, docente, auxiliar
- **Descripción:** Retorna el detalle de la materia junto con el conteo de exámenes asociados (`examenes_count`).
- **Body:** No aplica.

### Crear Materia

- **Método:** POST
- **Dirección:** `http://localhost:8200/api/materias`
- **Acceso:** admin, docente
- **Descripción:** Crea una nueva materia con validación de nombre único.
- **Body:**

```json
{
  "nombre": "Sistemas de Información I"
}
```

### Actualizar Materia

- **Método:** PUT
- **Dirección:** `http://localhost:8200/api/materias/{id}`
- **Acceso:** admin, docente
- **Descripción:** Modifica el nombre de la materia ignorando su propio ID en la validación de duplicados.
- **Body:**

```json
{
  "nombre": "Sistemas de Información II"
}
```

### Eliminar Materia

- **Método:** DELETE
- **Dirección:** `http://localhost:8200/api/materias/{id}`
- **Acceso:** admin, docente
- **Descripción:** Elimina la materia. Si tiene exámenes relacionados, la petición se bloquea con código 422 Unprocessable Entity para proteger la integridad referencial.
- **Body:** No aplica.

---

## 4. Módulo de Exámenes

### Listar Exámenes

- **Método:** GET
- **Dirección:** `http://localhost:8200/api/examenes`
- **Acceso:** admin, docente, auxiliar
- **Query Params opcionales:** `search`, `estado` (Programado, En proceso, Terminado), `fecha` (YYYY-MM-DD), `per_page`.
- **Descripción:** Retorna la lista paginada de exámenes con sus relaciones cargadas de forma eficiente (materia, aula, docente y normas asignadas).
- **Body:** No aplica.

**Probar filtros por Query Params:**

- `http://localhost:8200/api/examenes?estado=Programado`
- `http://localhost:8200/api/examenes?fecha=2026-10-15`
- `http://localhost:8200/api/examenes?search=Parcial`

### Obtener un Examen

- **Método:** GET
- **Dirección:** `http://localhost:8200/api/examenes/{id}`
- **Acceso:** admin, docente, auxiliar
- **Descripción:** Obtiene los datos detallados de un examen, incluyendo la información de la materia, aula, docente responsable y la lista completa de normas asociadas.
- **Body:** No aplica.

### Programar Examen

- **Método:** POST
- **Dirección:** `http://localhost:8200/api/examenes`
- **Acceso:** admin, docente
- **Descripción:** Valida la existencia de las llaves foráneas (`id_materia`, `id_aula`, `id_docente`), valida que `hora_fin` sea posterior a `hora_ini`, registra el examen y genera auditoría.
- **Body:**

```json
{
  "nombre": "Primer Parcial - Grupo 1",
  "id_materia": "a2bf1109-3fc5-404b-8df6-06a52ab343c7",
  "estado": "Programado",
  "fecha": "2026-10-15",
  "hora_ini": "08:15",
  "hora_fin": "10:15",
  "id_aula": "a2be0ff1-b00f-4e10-b19d-60dc807c8c61",
  "id_docente": "9ff5a50f-1eb1-46fc-a651-9a39983f47d9"
}
```

### Actualizar Examen

- **Método:** PUT
- **Dirección:** `http://localhost:8200/api/examenes/{id}`
- **Acceso:** admin, docente
- **Descripción:** Actualiza los campos especificados del examen (ej. cambiar estado a En proceso o reprogramar fechas/horas).
- **Body:**

```json
{
  "estado": "En proceso",
  "hora_fin": "10:30"
}
```

### Eliminar Examen

- **Método:** DELETE
- **Dirección:** `http://localhost:8200/api/examenes/{id}`
- **Acceso:** admin, docente
- **Descripción:** Elimina el examen. Gracias al constraint cascade en la tabla pivote, se limpian automáticamente sus asignaciones de normas en `examen_norma`.
- **Body:** No aplica.

---

## 5. Módulo de Normas y Asignaciones

### Listar Normas

- **Método:** GET
- **Dirección:** `http://localhost:8200/api/normas`
- **Acceso:** admin, docente, auxiliar
- **Query Params opcionales:** `tipo` (General o Particular), `search`, `all=true`.
- **Descripción:** Obtiene las normas disponibles en el sistema con orden descendente por fecha de registro o alfabético.
- **Body:** No aplica.

### Obtener una Norma

- **Método:** GET
- **Dirección:** `http://localhost:8200/api/normas/{id}`
- **Acceso:** admin, docente, auxiliar
- **Descripción:** Retorna el detalle de una norma específica.
- **Body:** No aplica.

### Crear Norma

- **Método:** POST
- **Dirección:** `http://localhost:8200/api/normas`
- **Acceso:** admin, docente
- **Descripción:** Crea una nueva regla de conducta para exámenes. Restricción: los docentes únicamente pueden crear normas de tipo Particular; los administradores pueden crear General o Particular.
- **Body:**

```json
{
  "titulo": "Dispositivos electrónicos prohibidos",
  "descripcion": "Queda prohibido el uso de relojes inteligentes y celulares durante el examen.",
  "tipo": "Particular"
}
```

### Actualizar Norma

- **Método:** PUT
- **Dirección:** `http://localhost:8200/api/normas/{id}`
- **Acceso:** admin, docente
- **Descripción:** Actualiza los datos de la norma. Si un docente intenta modificar una norma de tipo General, el endpoint devuelve un error 403 Forbidden.
- **Body:**

```json
{
  "titulo": "Dispositivos electrónicos y audífonos prohibidos",
  "descripcion": "Queda estrictamente prohibido el uso de auriculares, relojes inteligentes y celulares."
}
```

### Eliminar Norma

- **Método:** DELETE
- **Dirección:** `http://localhost:8200/api/normas/{id}`
- **Acceso:** admin, docente
- **Descripción:** Elimina la norma de la base de datos. Los docentes tienen denegada la eliminación si la norma es de tipo General (403 Forbidden).
- **Body:** No aplica.

### Asignar / Sincronizar Normas a un Examen

- **Método:** POST
- **Dirección:** `http://localhost:8200/api/examenes/{id}/normas`
- **Acceso:** admin, docente
- **Descripción:** Utiliza el método `sync()` de Eloquent sobre la tabla intermedia `examen_norma`. Recibe un arreglo de UUIDs de normas; asocia las nuevas normas enviadas y desvincula las que no estén presentes en el payload.
- **Body:**

```json
{
  "normas": [
    "550e8400-e29b-41d4-a716-446655440000",
    "7c9e6679-7425-40de-944b-e07fc1f90ae7"
  ]
}
```
