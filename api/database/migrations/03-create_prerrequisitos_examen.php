<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prerrequisitos_examen', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('id_examen')->constrained('examenes')->onDelete('cascade');
            $table->string('titulo', 150);
            $table->text('descripcion')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prerrequisitos_examen');
    }
};