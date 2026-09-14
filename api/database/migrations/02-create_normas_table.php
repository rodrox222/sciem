<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('normas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('titulo', 150);
            $table->text('descripcion');
            $table->enum('tipo', ['General', 'Particular'])->default('General');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('normas');
    }
};
