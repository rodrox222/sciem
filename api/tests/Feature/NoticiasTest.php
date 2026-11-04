<?php
use App\Models\Admin;
use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Examen;
use Illuminate\Foundation\Testing\RefreshDatabase;
uses(RefreshDatabase::class);

test('TC-HU14-1: un administrador puede publicar una noticia general pública', function () {
    conRol($this, Admin::factory()->create(['activo' => true]), 'admin')->postJson('/api/noticias', ['titulo' => 'Aviso General', 'contenido' => 'Test', 'publico_objetivo' => 'Todos', 'es_publica' => true])->assertStatus(201);
})->group('grupo1');

test('TC-HU14-2: rechaza que un estudiante intente publicar una noticia', function () {
    $estudiante = Estudiante::factory()->create(['activo' => true]);
    conRol($this, $estudiante, 'estudiante')->postJson('/api/noticias', ['titulo' => 'Intento hacker', 'contenido' => 'Contenido', 'es_publica' => false])->assertStatus(403);
})->group('grupo1');

test('TC-HU14-3: rechaza publicar una noticia para un examen finalizado', function () {
    $examen = Examen::factory()->create(['fecha' => now()->subDay()->toDateString(), 'hora_ini' => '08:00', 'hora_fin' => '10:00']);
    conRol($this, Docente::factory()->create(['activo' => true]), 'docente')->postJson('/api/noticias', ['titulo' => 'Tarde', 'contenido' => 'Tarde', 'es_publica' => false, 'id_examen' => $examen->id])->assertStatus(422);
})->group('grupo1');

test('TC-HU14-4: un docente no puede editar ni eliminar la noticia de otro docente', function () {
    $docenteAutor = Docente::factory()->create(['activo' => true]);
    $noticia = \App\Models\Noticia::create(['titulo' => 'Noticia Original', 'contenido' => 'Contenido', 'autor_id' => $docenteAutor->id, 'autor_tipo' => get_class($docenteAutor)]);
    conRol($this, Docente::factory()->create(['activo' => true]), 'docente')->deleteJson("/api/noticias/{$noticia->id}")->assertStatus(403);
})->group('grupo1');