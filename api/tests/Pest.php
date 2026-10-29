<?php

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(TestCase::class, RefreshDatabase::class)->in('Feature');

if (!function_exists('conRol')) {
    function conRol($testCase,$usuario, $rol) {$token = $usuario->createToken('test', ["role:{$rol}"])->plainTextToken;
        $testCase->withHeader('Authorization', "Bearer {$token}");
        return $testCase;
    }
}