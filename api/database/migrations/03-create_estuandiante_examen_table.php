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
            $table->enum('estado', ['Habilitado', 'Inhabilitado'])->default('Inhabilitado');
            $table->text('motivo_estado')->nullable();
            
            // Auditoría del docente que forzó el cambio
            $table->boolean('ajuste_manual')->default(false);
            $table->foreignUuid('modificado_por_docente_id')->nullable()->constrained('docente')->nullOnDelete();
            $table->timestamp('fecha_ajuste_manual')->nullable();

            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable();
            
            $table->primary(['id_examen', 'id_estudiante']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estudiante_examen');
    }
};