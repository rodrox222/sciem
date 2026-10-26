<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estudiantes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('codigo_sis', 20)->unique();
            $table->string('ci', 20)->nullable();
            $table->string('ci_extension', 10)->nullable();
            $table->string('nombre', 100);
            $table->string('apellido_paterno', 100);
            $table->string('apellido_materno', 100)->nullable();
            $table->string('email_institucional', 150)->unique();
            $table->string('password')->nullable(); 
            $table->string('foto_perfil_url')->nullable();
            $table->boolean('primer_acceso_completado')->default(false);
            $table->boolean('activo')->default(true);
            $table->boolean('es_auxiliar')->default(false);
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estudiantes');
    }
};