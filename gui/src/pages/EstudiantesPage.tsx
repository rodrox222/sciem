import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  LoaderCircle,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { EstudianteFormModal } from '@/components/estudiantes/EstudianteFormModal'
import {
  estudiantesService,
  type Estudiante,
  type InscripcionPayload,
} from '@/services/estudiantes.service'

const PER_PAGE = 10

const formatNombreCompleto = (st: Estudiante) =>
  [st.apellido_paterno, st.apellido_materno, st.nombre]
    .filter(Boolean)
    .join(' ')

export default function EstudiantesPage() {
  const role = (localStorage.getItem('user_role') ?? '').toLowerCase()
  const canManage = ['admin', 'administrador', 'docente'].includes(role)

  const [students, setStudents] = useState<Estudiante[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingStudent, setEditingStudent] = useState<Estudiante | null>(null)

  const loadStudents = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await estudiantesService.list({
        search: searchTerm,
        page,
        perPage: PER_PAGE,
      })

      setStudents(response.data)
      setTotal(response.total)
      setLastPage(Math.max(response.last_page, 1))
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudo consultar el listado de estudiantes.'
      )
    } finally {
      setLoading(false)
    }
  }, [page, searchTerm])

  useEffect(() => {
    const requestId = window.setTimeout(() => void loadStudents(), 0)
    return () => window.clearTimeout(requestId)
  }, [loadStudents])

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    setSearchTerm(searchInput.trim())
  }

  const openEdit = (student: Estudiante) => {
    setEditingStudent(student)
    setSuccess('')
    setError('')
  }

  const handleUpdateStudent = async (payload: InscripcionPayload) => {
    if (!editingStudent) return

    try {
      // Si tu backend tiene endpoint de actualización directa:
      await estudiantesService.update(editingStudent.id, {
        nombre: payload.nombre,
        apellido_paterno: payload.apellido_paterno,
        apellido_materno: payload.apellido_materno,
        codigo_sis: payload.codigo_sis,
        email_institucional: payload.email_institucional,
        activo: payload.activo,
      })

      setSuccess('Estudiante actualizado en el padrón correctamente.')
      setEditingStudent(null)
      await loadStudents()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar los datos del estudiante.'
      )
    }
  }

  const activeCount = students.filter((s) => s.activo).length

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <header className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
          Padrón Académico
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-sci-navy sm:text-3xl">
          Padrón general de estudiantes
        </h1>
        <p className="text-sm text-muted-foreground">
          Consulta y gestión de los registros oficiales de estudiantes en la facultad.
        </p>
      </header>

      {/* Tarjetas de Resumen */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="flex items-center gap-3 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sci-navy/10 text-sci-navy">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Total en padrón
              </p>
              <p className="text-2xl font-extrabold text-sci-navy">{total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="flex items-center gap-3 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sci-cyan/15 text-sci-cyan">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Activos en página actual
              </p>
              <p className="text-2xl font-extrabold text-sci-navy">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buscador */}
      <form
        onSubmit={applySearch}
        className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:p-5"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por apellido, nombre, CI o código SIS..."
            className="h-10 bg-background pl-9 text-xs"
          />
        </div>
        <Button type="submit" variant="outline" className="h-10 cursor-pointer gap-2 text-xs">
          <Search className="h-4 w-4" /> Buscar
        </Button>
      </form>

      {/* Alertas */}
      {success && (
        <Alert className="border-sci-cyan/30 bg-sci-cyan/10 text-sci-navy">
          <CheckCircle2 className="h-4 w-4 text-sci-cyan" />
          <AlertDescription className="ml-2 text-xs font-semibold">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="flex items-center justify-between border-sci-red/20 bg-sci-red/10 text-sci-red">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadStudents()}
            className="gap-1 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
          </Button>
        </Alert>
      )}

      {/* Listado con Shadcn UI */}
      {loading ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-border bg-card text-muted-foreground">
          <div className="text-center">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-sci-cyan" />
            <p className="mt-3 text-xs">Cargando padrón de estudiantes...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Tabla de Escritorio */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-xs md:block">
            <Table className="text-xs">
              <TableHeader className="bg-muted/50 font-semibold text-muted-foreground">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="w-[30%] px-5 py-4">Estudiante</TableHead>
                  <TableHead className="w-[16%] px-5 py-4">Código SIS</TableHead>
                  <TableHead className="w-[16%] px-5 py-4">C.I.</TableHead>
                  <TableHead className="w-[24%] px-5 py-4">Correo institucional</TableHead>
                  <TableHead className="px-5 py-4 text-right">Estado / Acciones</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-border">
                {students.map((student) => (
                  <TableRow key={student.id} className="hover:bg-muted/30">
                    <TableCell className="px-5 py-4 font-bold text-sci-navy">
                      {formatNombreCompleto(student)}
                    </TableCell>

                    <TableCell className="px-5 py-4 text-muted-foreground">
                      {student.codigo_sis}
                    </TableCell>

                    <TableCell className="px-5 py-4 text-muted-foreground">
                      {student.ci ? `${student.ci} ${student.ci_extension ?? ''}` : '—'}
                    </TableCell>

                    <TableCell className="break-all px-5 py-4 text-muted-foreground">
                      {student.email_institucional}
                    </TableCell>

                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Badge
                          variant={student.activo ? 'secondary' : 'destructive'}
                          className={`text-[11px] font-semibold ${
                            student.activo
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                              : 'border-red-500/30 bg-red-500/10 text-red-600'
                          }`}
                        >
                          {student.activo ? 'Activo' : 'Inactivo'}
                        </Badge>

                        {canManage && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(student)}
                            className="h-8 cursor-pointer gap-1 text-xs"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Editar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      No se encontraron estudiantes registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Tarjetas Móviles */}
          <div className="space-y-3 md:hidden">
            {students.map((student) => (
              <Card key={student.id} className="rounded-2xl border-border bg-card shadow-xs">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-sm font-bold text-sci-navy">
                      {formatNombreCompleto(student)}
                    </h2>
                    <Badge
                      variant={student.activo ? 'secondary' : 'destructive'}
                      className={`text-[11px] font-semibold ${
                        student.activo
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                          : 'border-red-500/30 bg-red-500/10 text-red-600'
                      }`}
                    >
                      {student.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  <dl className="mt-3 space-y-1.5 text-xs border-t border-border pt-3">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Código SIS:</dt>
                      <dd className="font-medium text-foreground">{student.codigo_sis}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">CI:</dt>
                      <dd className="font-medium text-foreground">
                        {student.ci ? `${student.ci} ${student.ci_extension ?? ''}` : '—'}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-0.5 pt-1">
                      <dt className="text-muted-foreground">Correo:</dt>
                      <dd className="break-all font-medium text-foreground">
                        {student.email_institucional}
                      </dd>
                    </div>
                  </dl>

                  {canManage && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(student)}
                      className="mt-3 w-full cursor-pointer gap-1.5 text-xs"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Editar datos
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}

            {students.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                No se encontraron estudiantes.
              </div>
            )}
          </div>
        </>
      )}

      {/* Paginador con Shadcn */}
      {!loading && total > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <span>
            Página {page} de {lastPage} · {total} estudiantes registrados
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="cursor-pointer gap-1 text-xs"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
              disabled={page >= lastPage}
              className="cursor-pointer gap-1 text-xs"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Reutilización del Modal para Editar */}
      {editingStudent && (
        <EstudianteFormModal
          key={editingStudent.id}
          estudiante={editingStudent}
          examMode={false}
          onClose={() => setEditingStudent(null)}
          onSubmit={handleUpdateStudent}
        />
      )}
    </div>
  )
}