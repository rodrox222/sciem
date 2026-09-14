<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estudiante_examen', function (Blueprint $table) {
            $table->foreignUuid('id_examen')->constrained('examenes')->onDelete('cascade');
            $table->foreignUuid('id_estudiante')->constrained('estudiantes')->onDelete('cascade');
            $table->enum('estado', ['Habilitado', 'Inhabilitado'])->default('Habilitado');
            $table->timestamp('created_at')->useCurrent();

            $table->primary(['id_examen', 'id_estudiante']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estudiante_examen');
    }
};
