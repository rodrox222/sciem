<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incidencias', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('id_examen')->constrained('examenes')->cascadeOnDelete();
            $table->foreignUuid('id_estudiante')->nullable()->constrained('estudiantes')->nullOnDelete();
            $table->foreignUuid('id_aula_asignada')->nullable()->constrained('aulas')->nullOnDelete();
            
            $table->string('tipo_incidencia'); 
            $table->text('descripcion')->nullable();
            
            $table->uuid('autor_id');
            $table->string('autor_tipo');
            
            $table->timestamps();
        });

        Schema::create('noticias', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('titulo');
            $table->text('contenido');
            
            $table->foreignUuid('id_examen')->nullable()->constrained('examenes')->nullOnDelete();
            
            $table->boolean('es_publica')->default(true);
            
            $table->uuid('autor_id');
            $table->string('autor_tipo');
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('noticias');
        Schema::dropIfExists('incidencias');
    }
};