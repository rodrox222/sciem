
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expulsiones', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('id_examen')
                ->constrained('examenes')
                ->restrictOnDelete();

            $table->foreignUuid('id_estudiante')
                ->constrained('estudiantes')
                ->restrictOnDelete();

            $table->text('motivo');

            $table->timestampTz('fecha_hora')->useCurrent();

            // Identifica al docente o auxiliar responsable.
            $table->uuidMorphs('expulsado_por');

            $table->timestampsTz();

            $table->index(['id_examen', 'id_estudiante']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expulsiones');
    }
};
