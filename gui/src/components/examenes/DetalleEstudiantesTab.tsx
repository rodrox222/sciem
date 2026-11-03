import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  Search,
  Upload,
  UserPlus,
  Users,
  WifiOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { InscribirEstudianteModal } from '@/components/estudiantes/InscribirEstudianteModal'
import { EstudianteFormModal } from '@/components/estudiantes/EstudianteFormModal'
import { CargaMasivaModal } from '@/components/estudiantes/CargaMasivaModal'
import { InhabilitarEstudianteModal } from '@/components/estudiantes/InhabilitarEstudianteModal'
import { EstudianteQrModal } from '@/components/estudiantes/EstudianteQrModal'
import { PrerrequisitosEstudianteModal } from '@/components/estudiantes/PrerrequisitosEstudianteModal'
import { PrerrequisitosPanel } from '@/components/estudiantes/PrerrequisitosPanel'
import { EstudiantesTable } from '@/components/estudiantes/EstudiantesTable'
import { EstudiantesMobileCards } from '@/components/estudiantes/EstudiantesMobileCards'

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
import {
  obtenerEstudiantesOffline,
  obtenerPrerrequisitosOffline,
} from '@/db/offlineStorage'

interface DetalleEstudiantesTabProps {
  exam: Examen
  canManage: boolean
}

export function DetalleEstudiantesTab({ exam, canManage }: DetalleEstudiantesTabProps) {
  const [students, setStudents] = useState<EstudianteInscritoExamen[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<'Todos' | 'Habilitado' | 'Inhabilitado'>('Todos')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isOffline, setIsOffline] = useState(false)
  const [prerrequisitos, setPrerrequisitos] = useState<Prerrequisito[]>([])

  // Estados de Modales
  const [inscribirModalOpen, setInscribirModalOpen] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<any | null>(null)
  const [inhabilitarStudent, setInhabilitarStudent] = useState<EstudianteInscritoExamen | null>(null)
  const [qrStudent, setQrStudent] = useState<EstudianteInscritoExamen | null>(null)
  const [prerrequisitosStudent, setPrerrequisitosStudent] = useState<EstudianteInscritoExamen | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    let loadedOnline = false

    try {
      const [estudiantesRes, prereqsRes] = await Promise.all([
        estudiantesService.listByExam(exam.id),
        prerrequisitosService.listByExam(exam.id).catch(() => []),
      ])

      setStudents(estudiantesRes.estudiantes || [])
      setPrerrequisitos(prereqsRes || [])
      setIsOffline(false)
      loadedOnline = true
    } catch {
      loadedOnline = false
    }

    if (!loadedOnline) {
      try {
        const [estudiantesLocales, prereqsLocales] = await Promise.all([
          obtenerEstudiantesOffline(exam.id),
          obtenerPrerrequisitosOffline(exam.id),
        ])

        if (estudiantesLocales.length > 0) {
          const adaptedStudents: EstudianteInscritoExamen[] = estudiantesLocales.map((st) => ({
            id: st.id_estudiante,
            codigo_sis: st.codigo_sis,
            ci: st.ci,
            ci_extension: st.ci_extension,
            nombre_completo: `${st.apellido_paterno} ${st.apellido_materno || ''} ${st.nombre}`.trim(),
            email_institucional: `${st.codigo_sis}@est.umss.edu`,
            foto_perfil_url: st.foto_perfil_url,
            estado: (st.estado_habilitacion === 'HABILITADO' ? 'Habilitado' : 'Inhabilitado') as 'Habilitado' | 'Inhabilitado',
            motivo_estado: st.estado_habilitacion !== 'HABILITADO' ? 'Inhabilitado' : null,
            ajuste_manual: false,
            fecha_ajuste_manual: null,
            fecha_ingreso: st.fecha_ingreso_previo,
          }))

          const adaptedPrereqs: Prerrequisito[] = prereqsLocales.map((p) => ({
            id: String(p.id),
            id_examen: p.id_examen,
            titulo: p.nombre,
            descripcion: p.descripcion || '',
          }))

          setStudents(adaptedStudents)
          setPrerrequisitos(adaptedPrereqs)
          setIsOffline(true)
        } else {
          setError('No se pudo conectar con el servidor y no hay padrón descargado para este examen.')
        }
      } catch (fallbackErr) {
        setError(fallbackErr instanceof Error ? fallbackErr.message : 'Error al cargar datos locales.')
      }
    }

    setLoading(false)
  }, [exam.id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const visibleStudents = useMemo(() => {
    const search = searchTerm.toLowerCase()

    return students.filter((student) => {
      const matchesSearch =
        !searchTerm ||
        [student.nombre_completo, student.codigo_sis, student.ci]
          .join(' ')
          .toLowerCase()
          .includes(search)

      const matchesEstado =
        estadoFiltro === 'Todos' || student.estado === estadoFiltro

      return matchesSearch && matchesEstado
    })
  }, [searchTerm, students, estadoFiltro])

  const enabledCount = visibleStudents.filter((s) => s.estado === 'Habilitado').length

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    setSearchTerm(searchInput.trim())
  }

  const saveStudent = async (payload: InscripcionPayload) => {
    const response = await estudiantesService.enroll(exam.id, payload)
    setSuccess(response.message || 'Estudiante actualizado correctamente.')
    await loadData()
  }

  const openEditStudent = async (student: EstudianteInscritoExamen) => {
    if (isOffline) return
    try {
      setError('')
      setSuccess('')

      const response = await estudiantesService.list({
        search: student.codigo_sis,
        perPage: 100,
      })

      const fullStudent = response.data.find((item) => item.id === student.id)

      if (!fullStudent) {
        setError('No se pudo encontrar la información completa del estudiante.')
        return
      }

      setEditingStudent({
        ...fullStudent,
        pivot: {
          estado: student.estado,
          motivo_estado: student.motivo_estado,
          ajuste_manual: student.ajuste_manual,
          fecha_ajuste_manual: student.fecha_ajuste_manual,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la información del estudiante.')
    }
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-5 overflow-x-clip">
      {/* Banner de Modo Offline */}
      {isOffline && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-800">
          <WifiOff className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs font-semibold ml-2">
            Modo sin conexión: mostrando padrón y prerrequisitos locales
          </AlertDescription>
        </Alert>
      )}

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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              disabled={isOffline}
              onClick={() => {
                setSuccess('')
                setInscribirModalOpen(true)
              }}
              className="cursor-pointer gap-2 bg-sci-blue text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" /> Inscribir Estudiante
            </Button>

            <Button
              type="button"
              disabled={isOffline}
              onClick={() => {
                setSuccess('')
                setBulkModalOpen(true)
              }}
              variant="outline"
              className="cursor-pointer gap-2 text-xs font-semibold disabled:opacity-50"
            >
              <Upload className="h-4 w-4" /> Carga masiva
            </Button>
          </div>
        )}
      </div>

      {success && (
        <Alert className="border-sci-cyan/30 bg-sci-cyan/10 text-sci-navy">
          <CheckCircle2 className="h-4 w-4 text-sci-cyan" />
          <AlertDescription className="text-xs font-semibold ml-2">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-sci-red/20 bg-sci-red/10 text-sci-red flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-sci-red" />
            <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            className="gap-1 text-xs"
          >
            <RefreshCw className="h-3 w-3" /> Reintentar
          </Button>
        </Alert>
      )}

      {/* Sub-panel de Prerrequisitos */}
      <PrerrequisitosPanel
        examId={exam.id}
        canManage={canManage}
        isOffline={isOffline}
        prerrequisitos={prerrequisitos}
        onPrerrequisitoCreated={loadData}
        onError={setError}
        onSuccess={setSuccess}
      />

      {/* Buscador y Filtros */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Filtrar inscritos por nombre, CI o Código SIS..."
              className="h-10 bg-background pl-9 text-xs"
            />
          </div>
          <Button type="submit" variant="outline" className="h-10 text-xs">
            Buscar
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Estado:
          </span>
          <Select
            value={estadoFiltro}
            onValueChange={(val) =>
              setEstadoFiltro(val as 'Todos' | 'Habilitado' | 'Inhabilitado')
            }
          >
            <SelectTrigger className="h-10 w-36 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="Habilitado">Habilitados</SelectItem>
              <SelectItem value="Inhabilitado">Inhabilitados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabla y tarjetas de Estudiantes */}
      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="grid min-h-64 place-items-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-sci-cyan" />
            </div>
          ) : (
            <>
              <EstudiantesTable
                students={visibleStudents}
                canManage={canManage}
                isOffline={isOffline}
                onVerQr={(st) => setQrStudent(st)}
                onPrerrequisitos={(st) => setPrerrequisitosStudent(st)}
                onEditar={(st) => void openEditStudent(st)}
                onInhabilitar={(st) => {
                  if (!isOffline) {
                    setSuccess('')
                    setInhabilitarStudent(st)
                  }
                }}
              />

              <EstudiantesMobileCards
                students={visibleStudents}
                canManage={canManage}
                isOffline={isOffline}
                onVerQr={(st) => setQrStudent(st)}
                onPrerrequisitos={(st) => setPrerrequisitosStudent(st)}
                onEditar={(st) => void openEditStudent(st)}
                onInhabilitar={(st) => {
                  if (!isOffline) {
                    setSuccess('')
                    setInhabilitarStudent(st)
                  }
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal UNIFICADO de Búsqueda + Alta In Situ */}
      <InscribirEstudianteModal
        examId={exam.id}
        examName={exam.nombre}
        isOpen={inscribirModalOpen}
        onClose={() => setInscribirModalOpen(false)}
        onSuccess={() => {
          setSuccess('Inscripción realizada con éxito.')
          void loadData()
        }}
      />

      {/* Modal solo para EDITAR estudiante existente */}
      {editingStudent && (
        <EstudianteFormModal
          key={editingStudent.id}
          estudiante={editingStudent}
          examMode={true}
          onClose={() => setEditingStudent(null)}
          onSubmit={saveStudent}
        />
      )}

      {/* Modal de Carga Masiva */}
      {bulkModalOpen && (
        <CargaMasivaModal
          isOpen={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          onBulkUpload={async (archivo) => {
            const response = await estudiantesService.cargaMasiva(exam.id, archivo)
            setSuccess(
              response.message ||
                `Carga masiva completada. Se registraron ${response.total_insertados} estudiantes.`
            )
            setBulkModalOpen(false)
            await loadData()
          }}
        />
      )}

      {inhabilitarStudent && (
        <InhabilitarEstudianteModal
          estudiante={inhabilitarStudent as any}
          examName={exam.nombre}
          onClose={() => setInhabilitarStudent(null)}
          onSubmit={async (motivo) => {
            await estudiantesService.cambiarHabilitacion(exam.id, inhabilitarStudent.id, {
              estado: 'Inhabilitado',
              motivo_estado: motivo,
            })
            setInhabilitarStudent(null)
            setSuccess('Estudiante inhabilitado correctamente.')
            await loadData()
          }}
        />
      )}

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
          onSuccess={() => void loadData()}
        />
      )}
    </div>
  )
}