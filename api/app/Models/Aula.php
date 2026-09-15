<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Aula extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aulas';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'nombre',
        'ubicacion',
        'estado',
        'capacidad',
    ];

    protected function casts(): array
    {
        return [
            'capacidad' => 'integer',
        ];
    }
}