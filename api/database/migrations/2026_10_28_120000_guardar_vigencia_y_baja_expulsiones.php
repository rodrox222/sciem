<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expulsiones', function (Blueprint $table) {
            $table->softDeletesTz();
            $table->text('motivo_eliminacion')->nullable();
            $table->string('rol_responsable', 20)->nullable();
        });
        // La clave única protege la vigencia sin eliminar duplicados históricos.
        Schema::create('expulsion_vigencias', function (Blueprint $table) {
            $table->foreignUuid('id_examen')->constrained('examenes')->restrictOnDelete();
            $table->foreignUuid('id_estudiante')->constrained('estudiantes')->restrictOnDelete();
            $table->foreignUuid('id_expulsion')->constrained('expulsiones')->restrictOnDelete();
            $table->primary(['id_examen', 'id_estudiante']);
        });
        DB::statement('INSERT INTO expulsion_vigencias (id_examen, id_estudiante, id_expulsion)
            SELECT DISTINCT ON (id_examen, id_estudiante) id_examen, id_estudiante, id
            FROM expulsiones WHERE deleted_at IS NULL ORDER BY id_examen, id_estudiante, fecha_hora DESC, id DESC');
        DB::statement("DROP INDEX IF EXISTS logs_auditoria_expulsion_id_idx");
        DB::statement("CREATE INDEX logs_auditoria_expulsion_id_idx ON logs_auditoria ((detalles->>'expulsion_id')) WHERE modulo = 'EXPULSIONES'");

        DB::unprepared(<<<'SQL'
            DROP TRIGGER IF EXISTS sciem_expulsion_vigencia_trigger ON expulsiones;
            CREATE OR REPLACE FUNCTION sciem_expulsion_vigencia() RETURNS trigger AS $$
            DECLARE otra uuid;
            BEGIN
                IF TG_OP = 'INSERT' THEN
                    IF NEW.deleted_at IS NULL THEN
                        INSERT INTO expulsion_vigencias(id_examen, id_estudiante, id_expulsion)
                        VALUES (NEW.id_examen, NEW.id_estudiante, NEW.id);
                    END IF;
                ELSIF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
                    SELECT id INTO otra FROM expulsiones
                    WHERE id_examen = NEW.id_examen AND id_estudiante = NEW.id_estudiante AND deleted_at IS NULL
                    ORDER BY fecha_hora DESC, id DESC LIMIT 1;
                    IF otra IS NULL THEN
                        DELETE FROM expulsion_vigencias WHERE id_examen = NEW.id_examen AND id_estudiante = NEW.id_estudiante;
                    ELSE
                        UPDATE expulsion_vigencias SET id_expulsion = otra
                        WHERE id_examen = NEW.id_examen AND id_estudiante = NEW.id_estudiante;
                    END IF;
                ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
                    INSERT INTO expulsion_vigencias(id_examen, id_estudiante, id_expulsion)
                    VALUES (NEW.id_examen, NEW.id_estudiante, NEW.id);
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            CREATE TRIGGER sciem_expulsion_vigencia_trigger
            AFTER INSERT OR UPDATE OF deleted_at ON expulsiones
            FOR EACH ROW EXECUTE FUNCTION sciem_expulsion_vigencia();
        SQL);
    }

    public function down(): void
    {
        // No descartar anulaciones, motivos ni vigencias durante un rollback de código.
        throw new RuntimeException('Migración con historial auditable: conservar esquema y revertir solo código; preparar reversión de datos revisada.');
    }
};
