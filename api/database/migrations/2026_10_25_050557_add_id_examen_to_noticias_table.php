<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('noticias', 'id_examen')) {
            Schema::table('noticias', function (Blueprint $table) {
                // Agregamos la columna como UUID (para que coincida con tus examenes)
                $table->uuid('id_examen')->nullable()->after('es_publica');
                
                // Creamos la llave foránea opcional
                $table->foreign('id_examen')
                      ->references('id')
                      ->on('examenes')
                      ->onDelete('cascade'); // Si borran el examen, la noticia de ese examen también se borra
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('noticias', 'id_examen')) {
            Schema::table('noticias', function (Blueprint $table) {
                $table->dropForeign(['id_examen']);
                $table->dropColumn('id_examen');
            });
        }
    }
};