import { useEffect, useMemo, useState } from 'react'
import { Check, LoaderCircle, Search, Users, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  estudiantesService,
  type Estudiante,
} from '@/services/estudiantes.service'

interface AsociarEstudiantesModalProps {
  examId: string
  examName: string
  onClose: () => void
  onSuccess: () => void
}

export function AsociarEstudiantesModal({
  examId,
  examName,
  onClose,
  onSuccess,
}: AsociarEstudiantesModalProps) {
  const [students, setStudents] = useState<Estudiante[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(),
  )

  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadAvailableStudents = async () => {
      setLoading(true)
      setError('')

      try {
       
       const [allStudentsResponse, enrolledResponse] =
  await Promise.all([
    estudiantesService.list({
      perPage: 100,
    }),
    estudiantesService.listByExam(examId),
  ])

const enrolledStudents = enrolledResponse.estudiantes

        const enrolledIds = new Set(
          enrolledStudents.map((student) => student.id),
        )

        const availableStudents =
          allStudentsResponse.data.filter(
            (student) =>
              student.activo && !enrolledIds.has(student.id),
          )

        if (!cancelled) {
          setStudents(availableStudents)
          setSelectedIds(new Set())
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar la lista de estudiantes.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadAvailableStudents()

    return () => {
      cancelled = true
    }
  }, [examId])

  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()

    if (!normalizedSearch) {
      return students
    }

    return students.filter((student) =>
      [
        student.nombre,
        student.apellido_paterno,
        student.apellido_materno ?? '',
        student.codigo_sis,
        student.ci,
        student.email_institucional,
      ]
        .join(' ')
        .toLocaleLowerCase()
        .includes(normalizedSearch),
    )
  }, [search, students])

  const allVisibleSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) =>
      selectedIds.has(student.id),
    )

  const selectedCount = selectedIds.size

  const toggleStudent = (studentId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)

      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }

      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds((current) => {
      const next = new Set(current)

      if (allVisibleSelected) {
        filteredStudents.forEach((student) => {
          next.delete(student.id)
        })
      } else {
        filteredStudents.forEach((student) => {
          next.add(student.id)
        })
      }

      return next
    })
  }

  const handleAssociate = async () => {
    if (selectedIds.size === 0) {
      setError('Selecciona al menos un estudiante.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const studentsToEnroll = students.filter((student) =>
        selectedIds.has(student.id),
      )

      for (const student of studentsToEnroll) {
        await estudiantesService.enroll(examId, {
          codigo_sis: student.codigo_sis,
          ci: student.ci,
          ci_extension: student.ci_extension ?? null,
          nombre: student.nombre,
          apellido_paterno: student.apellido_paterno,
          apellido_materno: student.apellido_materno ?? null,
          email_institucional: student.email_institucional,
          activo: student.activo,
          estado: 'Habilitado',
        })
      }

      onSuccess()
      onClose()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudieron asociar los estudiantes seleccionados.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Encabezado */}
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-sci-cyan">
              Gestión académica
            </span>

            <h2 className="mt-1 text-xl font-bold text-sci-navy">
              Asociar estudiantes
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Selecciona uno o varios estudiantes para el examen.
            </p>

            <p className="mt-2 text-xs font-semibold text-foreground">
              Examen: {examName}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={saving}
            className="cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Contenido */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
          {error && (
            <div className="rounded-xl border border-sci-red/20 bg-sci-red/10 px-4 py-3 text-xs font-semibold text-sci-red">
              {error}
            </div>
          )}

          {/* Buscador */}
          <div>
            <Label className="mb-1.5 block text-xs font-semibold">
              Buscar estudiante
            </Label>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Nombre, CI, código SIS o correo..."
                className="h-10 bg-background pl-9"
                disabled={loading || saving}
              />
            </div>
          </div>

          {loading ? (
            <div className="grid min-h-60 place-items-center rounded-2xl border border-border bg-background">
              <div className="text-center">
                <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-sci-cyan" />

                <p className="mt-3 text-xs text-muted-foreground">
                  Cargando estudiantes disponibles...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Barra de selección */}
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="select-all-students"
                    checked={allVisibleSelected}
                    onCheckedChange={toggleSelectAll}
                    disabled={
                      filteredStudents.length === 0 || saving
                    }
                  />

                  <Label
                    htmlFor="select-all-students"
                    className="cursor-pointer text-xs font-semibold"
                  >
                    Seleccionar todos los visibles
                  </Label>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-4 w-4" />

                  <span>
                    {selectedCount} seleccionados
                  </span>
                </div>
              </div>

              {/* Lista */}
              {filteredStudents.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-border">
                  <div className="divide-y divide-border">
                    {filteredStudents.map((student) => {
                      const selected = selectedIds.has(student.id)

                      const fullName = [
                        student.nombre,
                        student.apellido_paterno,
                        student.apellido_materno,
                      ]
                        .filter(Boolean)
                        .join(' ')

                      return (
                        <label
                          key={student.id}
                          className={`flex cursor-pointer items-center gap-4 p-4 transition ${
                            selected
                              ? 'bg-sci-blue/5'
                              : 'hover:bg-muted/30'
                          }`}
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() =>
                              toggleStudent(student.id)
                            }
                            disabled={saving}
                          />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-sci-navy">
                              {fullName}
                            </p>

                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>
                                SIS: {student.codigo_sis}
                              </span>

                              <span>
                                CI: {student.ci}
                                {student.ci_extension
                                  ? ` ${student.ci_extension}`
                                  : ''}
                              </span>

                              <span className="break-all">
                                {student.email_institucional}
                              </span>
                            </div>
                          </div>

                          {selected && (
                            <Check className="h-4 w-4 shrink-0 text-sci-blue" />
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-border p-8 text-center">
                  <div>
                    <Users className="mx-auto h-8 w-8 text-muted-foreground" />

                    <p className="mt-3 text-sm font-semibold text-foreground">
                      No hay estudiantes disponibles
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {search
                        ? 'No se encontraron estudiantes con esa búsqueda.'
                        : 'Todos los estudiantes activos ya están asociados a este examen.'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {selectedCount > 0
              ? `${selectedCount} estudiante${
                  selectedCount === 1 ? '' : 's'
                } seleccionado${
                  selectedCount === 1 ? '' : 's'
                }`
              : 'Selecciona estudiantes para continuar.'}
          </span>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="cursor-pointer"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={() => void handleAssociate()}
              disabled={
                saving ||
                loading ||
                selectedCount === 0
              }
              className="cursor-pointer bg-sci-blue font-semibold text-white hover:opacity-90"
            >
              {saving && (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              )}

              {saving
                ? 'Asociando...'
                : 'Asociar seleccionados'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}