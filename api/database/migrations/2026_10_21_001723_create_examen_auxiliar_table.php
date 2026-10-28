<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('examen_auxiliar', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('id_examen');
            $table->uuid('id_auxiliar');

            $table->enum('estado', ['Activo', 'Inactivo'])->default('Activo');
            $table->timestamp('fecha_asignacion')->useCurrent();
            $table->timestamps();

            $table->unique(['id_examen', 'id_auxiliar'], 'unique_examen_auxiliar');

            $table->foreign('id_examen')->references('id')->on('examenes')->onDelete('cascade');
            $table->foreign('id_auxiliar')->references('id')->on('estudiantes')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('examen_auxiliar');
    }
};