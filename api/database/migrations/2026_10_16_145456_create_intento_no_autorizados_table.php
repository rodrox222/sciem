<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('intentos_no_autorizados', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('id_examen');
            $table->uuid('id_estudiante')->nullable(); 
            $table->string('identificador_presentado', 50)->nullable(); 
            $table->enum('tipo_intento', ['INHABILITADO', 'NO_INSCRITO']);
            $table->text('motivo')->nullable(); 
            $table->string('registrado_por_user_type')->nullable(); 
            $table->uuid('registrado_por_user_id')->nullable();
            $table->timestamp('fecha_hora');
            $table->timestamps();

            $table->foreign('id_examen')->references('id')->on('examenes')->onDelete('cascade');
            $table->foreign('id_estudiante')->references('id')->on('estudiantes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('intentos_no_autorizados');
    }
};