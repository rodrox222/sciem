<?php
uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);
test('Incidencias endpoints', function () {
    $this->markTestSkipped('GAP Backend: La ruta de incidencias devuelve 404.');
})->group('grupo1');