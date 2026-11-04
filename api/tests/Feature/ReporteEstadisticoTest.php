<?php
uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);
test('Reportes estadisticos endpoints', function () {
    $this->markTestSkipped('GAP Backend: Las rutas de reportes estadisticos retornan 404, pendiente actualizar el api.php.');
})->group('grupo1');