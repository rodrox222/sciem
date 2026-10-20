<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('noticias', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('titulo');
            $table->text('contenido');
            
            $table->string('prioridad')->default('Normal'); 
            $table->string('publico_objetivo')->default('Todos'); 
            $table->boolean('es_publica')->default(true);
            
            $table->uuid('autor_id');
            $table->string('autor_tipo');
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('noticias');
    }
};