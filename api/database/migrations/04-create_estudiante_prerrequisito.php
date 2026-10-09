<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estudiante_prerrequisito', function (Blueprint $table) {
            $table->foreignUuid('id_prerrequisito')->constrained('prerrequisitos_examen')->onDelete('cascade');
            $table->foreignUuid('id_estudiante')->constrained('estudiantes')->onDelete('cascade');
            $table->boolean('cumplido')->default(false);
            $table->timestamp('fecha_cumplimiento')->nullable();
            $table->foreignUuid('revisado_por_docente_id')->nullable()->constrained('docente')->nullOnDelete();
            $table->timestamps();

            $table->primary(['id_prerrequisito', 'id_estudiante']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estudiante_prerrequisito');
    }
};