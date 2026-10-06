<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logs_asistencias', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // Relación con el examen al que se intenta acceder
            $table->foreignUuid('id_examen')->constrained('examenes')->onDelete('cascade');
            
            // Nullable por si escanean un QR con código SIS inexistente en la BD
            $table->foreignUuid('id_estudiante')->nullable()->constrained('estudiantes')->nullOnDelete();
            $table->string('codigo_sis_escaneado', 30);
            
            // Estados posibles del escaneo
            $table->enum('resultado', [
                'PERMITIDO',
                'RECHAZADO_NO_INSCRITO',
                'RECHAZADO_INHABILITADO',
                'RECHAZADO_YA_INGRESO',
                'ERROR_DATOS_INVALIDOS'
            ]);
            
            $table->string('mensaje', 255);
            $table->json('payload_qr_recibido')->nullable();
            $table->timestamp('fecha_escaneo')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logs_asistencias');
    }
};