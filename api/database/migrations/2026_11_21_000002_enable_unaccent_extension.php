<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS unaccent;');
    }

    public function down(): void
    {
        // No borrar la extensión para evitar romper dependencias existentes
    }
};
