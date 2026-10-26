<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auxiliar_examen', function (Blueprint $table) {
            $table->foreignUuid('id_auxiliar')
                ->constrained('auxiliar')
                ->restrictOnDelete();

            $table->foreignUuid('id_examen')
                ->constrained('examenes')
                ->restrictOnDelete();

            $table->timestampsTz();

            $table->primary(['id_auxiliar', 'id_examen']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auxiliar_examen');
    }
};
