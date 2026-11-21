<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gestiones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->smallInteger('anio');
            $table->smallInteger('periodo'); // 1: Primer Semestre, 2: Segundo Semestre, 3: Verano, 4: Invierno
            $table->string('codigo', 20)->unique(); // Ej: 1-2026, 2-2026, 3-2026, 4-2026
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->boolean('activo')->default(false);
            $table->timestampTz('cerrado_en')->nullable();
            $table->timestampsTz();

            $table->unique(['anio', 'periodo']);
            $table->index(['activo', 'anio', 'periodo']);
        });

        // Garantiza a nivel de PostgreSQL que exista como máximo una gestión activa simultáneamente.
        DB::statement('CREATE UNIQUE INDEX gestiones_una_activa_idx ON gestiones (activo) WHERE activo IS TRUE');

        Schema::table('examenes', function (Blueprint $table) {
            $table->foreignUuid('id_gestion')
                ->nullable()
                ->after('id_docente')
                ->constrained('gestiones')
                ->restrictOnDelete();

            $table->index('id_gestion');
        });

        // Crear gestión inicial 2-2026 y asociar todos los exámenes existentes a ella.
        $gestionId = (string) Str::uuid();
        $now = now();

        DB::table('gestiones')->insert([
            'id'           => $gestionId,
            'anio'         => 2026,
            'periodo'      => 2,
            'codigo'       => '2-2026',
            'fecha_inicio' => '2026-08-01',
            'fecha_fin'    => '2027-01-15',
            'activo'       => DB::raw('true'),
            'cerrado_en'   => null,
            'created_at'   => $now,
            'updated_at'   => $now,
        ]);

        DB::table('examenes')
            ->whereNull('id_gestion')
            ->update(['id_gestion' => $gestionId]);
    }

    public function down(): void
    {
        Schema::table('examenes', function (Blueprint $table) {
            $table->dropForeign(['id_gestion']);
            $table->dropIndex(['id_gestion']);
            $table->dropColumn('id_gestion');
        });

        DB::statement('DROP INDEX IF EXISTS gestiones_una_activa_idx');
        Schema::dropIfExists('gestiones');
    }
};
