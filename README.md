# SCIEM
Sistema de control de ingreso de examenes masivos(Sciem)


## Módulo de Auditoría (HU3 — Trazabilidad y Auditoría)

Implementa RF16, RNF4 y RNF6 del pliego: registro automático e inmutable de operaciones del sistema, con historial consultable y filtrable.

### Migraciones

- `0001_01_01_000002_create_logs_auditoria_table` — tabla base (`user_id`, `accion`, `ip_origen`, `detalles`, `created_at`).
- `add_auditoria_fields_to_logs_auditoria_table` — agrega `rol_en_el_momento`, `usuario_nombre`, `usuario_email`, `modulo`, `user_agent`, más índices en `created_at`, `rol_en_el_momento`, `accion` y `modulo` para soportar filtrado a gran volumen sin degradar rendimiento.
- `create_logs_auditoria_immutability_trigger` — crea un trigger de PostgreSQL (`prevent_logs_auditoria_modification`) que rechaza cualquier `UPDATE`/`DELETE` sobre `logs_auditoria`, incluso si se ejecuta fuera de Laravel (SQL directo). Esto garantiza el RNF4 a nivel de base de datos, no solo de aplicación.

**Nota:** `rol_en_el_momento`, `usuario_nombre` y `usuario_email` son snapshots congelados en el momento del evento — no se actualizan si el usuario cambia de rol o se elimina después, por diseño (ver AC6, AC7, AC9, AC11 de la HU).

### Modelo `LogAuditoria`

Bloquea `updating`/`deleting` a nivel de Eloquent (`booted()`) como defensa adicional — la garantía real vive en el trigger de PostgreSQL.

### Trait `Auditable` (`app/Traits/Auditable.php`)

Captura automáticamente `created`/`updated`/`deleted` de cualquier modelo que lo use, registrando quién, qué, cuándo y desde dónde. Excluye siempre `updated_at` (bookkeeping automático de Eloquent) del cálculo de cambios, y cada modelo puede definir `protected array $auditExcept = [...]` para excluir campos propios (ej. `User` excluye `ultimo_acceso` y `password`, para no generar ruido ni exponer hashes en el historial).

**Aplicado actualmente a:** `User`.
**Pendiente:** aplicar a otros modelos críticos (`Examen`, `Aula`, etc.) según se definan con el equipo.

**Cómo aplicarlo a un modelo nuevo:**
```php
use App\Traits\Auditable;

class MiModelo extends Model
{
    use Auditable;
}
```

### Eventos de autenticación (`AuthController`)

Login exitoso, login fallido y logout se registran manualmente vía `LogAuditoria::create()` dentro de `AuthController` (no mediante eventos `Auth::attempt()`, ya que el login de este proyecto valida credenciales manualmente). Acciones registradas: `LOGIN_EXITOSO`, `LOGIN_FALLIDO`, `LOGOUT`.

### Endpoint de consulta (`AuditoriaController`)

`GET /api/auditoria` — protegido por `auth:sanctum` + `role:Administrador` (mismo middleware que ya protege `/api/users`).

**Filtros disponibles (query params, combinables entre sí):**
- `usuario_id`
- `rol` (filtra por `rol_en_el_momento`, no por el rol actual del usuario)
- `accion`
- `modulo`
- `fecha_desde` / `fecha_hasta`
- `per_page` (default 20)

Respuesta paginada con el formato estándar de Laravel (`data`, `current_page`, `last_page`, `total`, etc.).

### Limitaciones conocidas

- Los registros de auditoría son **permanentemente inmutables**, incluida cualquier data de prueba generada durante el desarrollo — no se pueden "limpiar" registros sueltos. Para reiniciar en desarrollo: `php artisan migrate:fresh --seed`.
- El alcance de "operación relevante" a auditar automáticamente (más allá de `User`) queda pendiente de definir con el equipo — el trait está listo para aplicarse a otros modelos cuando se confirme el alcance.
- El AC1 menciona auditar también "consultar un registro crítico" — actualmente solo se cubren `crear`/`editar`/`eliminar`; la auditoría de lecturas críticas requeriría instrumentación manual por endpoint específico, pendiente de definir qué endpoints califican.
