<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('estudiantes', 'password')) {
            Schema::table('estudiantes', function (Blueprint $table) {
                $table->string('password')->nullable();
            });
        }

        if (!Schema::hasColumn('estudiantes', 'foto_perfil_url')) {
            Schema::table('estudiantes', function (Blueprint $table) {
                $table->string('foto_perfil_url')->nullable();
            });
        }

        if (!Schema::hasColumn('estudiantes', 'primer_acceso_completado')) {
            Schema::table('estudiantes', function (Blueprint $table) {
                $table->boolean('primer_acceso_completado')->default(false);
            });
        }

        if (!Schema::hasColumn('estudiantes', 'es_auxiliar')) {
            Schema::table('estudiantes', function (Blueprint $table) {
                $table->boolean('es_auxiliar')->default(false);
            });
        }

        if (!Schema::hasColumn('estudiantes', 'remember_token')) {
            Schema::table('estudiantes', function (Blueprint $table) {
                $table->rememberToken();
            });
        }
    }

    public function down(): void
    {
        
    }
};