<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            CREATE UNIQUE INDEX logs_asistencias_unico_ingreso
            ON logs_asistencias (id_examen, id_estudiante)
            WHERE resultado = 'PERMITIDO'
        ");
    }

    public function down(): void
    {
        DB::statement("
            DROP INDEX IF EXISTS logs_asistencias_unico_ingreso
        ");
    }
};