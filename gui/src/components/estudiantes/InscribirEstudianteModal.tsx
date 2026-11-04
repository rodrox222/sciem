import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Check,
  Info,
  LoaderCircle,
  Search,
  UserPlus,
  Users,
  ArrowLeft,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  estudiantesService,
  type Estudiante,
  type EstadoInscripcion,
  type InscripcionPayload,
} from '@/services/estudiantes.service'

interface InscribirEstudianteModalProps {
  examId: string
  examName: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormState {
  nombre: string
  apellido_paterno: string
  apellido_materno: string
  codigo_sis: string
  estado: EstadoInscripcion
}

export function InscribirEstudianteModal({
  examId,
  examName,
  isOpen,
  onClose,
  onSuccess,
}: InscribirEstudianteModalProps) {
  const [availableStudents, setAvailableStudents] = useState<Estudiante[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

  const [mode, setMode] = useState<'buscar' | 'crear_nuevo'>('buscar')

  const [form, setForm] = useState<FormState>({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    codigo_sis: '',
    estado: 'Habilitado',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      setError('')

      try {
        const [allResponse, enrolledResponse] = await Promise.all([
          estudiantesService.list({ perPage: 100 }),
          estudiantesService.listByExam(examId),
        ])

        const enrolledIds = new Set(
          (enrolledResponse.estudiantes || []).map((s) => s.id)
        )

        const notEnrolled = allResponse.data.filter(
          (s) => s.activo && !enrolledIds.has(s.id)
        )

        if (!cancelled) {
          setAvailableStudents(notEnrolled)
          setSelectedIds(new Set())
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Error al consultar el padrón de estudiantes.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [examId, isOpen])

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return availableStudents

    return availableStudents.filter((st) =>
      [
        st.apellido_paterno,
        st.apellido_materno,
        st.nombre,
        st.codigo_sis,
        st.ci,
        st.email_institucional,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [search, availableStudents])

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (filteredStudents.every((s) => selectedIds.has(s.id))) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredStudents.forEach((s) => next.delete(s.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredStudents.forEach((s) => next.add(s.id))
        return next
      })
    }
  }

  const handleAssociateSelected = async () => {
    if (selectedIds.size === 0) {
      setError('Selecciona al menos un estudiante.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const toEnroll = availableStudents.filter((s) => selectedIds.has(s.id))
      for (const st of toEnroll) {
        await estudiantesService.enroll(examId, {
          codigo_sis: st.codigo_sis,
          ci: st.ci,
          ci_extension: st.ci_extension ?? null,
          nombre: st.nombre,
          apellido_paterno: st.apellido_paterno,
          apellido_materno: st.apellido_materno ?? null,
          email_institucional: st.email_institucional,
          activo: st.activo,
          estado: 'Habilitado',
        })
      }
      onSuccess()
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron inscribir los estudiantes seleccionados.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleOpenCrearNuevo = () => {
    const rawSearch = search.trim()
    const isDigits = /^\d+$/.test(rawSearch)

    setForm({
      nombre: !isDigits ? rawSearch : '',
      apellido_paterno: '',
      apellido_materno: '',
      codigo_sis: isDigits ? rawSearch : '',
      estado: 'Habilitado',
    })
    setFormErrors({})
    setMode('crear_nuevo')
  }

  const validateForm = () => {
    const errs: Record<string, string> = {}
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio.'
    if (!form.apellido_paterno.trim()) errs.apellido_paterno = 'El apellido paterno es obligatorio.'
    if (!form.codigo_sis.trim()) errs.codigo_sis = 'El código SIS es obligatorio.'
    else if (!/^\d+$/.test(form.codigo_sis.trim())) {
      errs.codigo_sis = 'El código SIS debe contener únicamente dígitos numéricos.'
    }

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validateForm()) return

    setSaving(true)
    try {
      const sis = form.codigo_sis.trim()
      const emailAutogenerado = `${sis}@est.umss.edu`

      const payload: InscripcionPayload = {
        nombre: form.nombre.trim(),
        apellido_paterno: form.apellido_paterno.trim(),
        apellido_materno: form.apellido_materno.trim() || null,
        codigo_sis: sis,
        ci: null,
        ci_extension: null,
        email_institucional: emailAutogenerado,
        activo: true,
        estado: form.estado,
      }

      await estudiantesService.enroll(examId, payload)
      onSuccess()
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al registrar e inscribir al estudiante.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !saving && !open && onClose()}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl sm:max-w-2xl flex-col overflow-hidden rounded-2xl border-border bg-card p-0 text-card-foreground shadow-2xl">
        {/* Cabecera */}
        <DialogHeader className="border-b border-border px-6 py-5 text-left">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sci-cyan">
                Inscripciones
              </span>
              <DialogTitle className="mt-1 text-2xl font-bold text-sci-navy">
                {mode === 'buscar' ? 'Inscribir estudiantes' : 'Registrar nuevo estudiante'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Examen: <span className="font-semibold text-foreground">{examName}</span>
              </DialogDescription>
            </div>

            {mode === 'crear_nuevo' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMode('buscar')}
                disabled={saving}
                className="gap-1.5 text-xs text-sci-blue cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Volver a búsqueda
              </Button>
            )}
          </div>
        </DialogHeader>

        {error && (
          <div className="px-6 pt-4">
            <Alert className="border-sci-red/20 bg-sci-red/10 text-sci-red">
              <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* MODO 1: BÚSQUEDA Y ASOCIACIÓN RÁPIDA */}
        {mode === 'buscar' && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por SIS, CI o Apellido en el padrón..."
                className="h-11 pl-9 text-xs bg-background"
                disabled={loading || saving}
              />
            </div>

            {loading ? (
              <div className="grid min-h-60 place-items-center rounded-2xl border border-border bg-background">
                <div className="text-center">
                  <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-sci-cyan" />
                  <p className="mt-3 text-xs text-muted-foreground">
                    Consultando padrón de estudiantes...
                  </p>
                </div>
              </div>
            ) : filteredStudents.length > 0 ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={
                        filteredStudents.length > 0 &&
                        filteredStudents.every((s) => selectedIds.has(s.id))
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                    <Label htmlFor="select-all" className="text-xs font-semibold cursor-pointer">
                      Seleccionar visibles ({filteredStudents.length})
                    </Label>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.size} seleccionado{selectedIds.size === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border divide-y divide-border">
                  {filteredStudents.map((st) => {
                    const isSelected = selectedIds.has(st.id)
                    const fullName = [st.apellido_paterno, st.apellido_materno, st.nombre]
                      .filter(Boolean)
                      .join(' ')

                    return (
                      <label
                        key={st.id}
                        className={`flex items-center gap-3.5 p-3.5 transition-colors cursor-pointer ${
                          isSelected ? 'bg-sci-blue/5' : 'hover:bg-muted/30'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleStudent(st.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-sci-navy truncate">{fullName}</p>
                          <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground mt-0.5">
                            <span>SIS: <strong className="text-foreground">{st.codigo_sis}</strong></span>
                            {st.ci && <span>CI: {st.ci} {st.ci_extension ?? ''}</span>}
                            <span className="truncate">{st.email_institucional}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-sci-blue shrink-0" />}
                      </label>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center">
                <Users className="h-10 w-10 text-muted-foreground/60" />
                <h4 className="mt-3 text-sm font-bold text-sci-navy">
                  No se encontró en el padrón
                </h4>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {search.trim()
                    ? `No hay ningún estudiante registrado con "${search}". Puedes darlo de alta en el sistema e inscribirlo ahora.`
                    : 'Todos los estudiantes activos del padrón ya están inscritos en este examen.'}
                </p>

                <Button
                  type="button"
                  onClick={handleOpenCrearNuevo}
                  className="mt-4 gap-2 bg-sci-blue text-xs font-semibold text-white hover:opacity-90 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  Registrar e inscribir nuevo alumno
                </Button>
              </div>
            )}

            {/* Footer de Asociación Corregido */}
            <div className="flex flex-col-reverse gap-3 border-t border-border bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={handleOpenCrearNuevo}
                className="h-9 justify-start p-0 text-xs text-sci-blue hover:bg-transparent hover:underline cursor-pointer gap-1.5"
              >
                <UserPlus className="h-4 w-4 shrink-0" />
                <span>¿No está en la lista? Registrar nuevo</span>
              </Button>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={saving}
                  className="h-9 text-xs cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleAssociateSelected()}
                  disabled={saving || selectedIds.size === 0}
                  className="h-9 bg-sci-blue text-xs font-semibold text-white hover:opacity-90 cursor-pointer min-w-32"
                >
                  {saving && <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  {saving ? 'Inscribiendo...' : `Inscribir (${selectedIds.size})`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODO 2: FORMULARIO DE ALTA IN SITU */}
        {mode === 'crear_nuevo' && (
          <form onSubmit={handleCreateSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="max-h-[calc(90dvh-190px)] space-y-4 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="form-nombre" className="text-xs font-semibold">
                    Nombre(s) *
                  </Label>
                  <Input
                    id="form-nombre"
                    autoFocus
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej. Juan Carlos"
                    className={`h-11 text-xs ${formErrors.nombre ? 'border-sci-red' : ''}`}
                  />
                  {formErrors.nombre && (
                    <p className="text-[11px] text-sci-red">{formErrors.nombre}</p>
                  )}
                </div>

                <div className="space-y-1.5 text-left">
                  <Label htmlFor="form-paterno" className="text-xs font-semibold">
                    Apellido paterno *
                  </Label>
                  <Input
                    id="form-paterno"
                    value={form.apellido_paterno}
                    onChange={(e) => setForm({ ...form, apellido_paterno: e.target.value })}
                    placeholder="Ej. Pérez"
                    className={`h-11 text-xs ${formErrors.apellido_paterno ? 'border-sci-red' : ''}`}
                  />
                  {formErrors.apellido_paterno && (
                    <p className="text-[11px] text-sci-red">{formErrors.apellido_paterno}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="form-materno" className="text-xs font-semibold">
                  Apellido materno (opcional)
                </Label>
                <Input
                  id="form-materno"
                  value={form.apellido_materno}
                  onChange={(e) => setForm({ ...form, apellido_materno: e.target.value })}
                  placeholder="Ej. Gómez"
                  className="h-11 text-xs"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="form-sis" className="text-xs font-semibold">
                  Código SIS *
                </Label>
                <Input
                  id="form-sis"
                  inputMode="numeric"
                  value={form.codigo_sis}
                  onChange={(e) => setForm({ ...form, codigo_sis: e.target.value })}
                  placeholder="Ej. 202201999"
                  className={`h-11 text-xs ${formErrors.codigo_sis ? 'border-sci-red' : ''}`}
                />
                {formErrors.codigo_sis ? (
                  <p className="text-[11px] text-sci-red">{formErrors.codigo_sis}</p>
                ) : (
                  form.codigo_sis.trim() && (
                    <p className="text-[11px] text-muted-foreground">
                      Correo asignado: <strong className="text-sci-navy">{form.codigo_sis.trim()}@est.umss.edu</strong>
                    </p>
                  )
                )}
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="form-estado" className="text-xs font-semibold">
                  Estado en el examen *
                </Label>
                <Select
                  value={form.estado}
                  onValueChange={(val) => setForm({ ...form, estado: val as EstadoInscripcion })}
                >
                  <SelectTrigger id="form-estado" className="h-11 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Habilitado">Habilitado</SelectItem>
                    <SelectItem value="Inhabilitado">Inhabilitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2.5 rounded-xl border border-sci-cyan/20 bg-sci-cyan/10 p-3 text-xs text-muted-foreground mt-2">
                <Info className="h-4 w-4 shrink-0 text-sci-cyan mt-0.5" />
                <p>
                  El estudiante se añadirá al padrón del sistema y quedará inscrito en este examen. El CI se registrará en su primer inicio de sesión.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border bg-muted/40 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setMode('buscar')}
                className="h-9 text-xs"
              >
                Volver
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="h-9 bg-sci-blue text-xs font-semibold text-white hover:opacity-90 cursor-pointer min-w-40"
              >
                {saving && <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {saving ? 'Guardando...' : 'Guardar e Inscribir'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}