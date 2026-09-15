<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logs_auditoria', function (Blueprint $table) {
            $table->id();

            // Polimorfismo compatible con UUID (crea user_type y user_id UUID indexados)
            $table->nullableUuidMorphs('user');

            // Snapshot del usuario en el instante del evento
            $table->string('rol_en_el_momento')->nullable();
            $table->string('usuario_nombre')->nullable();
            $table->string('usuario_email')->nullable();

            // Contexto técnico y de navegación
            $table->string('modulo')->nullable();
            $table->string('accion');
            $table->string('ip_origen', 45)->nullable();
            $table->text('user_agent')->nullable();

            // Columna requerida para almacenar la metadata de AuthController y UserController
            $table->jsonb('detalles')->nullable();

            // Marca de tiempo
            $table->timestamp('created_at')->useCurrent();

            // Índices para consultas y filtros de auditoría
            $table->index('created_at');
            $table->index('rol_en_el_momento');
            $table->index('accion');
            $table->index('modulo');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logs_auditoria');
    }
};