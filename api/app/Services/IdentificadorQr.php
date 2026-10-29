<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class IdentificadorQr
{
    public static function leer(string $raw, string $idExamen): array
    {
        $raw = trim($raw);
        $fail = fn () => throw ValidationException::withMessages(['qr_data' => 'QR inválido, vencido o de otro examen.']);
        if (str_contains($raw, '.') && ! str_starts_with($raw, '{')) {
            $parts = explode('.', $raw);
            if (count($parts) !== 2) {
                $fail();
            }
            $json = base64_decode($parts[0], true);
            if ($json === false || ! hash_equals(hash_hmac('sha256', $parts[0], config('app.key')), $parts[1])) {
                $fail();
            }
            $data = json_decode($json, true);
            if (! is_array($data) || empty($data['expira_at'])) {
                $fail();
            }
            try {
                $expired = (is_numeric($data['expira_at']) ? CarbonImmutable::createFromTimestamp((int) $data['expira_at'], 'UTC') : CarbonImmutable::parse($data['expira_at']))->isPast();
            } catch (\Throwable) {
                $fail();
            }
            if ($expired) {
                $fail();
            }
        } else {
            $data = json_decode($raw, true);
            if (! is_array($data)) {
                $fail();
            }
        }
        if (isset($data['id_examen']) && $data['id_examen'] !== $idExamen) {
            $fail();
        }
        $id = $data['id_estudiante'] ?? null;
        $sis = $data['codigo_sis'] ?? $data['sis'] ?? null;
        if ($id !== null && (! is_string($id) || ! Str::isUuid($id))) {
            $fail();
        }
        if (! $id && (! is_scalar($sis) || ! preg_match('/^\d{5,15}$/', (string) $sis))) {
            $fail();
        }

        return ['id' => $id, 'sis' => $sis];
    }
}
