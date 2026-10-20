<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Estudiante extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected $table = 'estudiantes';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'codigo_sis',
        'ci',
        'ci_extension',
        'nombre',
        'apellido_paterno',
        'apellido_materno',
        'email_institucional',
        'password',
        'foto_perfil_url',
        'primer_acceso_completado',
        'activo',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'activo'                   => 'boolean',
            'primer_acceso_completado' => 'boolean',
            'password'                 => 'hashed',
        ];
    }

    public function examenes(): BelongsToMany
    {
        return $this->belongsToMany(Examen::class, 'estudiante_examen', 'id_estudiante', 'id_examen')
            ->withPivot('estado', 'motivo_estado', 'ajuste_manual', 'modificado_por_docente_id', 'fecha_ajuste_manual')
            ->withTimestamps();
    }

    public function prerrequisitos(): BelongsToMany
    {
        return $this->belongsToMany(PrerrequisitoExamen::class, 'estudiante_prerrequisito', 'id_estudiante', 'id_prerrequisito')
            ->withPivot('cumplido', 'fecha_cumplimiento', 'revisado_por_docente_id')
            ->withTimestamps();
    }

    public function logsAsistencias(): HasMany
    {
        return $this->hasMany(LogAsistencia::class, 'id_estudiante');
    }

    public static function generarPasswordPorDefecto(string $codigoSis, string $nombre, ?string $paterno = null, ?string $materno = null): string
    {
        $iniciales = '';

        // Primera letra del primer nombre
        $nombres = explode(' ', trim($nombre));
        if (!empty($nombres[0])) {
            $iniciales .= mb_substr($nombres[0], 0, 1);
        }

        // Primera letra del apellido paterno
        if (!empty($paterno)) {
            $iniciales .= mb_substr(trim($paterno), 0, 1);
        }

        // Primera letra del apellido materno
        if (!empty($materno)) {
            $iniciales .= mb_substr(trim($materno), 0, 1);
        }

        return trim($codigoSis) . mb_strtoupper($iniciales);
    }
}