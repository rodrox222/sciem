import { useCallback, useEffect, useState } from 'react'
import {
  Database,
  Download,
  History,
  LoaderCircle,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { backupService, type BackupItem } from '@/services/backup.service'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const formatFechaHora = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

const tipoBadge = (tipo: BackupItem['tipo']) => {
  switch (tipo) {
    case 'automatico':
      return { label: 'Automático diario', className: 'bg-sci-cyan/15 text-sci-cyan border-sci-cyan/30' }
    case 'pre_restore':
      return { label: 'Pre-restauración', className: 'bg-amber-500/15 text-amber-700 border-amber-500/30' }
    default:
      return { label: 'Manual', className: 'bg-sci-blue/15 text-sci-blue border-sci-blue/30' }
  }
}

export function RespaldosCard() {
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [downloadingName, setDownloadingName] = useState<string | null>(null)

  const [restoreTarget, setRestoreTarget] = useState<BackupItem | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [restoring, setRestoring] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<BackupItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadBackups = useCallback(async () => {
    setLoading(true)
    try {
      const items = await backupService.list()
      setBackups(items)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los respaldos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBackups()
  }, [loadBackups])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const created = await backupService.createManual()
      toast.success(`Respaldo manual generado: ${created.nombre}`)
      await loadBackups()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo generar el respaldo.')
    } finally {
      setCreating(false)
    }
  }

  const handleDownload = async (item: BackupItem) => {
    setDownloadingName(item.nombre)
    try {
      await backupService.download(item.nombre)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al descargar el respaldo.')
    } finally {
      setDownloadingName(null)
    }
  }

  const handleRestore = async () => {
    if (!restoreTarget || confirmText.trim() !== 'RESTAURAR') return
    setRestoring(true)
    try {
      const res = await backupService.restore(restoreTarget.nombre)
      toast.success(res.message)
      setRestoreTarget(null)
      setConfirmText('')
      await loadBackups()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo restaurar el respaldo.')
    } finally {
      setRestoring(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await backupService.remove(deleteTarget.nombre)
      toast.success('Respaldo eliminado correctamente.')
      setDeleteTarget(null)
      await loadBackups()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el respaldo.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card className="border-border shadow-xs">
        <CardHeader className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sci-blue/10 text-sci-blue">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-lg font-bold text-sci-navy">
                Respaldos de Base de Datos (Backups)
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                Se genera un respaldo automático diario a las 02:00 (retención de 14 días). También puedes crear respaldos manuales o restaurar la base de datos a un punto anterior.
              </CardDescription>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
            className="gap-2 bg-sci-blue font-semibold text-white hover:opacity-90 cursor-pointer shrink-0"
          >
            {creating ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {creating ? 'Generando...' : 'Generar backup ahora'}
          </Button>
        </CardHeader>

        <CardContent className="pt-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Cargando respaldos disponibles...
            </div>
          ) : backups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              <History className="mx-auto mb-2 h-8 w-8 opacity-40" />
              Aún no hay respaldos registrados. Pulsa <strong>Generar backup ahora</strong> para crear el primero.
            </div>
          ) : (
            <div className="space-y-2.5">
              {backups.map((item) => {
                const badge = tipoBadge(item.tipo)
                return (
                  <div
                    key={item.nombre}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-mono text-xs font-bold text-sci-navy">
                          {item.nombre}
                        </span>
                        <Badge variant="outline" className={`text-[10px] font-semibold ${badge.className}`}>
                          {badge.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatFechaHora(item.fecha_creacion)} · {formatBytes(item.tamano_bytes)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={downloadingName === item.nombre}
                        onClick={() => void handleDownload(item)}
                        className="gap-1.5 text-xs cursor-pointer"
                      >
                        {downloadingName === item.nombre ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Descargar
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRestoreTarget(item)
                          setConfirmText('')
                        }}
                        className="gap-1.5 border-amber-500/40 text-xs font-semibold text-amber-700 hover:bg-amber-50 cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restaurar
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(item)}
                        className="gap-1 text-xs text-sci-red hover:bg-sci-red/10 hover:text-sci-red cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => {
          if (!restoring && !open) {
            setRestoreTarget(null)
            setConfirmText('')
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sci-red">
              Restaurar base de datos
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-1 text-xs leading-relaxed">
              <p>
                Esta acción eliminará los datos actuales y restaurará toda la base de datos al respaldo{' '}
                <strong className="font-mono text-foreground">{restoreTarget?.nombre}</strong>.
              </p>
              <p>
                Antes de aplicar los cambios, se creará automáticamente un respaldo de seguridad del estado actual.
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="confirm-restore-input" className="text-xs font-semibold">
              Escribe <span className="font-mono text-sci-red">RESTAURAR</span> para confirmar
            </Label>
            <Input
              id="confirm-restore-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESTAURAR"
              disabled={restoring}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={restoring}
              onClick={() => {
                setRestoreTarget(null)
                setConfirmText('')
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={restoring || confirmText.trim() !== 'RESTAURAR'}
              onClick={() => void handleRestore()}
              className="gap-2 bg-sci-red text-white hover:bg-sci-red/90"
            >
              {restoring && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {restoring ? 'Restaurando...' : 'Confirmar restauración'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="¿Eliminar respaldo?"
        description="El archivo de respaldo se eliminará permanentemente del servidor."
        itemName={deleteTarget?.nombre}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </>
  )
}
