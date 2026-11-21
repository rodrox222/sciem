<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Gestion extends Model
{
    use HasFactory, HasUuids;

    public const PERIODOS = [
        1 => 'Primer Semestre',
        2 => 'Segundo Semestre',
        3 => 'Verano',
        4 => 'Invierno',
    ];

    protected $table = 'gestiones';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'anio',
        'periodo',
        'codigo',
        'fecha_inicio',
        'fecha_fin',
        'activo',
        'cerrado_en',
    ];

    protected $appends = ['nombre_periodo'];

    protected function casts(): array
    {
        return [
            'anio'         => 'integer',
            'periodo'      => 'integer',
            'fecha_inicio' => 'date:Y-m-d',
            'fecha_fin'    => 'date:Y-m-d',
            'activo'       => 'boolean',
            'cerrado_en'   => 'datetime',
        ];
    }

    public function getNombrePeriodoAttribute(): string
    {
        return self::PERIODOS[$this->periodo] ?? 'Desconocido';
    }

    public function examenes(): HasMany
    {
        return $this->hasMany(Examen::class, 'id_gestion');
    }

    public static function activa(): ?self
    {
        return self::whereRaw('activo is true')->first();
    }

    public function estaVencida(?Carbon $referencia = null): bool
    {
        if (!$this->fecha_fin) {
            return false;
        }

        $hoy = ($referencia ?? Carbon::now('America/La_Paz'))->startOfDay();
        $fin = Carbon::parse($this->fecha_fin->format('Y-m-d'), 'America/La_Paz')->startOfDay();

        return $hoy->greaterThan($fin);
    }

    public function contieneFecha(string $fecha): bool
    {
        if (!$this->fecha_inicio || !$this->fecha_fin) {
            return false;
        }

        $inicio = $this->fecha_inicio->format('Y-m-d');
        $fin = $this->fecha_fin->format('Y-m-d');

        return $fecha >= $inicio && $fecha <= $fin;
    }
}
