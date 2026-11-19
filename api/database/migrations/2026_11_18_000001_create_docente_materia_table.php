<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('docente_materia', function (Blueprint $table) {
            $table->uuid('id_docente');
            $table->uuid('id_materia');
            $table->timestamps();

            $table->primary(['id_docente', 'id_materia']);

            $table->foreign('id_docente')
                ->references('id')
                ->on('docente')
                ->onDelete('cascade');

            $table->foreign('id_materia')
                ->references('id')
                ->on('materias')
                ->onDelete('cascade');
        });

        // Población inicial basada en las materias de los exámenes históricos existentes
        $asignaciones = DB::table('examenes')
            ->select('id_docente', 'id_materia')
            ->whereNotNull('id_docente')
            ->whereNotNull('id_materia')
            ->distinct()
            ->get();

        foreach ($asignaciones as $asig) {
            DB::table('docente_materia')->insertOrIgnore([
                'id_docente' => $asig->id_docente,
                'id_materia' => $asig->id_materia,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Asignar al docente por defecto (docente@fcyt.umss.edu.bo) materias clave como 'Introducción a la Programación' y 'Cálculo I'
        $docenteDefault = DB::table('docente')->where('email', 'docente@fcyt.umss.edu.bo')->first();
        if ($docenteDefault) {
            $materiasIds = DB::table('materias')
                ->whereIn('nombre', ['Introducción a la Programación', 'Cálculo I', 'Álgebra I', 'Cálculo II'])
                ->pluck('id');

            foreach ($materiasIds as $materiaId) {
                DB::table('docente_materia')->insertOrIgnore([
                    'id_docente' => $docenteDefault->id,
                    'id_materia' => $materiaId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('docente_materia');
    }
};
