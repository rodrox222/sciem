<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\LogAuditoria;
use App\Services\DatabaseBackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BackupController extends Controller
{
    public function __construct(private readonly DatabaseBackupService $backupService)
    {
    }

    public function index(): JsonResponse
    {
        try {
            $this->backupService->asegurarBackupDiario();

            return response()->json([
                'success' => true,
                'backups' => $this->backupService->listarBackups(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $backup = $this->backupService->generarBackup('manual');

            $this->registrarAuditoria($request, 'BACKUP_MANUAL_GENERADO', [
                'archivo'      => $backup['nombre'],
                'tamano_bytes' => $backup['tamano_bytes'],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Respaldo generado correctamente.',
                'backup'  => $backup,
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo generar el respaldo: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function download(Request $request, string $archivo): BinaryFileResponse|JsonResponse
    {
        try {
            $ruta = $this->backupService->obtenerRutaSegura($archivo);

            $this->registrarAuditoria($request, 'BACKUP_DESCARGADO', [
                'archivo' => $archivo,
            ]);

            return response()->download($ruta, $archivo, [
                'Content-Type' => 'application/sql; charset=UTF-8',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        }
    }

    public function restore(Request $request, string $archivo): JsonResponse
    {
        $request->validate([
            'confirmacion' => ['required', 'string', 'in:RESTAURAR'],
        ], [
            'confirmacion.required' => 'Debes escribir RESTAURAR para confirmar.',
            'confirmacion.in'       => 'Debes escribir exactamente RESTAURAR para confirmar.',
        ]);

        try {
            $resultado = $this->backupService->restaurarBackup($archivo);

            $this->registrarAuditoria($request, 'BACKUP_RESTAURADO', [
                'archivo_restaurado' => $resultado['restaurado'],
                'backup_previo'      => $resultado['pre_restore'],
            ]);

            return response()->json([
                'success'     => true,
                'message'     => "Base de datos restaurada al punto {$resultado['restaurado']}. Se creó el respaldo previo {$resultado['pre_restore']}.",
                'restaurado'  => $resultado['restaurado'],
                'pre_restore' => $resultado['pre_restore'],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo restaurar el respaldo: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy(Request $request, string $archivo): JsonResponse
    {
        try {
            $this->backupService->eliminarBackup($archivo);

            $this->registrarAuditoria($request, 'BACKUP_ELIMINADO', [
                'archivo' => $archivo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Respaldo eliminado correctamente.',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        }
    }

    private function registrarAuditoria(Request $request, string $accion, array $detalles = []): void
    {
        $user = $request->user();
        if (!$user instanceof Admin) {
            return;
        }

        $nombreCompleto = trim("{$user->nombre} {$user->apellido_paterno} {$user->apellido_materno}");

        try {
            LogAuditoria::create([
                'user_type'         => get_class($user),
                'user_id'           => $user->id,
                'rol_en_el_momento' => 'admin',
                'usuario_nombre'    => $nombreCompleto !== '' ? $nombreCompleto : $user->nombre,
                'usuario_email'     => $user->email ?? null,
                'modulo'            => 'RESPALDOS',
                'accion'            => $accion,
                'ip_origen'         => $request->ip() ?? '127.0.0.1',
                'user_agent'        => $request->userAgent(),
                'detalles'          => $detalles,
            ]);
        } catch (\Throwable) {
            // No bloquear la operación si falla la auditoría
        }
    }
}
