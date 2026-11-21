<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. AULAS / AMBIENTES
        if (!Schema::hasColumn('aulas', 'deleted_at')) {
            Schema::table('aulas', function (Blueprint $table) {
                $table->softDeletes();
            });
        }

        if (Schema::hasColumn('aulas', 'activo')) {
            DB::table('aulas')
                ->where('activo', DB::raw('false'))
                ->orWhere('estado', 'Inactiva')
                ->update(['deleted_at' => now('America/La_Paz')]);

            // Restaurar estado funcional para no dejar el valor residual 'Inactiva'
            DB::table('aulas')
                ->where('estado', 'Inactiva')
                ->update(['estado' => 'Disponible']);

            Schema::table('aulas', function (Blueprint $table) {
                $table->dropColumn('activo');
            });
        }

        // 2. MATERIAS
        if (!Schema::hasColumn('materias', 'deleted_at')) {
            Schema::table('materias', function (Blueprint $table) {
                $table->softDeletes();
            });
        }

        if (Schema::hasColumn('materias', 'activo')) {
            DB::table('materias')
                ->where('activo', DB::raw('false'))
                ->update(['deleted_at' => now('America/La_Paz')]);

            Schema::table('materias', function (Blueprint $table) {
                $table->dropColumn('activo');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('aulas', 'activo')) {
            Schema::table('aulas', function (Blueprint $table) {
                $table->boolean('activo')->default(true);
            });
        }

        if (Schema::hasColumn('aulas', 'deleted_at')) {
            DB::table('aulas')->whereNotNull('deleted_at')->update(['activo' => DB::raw('false')]);
            Schema::table('aulas', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }

        if (!Schema::hasColumn('materias', 'activo')) {
            Schema::table('materias', function (Blueprint $table) {
                $table->boolean('activo')->default(true);
            });
        }

        if (Schema::hasColumn('materias', 'deleted_at')) {
            DB::table('materias')->whereNotNull('deleted_at')->update(['activo' => DB::raw('false')]);
            Schema::table('materias', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }
    }
};