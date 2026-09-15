<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('examenes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nombre', 150);
            $table->foreignUuid('id_materia')->constrained('materias')->onDelete('restrict');
            $table->enum('estado', ['Programado', 'En proceso', 'Terminado'])->default('Programado');
            $table->date('fecha');
            $table->time('hora_ini');
            $table->time('hora_fin');
            
            // Llaves foráneas con nomenclatura consistente
            $table->foreignUuid('id_aula')->constrained('aulas')->onDelete('restrict');
            $table->foreignUuid('id_docente')->constrained('docente')->onDelete('restrict');
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('examenes');
    }
};
