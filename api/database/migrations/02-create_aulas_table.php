<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aulas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nombre', 50);
            $table->string('ubicacion', 100);
            $table->string('estado', 20)->default('Disponible'); // ej: Disponible, Mantenimiento, Ocupada
            $table->unsignedSmallInteger('capacidad');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aulas');
    }
};