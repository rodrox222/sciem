import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  LoaderCircle,
  RefreshCw,
  Search,
  UserPlus,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { EstudianteFormModal } from '@/components/estudiantes/EstudianteFormModal'
import {
  estudiantesService,
  type Estudiante,
  type InscripcionPayload,
} from '@/services/estudiantes.service'
import type { Examen } from '@/services/examenes.service'

interface DetalleEstudiantesTabProps {
  exam: Examen
  canManage: boolean
}

const fullName = (student: Estudiante) =>
  [student.nombre, student.apellido_paterno, student.apellido_materno]
    .filter(Boolean)
    .join(' ')

export function DetalleEstudiantesTab({ exam, canManage }: DetalleEstudiantesTabProps) {
  const [students, setStudents] = useState<Estudiante[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Estudiante | null>(null)

  const loadStudents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await estudiantesService.listByExam(exam.id, page)
      setStudents(response.data)
      setTotal(response.total)
      setLastPage(Math.max(response.last_page, 1))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estudiantes del examen.')
    } finally {
      setLoading(false)
    }
  }, [exam.id, page])

  useEffect(() => {
    void loadStudents()
  }, [loadStudents])

  const visibleStudents = useMemo(() => {
    if (!searchTerm) return students
    const search = searchTerm.toLowerCase()
    return students.filter((student) =>
      [fullName(student), student.codigo_sis, student.ci]
        .join(' ')
        .toLowerCase()
        .includes(search),
    )
  }, [searchTerm, students])

  const enabledCount = visibleStudents.filter(
    (student) => student.pivot?.estado !== 'Inhabilitado' && student.activo,
  ).length

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    setSearchTerm(searchInput.trim())
  }

  const saveStudent = async (payload: InscripcionPayload) => {
    const response = await estudiantesService.enroll(exam.id, payload)
    setSuccess(response.message || 'Estudiante asignado correctamente.')
    await loadStudents()
  }

  return (
    <div className="space-y-5">
      {/* Barra de control y conteo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-sci-navy">
            <Users className="h-4 w-4 text-sci-cyan" /> {total} Inscriptos
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sci-navy">
            <CheckCircle2 className="h-4 w-4 text-sci-cyan" /> {enabledCount} Habilitados
          </div>
        </div>

        {canManage && (
          <Button
            type="button"
            onClick={() => {
              setEditingStudent(null)
              setSuccess('')
              setModalOpen(true)
            }}
            className="cursor-pointer gap-2 bg-sci-blue text-xs font-semibold text-white hover:opacity-90"
          >
            <UserPlus className="h-4 w-4" /> Agregar estudiante
          </Button>
        )}
      </div>

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

      {/* Tabla */}
      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="grid min-h-64 place-items-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-sci-cyan" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5">Estudiante</th>
                    <th className="px-5 py-3.5">Código SIS</th>
                    <th className="px-5 py-3.5">C.I.</th>
                    <th className="px-5 py-3.5">Correo</th>
                    <th className="px-5 py-3.5 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-muted/20">
                      <td className="px-5 py-3.5 font-bold text-sci-navy">{fullName(st)}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{st.codigo_sis}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{st.ci} {st.ci_extension}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{st.email_institucional}</td>
                      <td className="px-5 py-3.5 text-right">
                        {canManage ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingStudent(st)
                              setModalOpen(true)
                            }}
                            className="cursor-pointer gap-1 text-xs"
                          >
                            <Edit3 className="h-3 w-3" /> Editar
                          </Button>
                        ) : (
                          <span className="rounded-full border border-sci-cyan/30 bg-sci-cyan/10 px-2 py-0.5 text-[11px] font-semibold text-sci-navy">
                            {st.pivot?.estado ?? (st.activo ? 'Activo' : 'Inactivo')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {visibleStudents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted-foreground">
                        No hay estudiantes registrados para este examen.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Página {page} de {lastPage} · {total} estudiantes</span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((c) => Math.max(1, c - 1))}
              disabled={page <= 1}
              className="gap-1 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((c) => Math.min(lastPage, c + 1))}
              disabled={page >= lastPage}
              className="gap-1 text-xs"
            >
              Siguiente <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {modalOpen && (
        <EstudianteFormModal
          key={editingStudent?.id ?? 'new'}
          estudiante={editingStudent}
          examMode={true}
          onClose={() => setModalOpen(false)}
          onSubmit={saveStudent}
        />
      )}
    </div>
  )
}