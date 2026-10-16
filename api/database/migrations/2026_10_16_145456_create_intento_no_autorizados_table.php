<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('intentos_no_autorizados', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('id_examen');
            
            // Campos separados 
            $table->string('codigo_sis', 20)->nullable();
            $table->string('ci', 20)->nullable();
            $table->string('ci_extension', 10)->nullable();

            // Referencia al estudiante
            $table->uuid('id_estudiante')->nullable();

            // Quién registró el intento (Docente o Auxiliar)
            $table->uuid('registrado_por_id')->nullable();
            $table->string('registrado_por_rol', 50)->nullable(); 

            $table->timestampTz('fecha_hora');
            $table->string('motivo', 255)->default('No matriculado en el examen');
            $table->text('observacion')->nullable();
            $table->timestamps();

            // Llaves foráneas
            $table->foreign('id_examen')
                  ->references('id')
                  ->on('examenes')
                  ->onDelete('cascade');

            $table->foreign('id_estudiante')
                  ->references('id')
                  ->on('estudiantes')
                  ->nullOnDelete();

            // Índices para consultas de alta velocidad en el panel
            $table->index('id_examen');
            $table->index('codigo_sis');
            $table->index('ci');
            $table->index('fecha_hora');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('intentos_no_autorizados');
    }
};