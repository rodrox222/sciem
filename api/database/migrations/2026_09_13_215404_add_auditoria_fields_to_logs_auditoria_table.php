<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('logs_auditoria', function (Blueprint $table) {
            $table->string('rol_en_el_momento')->nullable()->after('user_id');
            $table->string('usuario_nombre')->nullable()->after('rol_en_el_momento');
            $table->string('usuario_email')->nullable()->after('usuario_nombre');
            $table->string('modulo')->nullable()->after('accion');
            $table->string('user_agent')->nullable()->after('ip_origen');

            $table->index('created_at');
            $table->index('rol_en_el_momento');
            $table->index('accion');
            $table->index('modulo');
        });
    }

    public function down(): void
    {
        Schema::table('logs_auditoria', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
            $table->dropIndex(['rol_en_el_momento']);
            $table->dropIndex(['accion']);
            $table->dropIndex(['modulo']);

            $table->dropColumn(['rol_en_el_momento', 'usuario_nombre', 'usuario_email', 'modulo', 'user_agent']);
        });
    }
};
