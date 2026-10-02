<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('estudiante_examen', function (Blueprint $table) {
            $table->text('motivo_inhabilitacion')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('estudiante_examen', function (Blueprint $table) {
            $table->dropColumn([
                'motivo_inhabilitacion',
                'updated_at',
            ]);
        });
    }
};