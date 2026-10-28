import { useState, type FormEvent } from 'react'
import { FileSpreadsheet, Info, LoaderCircle, Upload } from 'lucide-react'

import type {
  EstadoInscripcion,
  Estudiante,
  InscripcionPayload,
} from '../../services/estudiantes.service'
import { ApiError } from '../../services/api'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
}from '../ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
interface EstudianteFormModalProps {
  estudiante?: Estudiante | null
  examMode?: boolean
  onClose: () => void
  onSubmit: (payload: InscripcionPayload) => Promise<void>
  onBulkUpload?: (archivo: File) => Promise<void>
}
interface FormState {
  nombre: string
  apellido_paterno: string
  apellido_materno: string
  codigo_sis: string
  ci: string
  ci_extension: string
  email_institucional: string
  estado: EstadoInscripcion
}

const createInitialState = (student?: Estudiante | null): FormState => ({
  nombre: student?.nombre ?? '',
  apellido_paterno: student?.apellido_paterno ?? '',
  apellido_materno: student?.apellido_materno ?? '',
  codigo_sis: student?.codigo_sis ?? '',
  ci: student?.ci ?? '',
  ci_extension: student?.ci_extension ?? '',
  email_institucional: student?.email_institucional ?? '',
  estado: student?.pivot?.estado ?? 'Habilitado',
})
export function EstudianteFormModal({
  estudiante,
  examMode = false,
  onClose,
  onSubmit,
  onBulkUpload,
}: EstudianteFormModalProps) {
  const [form, setForm] = useState<FormState>(() => createInitialState(estudiante))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [saving, setSaving] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
const [bulkFile, setBulkFile] = useState<File | null>(null)
const [bulkError, setBulkError] = useState('')
const [bulkSaving, setBulkSaving] = useState(false)
const [showBulkErrorDialog, setShowBulkErrorDialog] = useState(false)
const [bulkRowErrors, setBulkRowErrors] = useState<
  Array<{
    fila: number
    tipo_error: string
    identificador: string
    motivo: string
  }>
>([])

  const editing = Boolean(estudiante)

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!form.nombre.trim()) nextErrors.nombre = 'El nombre es obligatorio.'
    if (!form.apellido_paterno.trim()) {
      nextErrors.apellido_paterno = 'El apellido paterno es obligatorio.'
    }
    if (!form.codigo_sis.trim()) nextErrors.codigo_sis = 'El código SIS es obligatorio.'
    if (!form.ci.trim()) {
      if (!examMode) nextErrors.ci = 'El carnet de identidad es obligatorio.'
    } else if (!/^\d+[A-Za-z]?$/.test(form.ci.trim())) {
      nextErrors.ci = 'Usa números y, opcionalmente, una sola letra al final.'
    }
    if (!form.email_institucional.trim()) {
      nextErrors.email_institucional = 'El correo institucional es obligatorio.'
    } else if (!/^[0-9]+@est\.umss\.edu$/i.test(form.email_institucional.trim())) {
      nextErrors.email_institucional = 'Ingresa el código SIS numérico seguido de @est.umss.edu.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setGeneralError('')
    if (!validate()) return

    try {
      setSaving(true)
      await onSubmit({
        nombre: form.nombre.trim(),
        apellido_paterno: form.apellido_paterno.trim(),
        apellido_materno: form.apellido_materno.trim() || null,
        codigo_sis: form.codigo_sis.trim(),
        ci: form.ci.trim().toUpperCase(),
        ci_extension: form.ci_extension.trim() || null,
        email_institucional: form.email_institucional.trim().toLowerCase(),
        activo: true,
        estado: form.estado,
      })
      onClose()
    } catch (error) {
      setGeneralError(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado al guardar al estudiante.',
      )
    } finally {
      setSaving(false)
    }
  }
const handleBulkSubmit = async () => {
  if (!bulkFile) {
    setBulkError('Selecciona un archivo antes de continuar.')
    return
  }

  if (!onBulkUpload) {
    setBulkError('La carga masiva no está disponible.')
    return
  }

  try {
    setBulkError('')
    setBulkSaving(true)

    await onBulkUpload(bulkFile)
    onClose()
  } catch (error) {
    if (error instanceof ApiError) {
      setBulkError(error.message)

      const data = error.data as {
        errores?: Array<{
          fila: number
          tipo_error: string
          identificador: string
          motivo: string
        }>
      } | null

      setBulkRowErrors(data?.errores ?? [])
      setShowBulkErrorDialog(true)
    } else {
      setBulkError(
        error instanceof Error
          ? error.message
          : 'No se pudo completar la carga masiva.',
      )

      setBulkRowErrors([])
    }
  } finally {
    setBulkSaving(false)
  }
}
 return (
  <>
    <Dialog
  open
  onOpenChange={(open) =>
    !saving && !bulkSaving && !open && onClose()
  }
>
<DialogContent className="flex max-h-[90dvh] w-[calc(100%-1rem)] max-w-xl flex-col overflow-hidden rounded-2xl border-border bg-card p-0 text-card-foreground shadow-2xl">
        <form
  onSubmit={handleSubmit}
  noValidate
  className="flex min-h-0 flex-col overflow-hidden"
>
          <DialogHeader className="border-b border-border px-6 py-5 text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sci-cyan">
              Gestión de estudiantes
            </span>
            <DialogTitle className="mt-1 text-2xl font-bold text-sci-navy">
              {editing ? 'Actualizar estudiante' : 'Registrar estudiante'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {examMode
                ? 'Los datos quedarán vinculados al examen seleccionado.'
                : 'El registro se almacenará en el padrón institucional.'}
            </DialogDescription>
            {!editing && (
  <div className="mt-4 flex rounded-xl border border-border bg-muted/40 p-1">
    <button
      type="button"
      onClick={() => {
        setBulkMode(false)
       setBulkError('')
setBulkRowErrors([])
setBulkFile(null)
      }}
      className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        !bulkMode
          ? 'bg-white text-sci-navy shadow-sm'
          : 'text-muted-foreground hover:text-sci-navy'
      }`}
    >
      Individual
    </button>

    <button
      type="button"
      onClick={() => {
        setBulkMode(true)
        setErrors({})
        setGeneralError('')
      }}
      className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        bulkMode
          ? 'bg-white text-sci-navy shadow-sm'
          : 'text-muted-foreground hover:text-sci-navy'
      }`}
    >
      <Upload className="mr-2 inline h-4 w-4" />
      Carga masiva
    </button>
  </div>
)}
          </DialogHeader>
{!bulkMode ? (
          <div className="max-h-[calc(90dvh-190px)] space-y-3 overflow-y-auto px-5 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="std-nombre" className="text-xs font-semibold">
                  Nombre *
                </Label>
                <Input
                  id="std-nombre"
                  autoFocus
                  value={form.nombre}
                  maxLength={100}
                  onChange={(event) => setField('nombre', event.target.value)}
                  placeholder="Ej. Carlos"
                  className={`h-11 ${errors.nombre ? 'border-sci-red' : ''}`}
                />
                {errors.nombre && <p className="text-xs text-sci-red font-medium">{errors.nombre}</p>}
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="std-paterno" className="text-xs font-semibold">
                  Apellido paterno *
                </Label>
                <Input
                  id="std-paterno"
                  value={form.apellido_paterno}
                  maxLength={100}
                  onChange={(event) => setField('apellido_paterno', event.target.value)}
                  placeholder="Ej. Vargas"
                  className={`h-11 ${errors.apellido_paterno ? 'border-sci-red' : ''}`}
                />
                {errors.apellido_paterno && (
                  <p className="text-xs text-sci-red font-medium">{errors.apellido_paterno}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="std-materno" className="text-xs font-semibold">
                Apellido materno
              </Label>
              <Input
                id="std-materno"
                value={form.apellido_materno}
                maxLength={100}
                onChange={(event) => setField('apellido_materno', event.target.value)}
                placeholder="Ej. Flores"
                className="h-11"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="std-sis" className="text-xs font-semibold">
                  Código SIS *
                </Label>
                <Input
                  id="std-sis"
                  value={form.codigo_sis}
                  maxLength={20}
                  inputMode="numeric"
                  onChange={(event) => setField('codigo_sis', event.target.value)}
                  placeholder="Ej. 202104589"
                  className={`h-11 ${errors.codigo_sis ? 'border-sci-red' : ''}`}
                />
                {errors.codigo_sis && (
                  <p className="text-xs text-sci-red font-medium">{errors.codigo_sis}</p>
                )}
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="std-ci" className="text-xs font-semibold">
                  Carnet de identidad {examMode ? '(opcional)' : '*'}
                </Label>
                <Input
                  id="std-ci"
                  value={form.ci}
                  maxLength={20}
                  autoCapitalize="characters"
                  onChange={(event) => setField('ci', event.target.value)}
                  placeholder="Ej. 8234567"
                  className={`h-11 ${errors.ci ? 'border-sci-red' : ''}`}
                />
                {errors.ci && <p className="text-xs text-sci-red font-medium">{errors.ci}</p>}
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="std-ext" className="text-xs font-semibold">
                Complemento o extensión del CI
              </Label>
              <Input
                id="std-ext"
                value={form.ci_extension}
                maxLength={10}
                onChange={(event) => setField('ci_extension', event.target.value)}
                placeholder="Ej. CB"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="std-email" className="text-xs font-semibold">
                Correo institucional *
              </Label>
              <Input
                id="std-email"
                type="email"
                value={form.email_institucional}
                maxLength={150}
                onChange={(event) => setField('email_institucional', event.target.value)}
                placeholder="Ej. 202104589@est.umss.edu"
                className={`h-11 ${errors.email_institucional ? 'border-sci-red' : ''}`}
              />
              {errors.email_institucional && (
                <p className="text-xs text-sci-red font-medium">{errors.email_institucional}</p>
              )}
            </div>

            {examMode && (
              <div className="space-y-1.5 text-left">
                <Label htmlFor="std-estado" className="text-xs font-semibold">
                  Estado en el examen *
                </Label>
                <select
                  id="std-estado"
                  value={form.estado}
                  onChange={(event) => setField('estado', event.target.value as EstadoInscripcion)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
                >
                  <option value="Habilitado">Habilitado</option>
                  <option value="Inhabilitado">Inhabilitado</option>
                </select>
              </div>
          )}
</div>

) : (
  <div className="max-h-[calc(90dvh-190px)] space-y-4 overflow-y-auto px-5 py-4">
    {!bulkFile ? (
      <div className="rounded-2xl border border-dashed border-sci-blue/40 bg-sci-blue/5 p-5 text-center">
        <FileSpreadsheet className="mx-auto h-10 w-10 text-sci-blue" />

        <h3 className="mt-3 text-sm font-bold text-sci-navy">
          Carga masiva de estudiantes
        </h3>

        <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
          Selecciona un archivo CSV o Excel (.xlsx) con los datos de los
          estudiantes que deseas registrar en el examen.
        </p>

        <label
          htmlFor="bulk-student-file"
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sci-blue px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Upload className="h-4 w-4" />
          Seleccionar archivo
        </label>

        <input
          id="bulk-student-file"
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={(event) => {
            const input = event.currentTarget
            const file = input.files?.[0] ?? null

            input.value = ''
            setBulkError('')
            setBulkRowErrors([])

            if (!file) return

            if (!/\.(csv|xlsx)$/i.test(file.name)) {
              setBulkError('Selecciona un archivo CSV o Excel (.xlsx).')
              return
            }

            if (file.size > 5 * 1024 * 1024) {
              setBulkError('El archivo no debe exceder los 5 MB.')
              return
            }

            setBulkFile(file)
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
            {bulkFile.name}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {(bulkFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={bulkSaving}
          onClick={() => {
            setBulkFile(null)
            setBulkError('')
            setBulkRowErrors([])
          }}
        >
          Quitar
        </Button>
      </div>
    )}

    {bulkError && (
      <div className="rounded-xl border border-sci-red/20 bg-sci-red/10 px-4 py-3">
        <p className="text-xs font-semibold text-sci-red">{bulkError}</p>

        {bulkRowErrors.length > 0 && (
          <button
            type="button"
            onClick={() => setShowBulkErrorDialog(true)}
            className="mt-2 text-xs font-bold text-sci-blue underline"
          >
            Ver detalle de errores
          </button>
        )}
      </div>
    )}

    <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
      <p className="font-semibold text-sci-navy">Columnas esperadas</p>
      <p className="mt-1">
        Código SIS, CI, extensión del CI, nombre, apellido paterno,
        apellido materno y correo institucional.
      </p>
    </div>
  </div>
)}
            {generalError && (
              <div className="rounded-xl border border-sci-red/20 bg-sci-red/10 px-4 py-3 text-xs text-sci-red font-semibold">
                {generalError}
              </div>
            )}

            <div className="flex gap-3 rounded-xl border border-sci-cyan/20 bg-sci-cyan/10 p-3 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 text-sci-cyan mt-0.5" />
              <p>El código SIS identifica de forma unívoca a cada estudiante en los registros de la facultad.</p>
            </div>
          

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-muted/40 px-5 py-3 sm:flex-row sm:justify-end">
            <Button
  type="button"
  variant="outline"
  onClick={onClose}
  disabled={saving || bulkSaving}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            {bulkMode ? (
  <Button
    type="button"
    onClick={() => void handleBulkSubmit()}
    disabled={bulkSaving || !bulkFile}
    className="bg-sci-blue hover:opacity-90 text-white font-semibold cursor-pointer min-w-36"
  >
    {bulkSaving && (
      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
    )}
    {bulkSaving ? 'Procesando...' : 'Cargar estudiantes'}
  </Button>
) : (
  <Button
    type="submit"
    disabled={saving}
    className="bg-sci-blue hover:opacity-90 text-white font-semibold cursor-pointer min-w-36"
  >
    {saving && (
      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
    )}
    {saving
      ? 'Guardando...'
      : editing
        ? 'Guardar cambios'
        : 'Registrar estudiante'}
  </Button>
)}
          </div>
        </form>
      </DialogContent>
    </Dialog>

<AlertDialog
  open={showBulkErrorDialog}
  onOpenChange={setShowBulkErrorDialog}
>
  <AlertDialogContent className="max-w-lg">
    <AlertDialogHeader>
      <AlertDialogTitle className="text-sci-red">
        No se pudo completar la carga
      </AlertDialogTitle>

      <AlertDialogDescription>
        {bulkError}
      </AlertDialogDescription>
    </AlertDialogHeader>

    {bulkRowErrors.length > 0 && (
      <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
        {bulkRowErrors.map((item, index) => (
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
        onClick={() => setShowBulkErrorDialog(false)}
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