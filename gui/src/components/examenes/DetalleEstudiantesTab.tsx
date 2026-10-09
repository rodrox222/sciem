import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  LoaderCircle,
  QrCode,
  RefreshCw,
  Search,
  UserPlus,
  UserX,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { EstudianteFormModal } from '@/components/estudiantes/EstudianteFormModal'
import { AsociarEstudiantesModal } from '@/components/estudiantes/AsociarEstudiantesModal'
import { InhabilitarEstudianteModal } from '@/components/estudiantes/InhabilitarEstudianteModal'
import { EstudianteQrModal } from '@/components/estudiantes/EstudianteQrModal'
import { PrerrequisitosEstudianteModal } from '@/components/estudiantes/PrerrequisitosEstudianteModal'
import {
  prerrequisitosService,
  type Prerrequisito,
} from '@/services/prerrequisitos.service'
import {
  estudiantesService,
  type EstudianteInscritoExamen,
  type InscripcionPayload,
} from '@/services/estudiantes.service'
import type { Examen } from '@/services/examenes.service'

interface DetalleEstudiantesTabProps {
  exam: Examen
  canManage: boolean
}

export function DetalleEstudiantesTab({ exam, canManage }: DetalleEstudiantesTabProps) {
  const [students, setStudents] = useState<EstudianteInscritoExamen[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<
  'Todos' | 'Habilitado' | 'Inhabilitado'
>('Todos')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [prerrequisitos, setPrerrequisitos] = useState<Prerrequisito[]>([])

  // Modales
  const [modalOpen, setModalOpen] = useState(false)
  const [associateModalOpen, setAssociateModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<any | null>(null)
  const [inhabilitarStudent, setInhabilitarStudent] = useState<EstudianteInscritoExamen | null>(null)
  const [qrStudent, setQrStudent] = useState<EstudianteInscritoExamen | null>(null)
const [prerrequisitosStudent, setPrerrequisitosStudent] =
  useState<EstudianteInscritoExamen | null>(null)
  const loadStudents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await estudiantesService.listByExam(exam.id)
      setStudents(response.estudiantes || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estudiantes del examen.')
    } finally {
      setLoading(false)
    }
  }, [exam.id])
  const loadPrerrequisitos = useCallback(async () => {
  try {
    const response = await prerrequisitosService.listByExam(exam.id)
    setPrerrequisitos(response)
  } catch (err) {
    console.error('Error al cargar prerrequisitos:', err)
  }
}, [exam.id])

 useEffect(() => {
  void loadStudents()
  void loadPrerrequisitos()
}, [loadStudents, loadPrerrequisitos])

 const visibleStudents = useMemo(() => {
  const search = searchTerm.toLowerCase()

  return students.filter((student) => {
    const matchesSearch =
      !searchTerm ||
      [
        student.nombre_completo,
        student.codigo_sis,
        student.ci,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search)

    const matchesEstado =
      estadoFiltro === 'Todos' ||
      student.estado === estadoFiltro

    return matchesSearch && matchesEstado
  })
}, [searchTerm, students, estadoFiltro])

  const enabledCount = visibleStudents.filter(
    (student) => student.estado === 'Habilitado'
  ).length

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    setSearchTerm(searchInput.trim())
  }

  const openInhabilitar = (student: EstudianteInscritoExamen) => {
    setSuccess('')
    setInhabilitarStudent(student)
  }

  const saveStudent = async (payload: InscripcionPayload) => {
    const response = await estudiantesService.enroll(exam.id, payload)
    setSuccess(response.message || 'Estudiante asignado correctamente.')
    await loadStudents()
  }
const openEditStudent = async (student: EstudianteInscritoExamen) => {
  try {
    setError('')
    setSuccess('')

    // Buscamos el estudiante completo para obtener
    // nombre, apellido paterno y apellido materno por separado.
    const response = await estudiantesService.list({
      search: student.codigo_sis,
      perPage: 100,
    })

    const fullStudent = response.data.find(
      (item) => item.id === student.id,
    )

    if (!fullStudent) {
      setError('No se pudo encontrar la información completa del estudiante.')
      return
    }

    // Enviamos al modal el objeto Estudiante completo.
    setEditingStudent({
      ...fullStudent,
      pivot: {
        estado: student.estado,
        motivo_estado: student.motivo_estado,
        ajuste_manual: student.ajuste_manual,
        fecha_ajuste_manual: student.fecha_ajuste_manual,
      },
    })

    setModalOpen(true)
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'No se pudo cargar la información del estudiante.',
    )
  }
}
  return (
  <div className="w-full min-w-0 max-w-full space-y-5 overflow-x-clip">
      {/* Barra de control y conteo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-sci-navy">
            <Users className="h-4 w-4 text-sci-cyan" /> {students.length} Inscriptos
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sci-navy">
            <CheckCircle2 className="h-4 w-4 text-sci-cyan" /> {enabledCount} Habilitados
          </div>
        </div>

        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                setSuccess('')
                setEditingStudent(null)
                setModalOpen(true)
              }}
              className="cursor-pointer gap-2 bg-sci-blue text-xs font-semibold text-white hover:opacity-90"
            >
              <UserPlus className="h-4 w-4" /> Crear estudiante
            </Button>

            <Button
              type="button"
              onClick={() => {
                setSuccess('')
                setAssociateModalOpen(true)
              }}
              variant="outline"
              className="cursor-pointer gap-2 text-xs font-semibold"
            >
              <Users className="h-4 w-4" /> Agregar estudiante
            </Button>
          </div>
        )}
      </div>

      {associateModalOpen && (
        <AsociarEstudiantesModal
          examId={exam.id}
          examName={exam.nombre}
          onClose={() => setAssociateModalOpen(false)}
          onSuccess={() => {
            setAssociateModalOpen(false)
            void loadStudents()
          }}
        />
      )}

      {success && (
        <div className="rounded-xl border border-sci-cyan/30 bg-sci-cyan/10 px-4 py-3 text-xs font-semibold text-sci-navy">
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-sci-red/20 bg-sci-red/10 p-4 text-xs text-sci-red">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadStudents()} className="gap-1 text-xs">
            <RefreshCw className="h-3 w-3" /> Reintentar
          </Button>
        </div>
      )}
{prerrequisitos.length > 0 && (
  <Card className="mb-4 border-sci-cyan/20 bg-white shadow-sm">
    <CardContent className="p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-sci-navy">
          Prerrequisitos del examen
        </h3>

        <p className="mt-1 text-xs text-muted-foreground">
          Condiciones que deben cumplirse para que un estudiante esté habilitado.
        </p>
      </div>

      <div className="space-y-3">
        {prerrequisitos.map((prerrequisito) => (
          <div
            key={prerrequisito.id}
            className="rounded-lg border border-border bg-muted/20 p-3"
          >
            <p className="text-sm font-semibold text-sci-navy">
              {prerrequisito.titulo}
            </p>

            {prerrequisito.descripcion && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {prerrequisito.descripcion}
              </p>
            )}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}
      {/* Buscador */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filtrar por nombre, CI o Código SIS..."
            className="h-10 bg-background pl-9 text-xs"
          />
        </div>
        <Button type="submit" variant="outline" className="h-10 text-xs">Buscar</Button>
      </form>
{/* Filtro por estado: desplegable en móviles */}
<details className="rounded-xl border border-border bg-white md:hidden">
  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-sci-navy">
    Filtrar por estado
    <span className="ml-2 text-xs font-normal text-muted-foreground">
      {estadoFiltro}
    </span>
  </summary>

  <div className="border-t border-border p-3">
    <label
      htmlFor="estado-filtro-movil"
      className="mb-2 block text-xs font-medium text-sci-dark"
    >
      Estado de habilitación
    </label>

    <select
      id="estado-filtro-movil"
      value={estadoFiltro}
      onChange={(e) =>
        setEstadoFiltro(
          e.target.value as
            | 'Todos'
            | 'Habilitado'
            | 'Inhabilitado'
        )
      }
      className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm"
    >
      <option value="Todos">Todos los estados</option>
      <option value="Habilitado">Habilitados</option>
      <option value="Inhabilitado">Inhabilitados</option>
    </select>
  </div>
</details>

{/* Filtro visible en escritorio */}
<div className="hidden md:flex md:items-center md:gap-2">
  <label
    htmlFor="estado-filtro-escritorio"
    className="text-sm text-muted-foreground"
  >
    Estado:
  </label>

  <select
    id="estado-filtro-escritorio"
    value={estadoFiltro}
    onChange={(e) =>
      setEstadoFiltro(
        e.target.value as
          | 'Todos'
          | 'Habilitado'
          | 'Inhabilitado'
      )
    }
    className="h-10 rounded-md border border-border bg-white px-3 text-sm"
  >
    <option value="Todos">Todos</option>
    <option value="Habilitado">Habilitados</option>
    <option value="Inhabilitado">Inhabilitados</option>
  </select>
</div>
      {/* Tabla de Estudiantes */}
      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="grid min-h-64 place-items-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-sci-cyan" />
            </div>
         ) : (<>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5">Estudiante</th>
                    <th className="px-5 py-3.5">Código SIS</th>
                    <th className="px-5 py-3.5">C.I.</th>
                    <th className="px-5 py-3.5">Correo</th>
                    <th className="px-5 py-3.5">Estado</th>
                    <th className="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-muted/20">
                      <td className="px-5 py-3.5 font-bold text-sci-navy">{st.nombre_completo}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{st.codigo_sis}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{st.ci} {st.ci_extension ?? ''}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{st.email_institucional}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                              st.estado === 'Habilitado'
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                                : 'border-red-500/30 bg-red-500/10 text-red-600'
                            }`}
                          >
                            {st.estado}
                          </span>
                          {st.estado === 'Inhabilitado' && st.motivo_estado && (
                            <span
                              title={st.motivo_estado}
                              className="max-w-44 truncate text-[10px] text-muted-foreground"
                            >
                              {st.motivo_estado}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            title="Ver Credencial QR"
                            onClick={() => setQrStudent(st)}
                            className="cursor-pointer h-8 w-8 p-0"
                          >
                            <QrCode className="h-3.5 w-3.5 text-sci-cyan" />
                          </Button>
<Button
  type="button"
  variant="outline"
  size="sm"
  title="Gestionar prerrequisitos"
  onClick={() => setPrerrequisitosStudent(st)}
  className="cursor-pointer gap-1 text-xs h-8"
>
  Prerrequisitos
</Button>
                          {canManage && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void openEditStudent(st)}
                                className="cursor-pointer gap-1 text-xs h-8"
                              >
                                <Edit3 className="h-3 w-3" /> Editar
                              </Button>

                              {st.estado !== 'Inhabilitado' && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openInhabilitar(st)}
                                  className="cursor-pointer gap-1 text-xs text-sci-red hover:text-sci-red h-8"
                                >
                                  <UserX className="h-3 w-3" /> Inhabilitar
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleStudents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted-foreground">
                        No hay estudiantes registrados para este examen.
                      </td>
                    </tr>
                  )}
                </tbody>
           
              </table>
            </div>

            {/* Tarjetas de estudiantes para móviles */}
            <div className="space-y-3 p-3 md:hidden">
              {visibleStudents.map((st) => (
                <div
                  key={st.id}
                  className="space-y-3 rounded-xl border border-border bg-white p-4 shadow-sm"
                >
                  {/* Nombre y estado */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold text-sci-navy">
                        {st.nombre_completo}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Código SIS: {st.codigo_sis}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold ${
                        st.estado === 'Habilitado'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                          : 'border-red-500/30 bg-red-500/10 text-red-600'
                      }`}
                    >
                      {st.estado}
                    </span>
                  </div>

                  {/* Datos del estudiante */}
                  <div className="space-y-2 border-t border-border pt-3 text-xs">
                    <div>
                      <p className="font-semibold text-sci-dark">C.I.</p>
                      <p className="mt-0.5 text-muted-foreground">
                        {st.ci} {st.ci_extension ?? ''}
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-sci-dark">Correo institucional</p>
                      <p className="mt-0.5 break-all text-muted-foreground">
                        {st.email_institucional}
                      </p>
                    </div>

                    {st.estado === 'Inhabilitado' && st.motivo_estado && (
                      <div className="rounded-lg bg-red-50 p-3">
                        <p className="font-semibold text-red-700">
                          Motivo de inhabilitación
                        </p>
                        <p className="mt-1 break-words text-red-600">
                          {st.motivo_estado}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQrStudent(st)}
                      className="h-10 gap-2 text-xs"
                    >
                      <QrCode className="h-4 w-4 text-sci-cyan" />
                      Ver QR
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPrerrequisitosStudent(st)}
                      className="h-10 gap-2 text-xs"
                    >
                      Prerrequisitos
                    </Button>

                    {canManage && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void openEditStudent(st)}
                          className="h-10 gap-2 text-xs"
                        >
                          <Edit3 className="h-4 w-4" />
                          Editar
                        </Button>

                        {st.estado !== 'Inhabilitado' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openInhabilitar(st)}
                            className="h-10 gap-2 text-xs text-sci-red hover:text-sci-red"
                          >
                            <UserX className="h-4 w-4" />
                            Inhabilitar
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}

              {visibleStudents.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No hay estudiantes que coincidan con los filtros.
                </p>
              )}
            </div>
          </>
          )}
        </CardContent>
      </Card>

      {/* Modal para crear/editar estudiante */}
      {modalOpen && (
       <EstudianteFormModal
  key={editingStudent?.id ?? 'new'}
  estudiante={editingStudent}
  examMode={true}
  onClose={() => setModalOpen(false)}
  onSubmit={saveStudent}
  onBulkUpload={async (archivo) => {
    const response = await estudiantesService.cargaMasiva(exam.id, archivo)

    setSuccess(
      response.message ||
        `Carga masiva completada. Se registraron ${response.total_insertados} estudiantes.`,
    )

    setModalOpen(false)
    await loadStudents()
  }}
/>
      )}

      {/* Modal para inhabilitar estudiante */}
      {inhabilitarStudent && (
        <InhabilitarEstudianteModal
          estudiante={inhabilitarStudent as any}
          examName={exam.nombre}
          onClose={() => setInhabilitarStudent(null)}
          onSubmit={async (motivo) => {
            await estudiantesService.cambiarHabilitacion(
              exam.id,
              inhabilitarStudent.id,
              {
                estado: 'Inhabilitado',
               motivo_estado: motivo,
              }
            )

            setInhabilitarStudent(null)
            setSuccess('Estudiante inhabilitado correctamente.')
            await loadStudents()
          }}
        />
      )}

      {/* Modal para visualizar el código QR del estudiante */}
      {qrStudent && (
        <EstudianteQrModal
          estudiante={qrStudent}
          materiaNombre={exam.materia?.nombre}
          onClose={() => setQrStudent(null)}
        />
      )}
      {prerrequisitosStudent && (
  <PrerrequisitosEstudianteModal
    examId={exam.id}
    estudiante={prerrequisitosStudent}
    prerrequisitos={prerrequisitos}
    onClose={() => setPrerrequisitosStudent(null)}
    onSuccess={() => {
      void loadStudents()
    }}
  />
)}
    </div>
  )
}