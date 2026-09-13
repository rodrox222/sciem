<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('examen_norma', function (Blueprint $table) {
            $table->foreignUuid('id_examen')->constrained('examenes')->onDelete('cascade');
            $table->foreignUuid('id_norma')->constrained('normas')->onDelete('cascade');

            $table->primary(['id_examen', 'id_norma']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('examen_norma');
    }
};