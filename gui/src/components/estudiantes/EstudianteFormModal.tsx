import { useState, type FormEvent } from 'react'
import { Info, LoaderCircle, X } from 'lucide-react'

import { ApiError } from '../../services/apiClient'
import type {
  EstadoInscripcion,
  Estudiante,
  InscripcionPayload,
} from '../../services/estudiantes.service'

interface EstudianteFormModalProps {
  estudiante?: Estudiante | null
  examMode?: boolean
  onClose: () => void
  onSubmit: (payload: InscripcionPayload) => Promise<void>
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
}: EstudianteFormModalProps) {
  const [form, setForm] = useState<FormState>(() => createInitialState(estudiante))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [saving, setSaving] = useState(false)

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
    if (!form.ci.trim()) nextErrors.ci = 'El carnet de identidad es obligatorio.'
    else if (!/^\d+[A-Za-z]?$/.test(form.ci.trim())) {
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
      if (error instanceof ApiError) {
        const apiErrors = Object.fromEntries(
          Object.entries(error.errors ?? {}).map(([key, messages]) => [
            key,
            messages[0] ?? '',
          ]),
        )
        setErrors((current) => ({ ...current, ...apiErrors }))
        setGeneralError(error.message)
      } else {
        setGeneralError('Ocurrió un error inesperado al guardar al estudiante.')
      }
    } finally {
      setSaving(false)
    }
  }

  const inputClass = (field: string) =>
    `min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#1E293B] outline-none transition ${
      errors[field]
        ? 'border-[#E30613] focus:ring-2 focus:ring-[#E30613]/10'
        : 'border-[#E2E8F0] focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/15'
    }`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <section
        className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl border-t-4 border-[#E30613] bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-modal-title"
      >
        <form onSubmit={handleSubmit} noValidate>
          <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[#E2E8F0] bg-white px-5 py-5 sm:px-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E30613]">
                Gestión de estudiantes
              </p>
              <h2 id="student-modal-title" className="mt-1 text-2xl font-bold text-[#003770]">
                {editing ? 'Actualizar estudiante' : 'Registrar estudiante'}
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                {examMode
                  ? 'Los datos quedarán vinculados al examen seleccionado.'
                  : 'El registro se almacenará en el padrón institucional.'}
              </p>
            </div>
            <button type="button" onClick={onClose} disabled={saving} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[#64748B] hover:bg-[#F7F7F7]" aria-label="Cerrar formulario">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="space-y-5 px-5 py-5 sm:px-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold">Nombre *</span>
                <input autoFocus value={form.nombre} maxLength={100} onChange={(event) => setField('nombre', event.target.value)} className={inputClass('nombre')} placeholder="Ej. Carlos" />
                {errors.nombre && <p className="text-sm text-[#E30613]">{errors.nombre}</p>}
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Apellido paterno *</span>
                <input value={form.apellido_paterno} maxLength={100} onChange={(event) => setField('apellido_paterno', event.target.value)} className={inputClass('apellido_paterno')} placeholder="Ej. Vargas" />
                {errors.apellido_paterno && <p className="text-sm text-[#E30613]">{errors.apellido_paterno}</p>}
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-semibold">Apellido materno</span>
              <input value={form.apellido_materno} maxLength={100} onChange={(event) => setField('apellido_materno', event.target.value)} className={inputClass('apellido_materno')} placeholder="Ej. Flores" />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold">Código SIS *</span>
                <input value={form.codigo_sis} maxLength={20} inputMode="numeric" onChange={(event) => setField('codigo_sis', event.target.value)} className={inputClass('codigo_sis')} placeholder="Ej. 202104589" />
                {errors.codigo_sis && <p className="text-sm text-[#E30613]">{errors.codigo_sis}</p>}
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Carnet de identidad *</span>
                <input value={form.ci} maxLength={20} autoCapitalize="characters" onChange={(event) => setField('ci', event.target.value)} className={inputClass('ci')} placeholder="Ej. 8234567A" />
                {errors.ci ? <p className="text-sm text-[#E30613]">{errors.ci}</p> : <p className="text-xs text-[#64748B]">Números y una letra final opcional.</p>}
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-semibold">Complemento o extensión del CI</span>
              <input value={form.ci_extension} maxLength={10} onChange={(event) => setField('ci_extension', event.target.value)} className={inputClass('ci_extension')} placeholder="Ej. CB" />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold">Correo institucional *</span>
              <input type="email" value={form.email_institucional} maxLength={150} onChange={(event) => setField('email_institucional', event.target.value)} className={inputClass('email_institucional')} placeholder="Ej. 202104589@est.umss.edu" />
              {errors.email_institucional && <p className="text-sm text-[#E30613]">{errors.email_institucional}</p>}
            </label>

            {examMode && (
              <label className="block space-y-2">
                <span className="text-sm font-semibold">Estado en el examen *</span>
                <select value={form.estado} onChange={(event) => setField('estado', event.target.value as EstadoInscripcion)} className={inputClass('estado')}>
                  <option value="Habilitado">Habilitado</option>
                  <option value="Inhabilitado">Inhabilitado</option>
                </select>
              </label>
            )}

            {generalError && <div className="rounded-lg border border-[#E30613]/25 bg-[#E30613]/5 px-4 py-3 text-sm text-[#B0040E]" role="alert">{generalError}</div>}

            <div className="flex gap-3 rounded-lg border border-[#168FBD]/20 bg-[#168FBD]/8 px-4 py-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#168FBD]" />
              <p className="text-sm text-[#1E536E]">El código SIS identifica de forma única al estudiante. Los errores del servidor aparecerán junto al campo correspondiente.</p>
            </div>
          </div>

          <footer className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-[#E2E8F0] bg-[#F7F7F7] px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-lg border border-[#E2E8F0] bg-white px-5 text-sm font-semibold text-[#1E293B] hover:bg-[#F7F7F7]">Cancelar</button>
            <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0056B3] px-5 text-sm font-semibold text-white hover:bg-[#003770] disabled:cursor-wait disabled:opacity-60">
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar estudiante'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
