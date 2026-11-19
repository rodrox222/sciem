<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('noticias', function (Blueprint $table) {
            $table->uuid('id_materia')->nullable()->after('id_examen');
            $table->foreign('id_materia')
                ->references('id')
                ->on('materias')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('noticias', function (Blueprint $table) {
            $table->dropForeign(['id_materia']);
            $table->dropColumn('id_materia');
        });
    }
};
