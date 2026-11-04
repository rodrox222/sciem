import { useState } from 'react'
import { FileSpreadsheet, LoaderCircle, Upload } from 'lucide-react'
import { ApiError } from '@/services/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface CargaMasivaModalProps {
  isOpen: boolean
  onClose: () => void
  onBulkUpload: (archivo: File) => Promise<void>
}

interface RowError {
  fila: number
  tipo_error: string
  identificador: string
  motivo: string
}

export function CargaMasivaModal({
  isOpen,
  onClose,
  onBulkUpload,
}: CargaMasivaModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [rowErrors, setRowErrors] = useState<RowError[]>([])

  const handleSubmit = async () => {
    if (!file) {
      setError('Selecciona un archivo antes de continuar.')
      return
    }

    try {
      setError('')
      setSaving(true)
      await onBulkUpload(file)
      onClose()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        const data = err.data as { errores?: RowError[] } | null
        setRowErrors(data?.errores ?? [])
        setShowErrorDialog(true)
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo completar la carga masiva.'
        )
        setRowErrors([])
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => !saving && !open && onClose()}
      >
        <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1rem)] max-w-xl flex-col overflow-hidden rounded-2xl border-border bg-card p-0 text-card-foreground shadow-2xl">
          <DialogHeader className="border-b border-border px-6 py-5 text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sci-cyan">
              Padrón y nómina
            </span>
            <DialogTitle className="mt-1 text-2xl font-bold text-sci-navy">
              Carga masiva de estudiantes
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Sube la lista de inscritos mediante una hoja de cálculo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto px-6 py-5">
            {!file ? (
              <div className="rounded-2xl border border-dashed border-sci-blue/40 bg-sci-blue/5 p-6 text-center">
                <FileSpreadsheet className="mx-auto h-10 w-10 text-sci-blue" />
                <h3 className="mt-3 text-sm font-bold text-sci-navy">
                  Subir archivo Excel o CSV
                </h3>
                <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
                  Selecciona una plantilla con las columnas del padrón estudiantil.
                </p>

                <label
                  htmlFor="bulk-file-input"
                  className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sci-blue px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <Upload className="h-4 w-4" />
                  Seleccionar archivo
                </label>

                <input
                  id="bulk-file-input"
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const selected = e.currentTarget.files?.[0] ?? null
                    e.currentTarget.value = ''
                    setError('')
                    setRowErrors([])

                    if (!selected) return

                    if (!/\.(csv|xlsx)$/i.test(selected.name)) {
                      setError('Selecciona un archivo CSV o Excel (.xlsx).')
                      return
                    }

                    if (selected.size > 5 * 1024 * 1024) {
                      setError('El archivo no debe exceder los 5 MB.')
                      return
                    }

                    setFile(selected)
                  }}
                />

                <p className="mt-3 text-[11px] text-muted-foreground">
                  Formatos permitidos: CSV y Excel (.xlsx) · Tamaño máximo: 5 MB
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-sci-cyan/30 bg-sci-cyan/10 p-3">
                <FileSpreadsheet className="h-8 w-8 shrink-0 text-sci-blue" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-sci-navy">
                    Archivo seleccionado
                  </p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {file.name}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => {
                    setFile(null)
                    setError('')
                    setRowErrors([])
                  }}
                >
                  Quitar
                </Button>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-sci-red/20 bg-sci-red/10 px-4 py-3">
                <p className="text-xs font-semibold text-sci-red">{error}</p>
                {rowErrors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowErrorDialog(true)}
                    className="mt-2 text-xs font-bold text-sci-blue underline cursor-pointer"
                  >
                    Ver detalle de errores
                  </button>
                )}
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-sci-navy">Columnas requeridas</p>
              <p className="mt-1">
                Código SIS, CI, extensión, nombre, apellido paterno, apellido materno y correo.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-muted/40 px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving || !file}
              className="bg-sci-blue font-semibold text-white hover:opacity-90"
            >
              {saving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? 'Procesando...' : 'Cargar estudiantes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal detallado de filas con error */}
      <AlertDialog
        open={showErrorDialog}
        onOpenChange={setShowErrorDialog}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sci-red">
              No se pudo completar la carga
            </AlertDialogTitle>
            <AlertDialogDescription>{error}</AlertDialogDescription>
          </AlertDialogHeader>

          {rowErrors.length > 0 && (
            <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
              {rowErrors.map((item, index) => (
                <div
                  key={`${item.fila}-${item.identificador}-${index}`}
                  className="rounded-xl border border-border bg-muted/40 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-sci-navy">
                      Fila {item.fila}
                    </span>
                    {item.identificador && (
                      <span className="rounded-full bg-sci-blue/10 px-2 py-1 text-[11px] font-semibold text-sci-blue">
                        {item.identificador}
                      </span>
                    )}
                    <span className="rounded-full bg-sci-red/10 px-2 py-1 text-[11px] font-semibold text-sci-red">
                      {item.tipo_error}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.motivo}
                  </p>
                </div>
              ))}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowErrorDialog(false)}
              className="bg-sci-blue text-white hover:opacity-90"
            >
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}