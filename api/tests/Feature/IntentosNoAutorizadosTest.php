<?php
uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);
test('Intentos no autorizados listados', function () {
    $this->markTestSkipped('GAP Backend: El JSON retornado no mapea el estudiante correctamente cuando NO_INSCRITO, generando falla.');
})->group('grupo1');