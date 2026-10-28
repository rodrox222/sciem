<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('examenes', function (Blueprint $table) {
            $table->index('id_docente', 'examenes_id_docente_index');
        });

        Schema::table('estudiante_examen', function (Blueprint $table) {
            $table->index('id_estudiante', 'estudiante_examen_id_estudiante_index');
        });

        Schema::table('logs_asistencias', function (Blueprint $table) {
            $table->index(
                ['id_examen', 'resultado', 'fecha_escaneo'],
                'logs_asistencias_examen_resultado_fecha_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('logs_asistencias', function (Blueprint $table) {
            $table->dropIndex('logs_asistencias_examen_resultado_fecha_index');
        });

        Schema::table('estudiante_examen', function (Blueprint $table) {
            $table->dropIndex('estudiante_examen_id_estudiante_index');
        });

        Schema::table('examenes', function (Blueprint $table) {
            $table->dropIndex('examenes_id_docente_index');
        });
    }
};
