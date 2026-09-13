<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION prevent_logs_auditoria_modification()
            RETURNS TRIGGER AS $$
            BEGIN
                RAISE EXCEPTION 'Los registros de auditoria son inmutables y no pueden modificarse ni eliminarse';
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER trg_logs_auditoria_no_update
            BEFORE UPDATE ON logs_auditoria
            FOR EACH ROW EXECUTE FUNCTION prevent_logs_auditoria_modification();

            CREATE TRIGGER trg_logs_auditoria_no_delete
            BEFORE DELETE ON logs_auditoria
            FOR EACH ROW EXECUTE FUNCTION prevent_logs_auditoria_modification();
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            DROP TRIGGER IF EXISTS trg_logs_auditoria_no_update ON logs_auditoria;
            DROP TRIGGER IF EXISTS trg_logs_auditoria_no_delete ON logs_auditoria;
            DROP FUNCTION IF EXISTS prevent_logs_auditoria_modification();
        SQL);
    }
};
