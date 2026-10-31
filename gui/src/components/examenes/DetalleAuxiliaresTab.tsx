import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Users,
  UserPlus,
  Trash2,
  RefreshCw,
  LoaderCircle,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

import { auxiliaresService, type AuxiliarAsignado } from '@/services/auxiliares.service'
import { estudiantesService, type Estudiante } from '@/services/estudiantes.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface DetalleAuxiliaresTabProps {
  examenId: string
  puedeGestionar: boolean
}

const PER_PAGE = 8

const fullName = (student: Estudiante) =>
  [student.nombre, student.apellido_paterno, student.apellido_materno]
    .filter(Boolean)
    .join(' ')

export default function DetalleAuxiliaresTab({
  examenId,
  puedeGestionar,
}: DetalleAuxiliaresTabProps) {
  // Estado de los auxiliares asignados a este examen
  const [auxiliares, setAuxiliares] = useState<AuxiliarAsignado[]>([])
  const [cargandoAuxiliares, setCargandoAuxiliares] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [auxiliarSeleccionado, setAuxiliarSeleccionado] = useState<AuxiliarAsignado | null>(null)
  const [desvinculando, setDesvinculando] = useState(false)

  // Mensajes de estado visuales
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)

  // Estado del padrón de estudiantes para selección
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [totalEstudiantes, setTotalEstudiantes] = useState(0)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [cargandoEstudiantes, setCargandoEstudiantes] = useState(false)
  const [asignandoId, setAsignandoId] = useState<string | null>(null)

  // 1. Cargar auxiliares vinculados a este examen
  const cargarAuxiliares = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargandoAuxiliares(true)
    try {
      const respuesta = await auxiliaresService.listarPorExamen(examenId)
      setAuxiliares(respuesta.data ?? [])
    } catch (error: unknown) {
      setMensajeError(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los auxiliares del examen.'
      )
    } finally {
      setCargandoAuxiliares(false)
      setActualizando(false)
    }
  }, [examenId])

  // 2. Cargar padrón general de estudiantes para asignar
  const cargarEstudiantes = useCallback(async () => {
    setCargandoEstudiantes(true)
    try {
      const response = await estudiantesService.list({
        search: searchTerm,
        page,
        perPage: PER_PAGE,
      })
      setEstudiantes(response.data)
      setTotalEstudiantes(response.total)
      setLastPage(Math.max(response.last_page, 1))
    } catch {
      setMensajeError('No se pudo cargar la lista de estudiantes.')
    } finally {
      setCargandoEstudiantes(false)
    }
  }, [page, searchTerm])

  useEffect(() => {
    void cargarAuxiliares()
  }, [cargarAuxiliares])

  useEffect(() => {
    void cargarEstudiantes()
  }, [cargarEstudiantes])

  // Asignar estudiante seleccionado directamente
  const handleAsignarEstudiante = async (student: Estudiante) => {
    setAsignandoId(student.id)
    setMensajeExito(null)
    setMensajeError(null)

    try {
      const identificador = student.email_institucional || student.codigo_sis
      const respuesta = await auxiliaresService.asignar(examenId, identificador)

      setMensajeExito(respuesta.message || 'Auxiliar asignado exitosamente.')
      await cargarAuxiliares(true)
    } catch (error: any) {
      const mensaje = error.response?.data?.message || error.message || 'No se pudo asignar al auxiliar.'
      setMensajeError(mensaje)
    } finally {
      setAsignandoId(null)
    }
  }

  // Desvincular auxiliar
  const confirmarDesvinculacion = async () => {
    if (!auxiliarSeleccionado) return

    setDesvinculando(true)
    setMensajeExito(null)
    setMensajeError(null)

    try {
      const respuesta = await auxiliaresService.desvincular(
        examenId,
        auxiliarSeleccionado.id_auxiliar,
      )

      setMensajeExito(respuesta.message || 'Auxiliar desvinculado correctamente.')
      setAuxiliarSeleccionado(null)
      await cargarAuxiliares(true)
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudo desvincular al auxiliar.'
      setMensajeError(mensaje)
    } finally {
      setDesvinculando(false)
    }
  }

  const aplicarBusqueda = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPage(1)
    setSearchTerm(searchInput.trim())
  }

  const idsAsignados = new Set(auxiliares.map((a) => a.id_auxiliar))

  return (
    <div className="space-y-6">
      {/* Alertas de Notificación */}
      {mensajeExito && (
        <div className="rounded-xl border border-sci-cyan/30 bg-sci-cyan/10 p-3.5 text-xs font-semibold text-sci-navy flex items-center justify-between">
          <span>{mensajeExito}</span>
          <button
            type="button"
            onClick={() => setMensajeExito(null)}
            className="text-muted-foreground hover:text-foreground ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {mensajeError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-semibold text-destructive flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{mensajeError}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeError(null)}
            className="text-destructive hover:opacity-80 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. SECCIÓN SUPERIOR: AUXILIARES ASIGNADOS */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-sci-navy">
              <Users className="h-5 w-5 text-sci-navy" />
              Auxiliares asignados al examen ({auxiliares.length})
            </CardTitle>
            <CardDescription>
              Personas habilitadas para controlar puerta y escanear en esta evaluación.
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => {
              setActualizando(true)
              void cargarAuxiliares(true)
            }}
            disabled={actualizando || cargandoAuxiliares}
            aria-label="Actualizar lista de auxiliares"
            title="Actualizar lista"
          >
            <RefreshCw className={`h-4 w-4 ${actualizando ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>

        <CardContent>
          {cargandoAuxiliares ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Cargando auxiliares...
            </div>
          ) : auxiliares.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center">
              <Users className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="font-semibold text-sm">No hay auxiliares vinculados a este examen</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Selecciona estudiantes del padrón inferior para asignarlos.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {auxiliares.map((auxiliar) => {
                const nombre = [
                  auxiliar.nombre,
                  auxiliar.apellido_paterno,
                  auxiliar.apellido_materno,
                ].filter(Boolean).join(' ')

                return (
                  <div
                    key={auxiliar.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 shadow-xs"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sci-navy/10 text-sci-navy">
                        <ShieldCheck className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-bold text-xs text-sci-navy">
                          {nombre || 'Auxiliar'}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          SIS: {auxiliar.codigo_sis} · {auxiliar.email_institucional}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">
                        {auxiliar.estado}
                      </Badge>

                      {puedeGestionar && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          onClick={() => setAuxiliarSeleccionado(auxiliar)}
                          title="Desvincular del examen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. SECCIÓN INFERIOR: PADRÓN DE ESTUDIANTES PARA ASIGNAR */}
      {puedeGestionar && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sci-navy">
                  <UserPlus className="h-5 w-5 text-sci-navy" />
                  Agregar auxiliar desde el padrón
                </CardTitle>
                <CardDescription>
                  Busca estudiantes y haz clic en &quot;Asignar Auxiliar&quot; para agregarlos al examen.
                </CardDescription>
              </div>

              {/* Buscador */}
              <form onSubmit={aplicarBusqueda} className="flex gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar por SIS, CI o nombre..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="h-8 pl-8 text-xs bg-background"
                  />
                </div>
                <Button type="submit" variant="outline" size="sm" className="h-8 text-xs cursor-pointer">
                  Buscar
                </Button>
              </form>
            </div>
          </CardHeader>

          <CardContent>
            {cargandoEstudiantes ? (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-xs">
                <LoaderCircle className="h-4 w-4 animate-spin text-sci-cyan" />
                Cargando estudiantes...
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="px-4 py-2.5">Estudiante</th>
                        <th className="px-4 py-2.5">Código SIS</th>
                        <th className="px-4 py-2.5">Correo institucional</th>
                        <th className="px-4 py-2.5 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {estudiantes.map((student) => {
                        const yaAsignado = idsAsignados.has(student.id)
                        const procesando = asignandoId === student.id

                        return (
                          <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 font-bold text-sci-navy truncate">
                              {fullName(student)}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">{student.codigo_sis}</td>
                            <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[200px]">
                              {student.email_institucional}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {yaAsignado ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3" /> Asignado
                                </span>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={procesando}
                                  onClick={() => void handleAsignarEstudiante(student)}
                                  className="h-7 px-2.5 text-[11px] font-semibold bg-sci-navy text-white hover:bg-sci-navy/90 cursor-pointer"
                                >
                                  {procesando ? (
                                    <LoaderCircle className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <UserPlus className="h-3 w-3 mr-1" />
                                  )}
                                  Asignar Auxiliar
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      })}

                      {estudiantes.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                            No se encontraron estudiantes.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                {totalEstudiantes > 0 && (
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Página {page} de {lastPage} · {totalEstudiantes} estudiantes
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((curr) => Math.max(1, curr - 1))}
                        disabled={page <= 1}
                        className="h-7 px-2 text-xs cursor-pointer gap-1"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                      </Button>

                      {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => {
                        let pageNum = i + 1
                        if (lastPage > 5 && page > 3) {
                          pageNum = page - 2 + i
                          if (pageNum > lastPage) pageNum = lastPage - (4 - i)
                        }

                        return (
                          <Button
                            key={pageNum}
                            type="button"
                            variant={page === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            className={`h-7 w-7 p-0 text-xs cursor-pointer ${
                              page === pageNum ? 'bg-sci-navy text-white' : ''
                            }`}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((curr) => Math.min(lastPage, curr + 1))}
                        disabled={page >= lastPage}
                        className="h-7 px-2 text-xs cursor-pointer gap-1"
                      >
                        Siguiente <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmación de desvinculación */}
      <ConfirmDialog
        isOpen={auxiliarSeleccionado !== null}
        title="Desvincular auxiliar del examen"
        description="¿Estás seguro de que deseas retirar a este auxiliar de esta evaluación? El padrón de estudiantes se redistribuirá automáticamente."
        itemName={
          auxiliarSeleccionado
            ? [
                auxiliarSeleccionado.nombre,
                auxiliarSeleccionado.apellido_paterno,
                auxiliarSeleccionado.apellido_materno,
              ]
                .filter(Boolean)
                .join(' ') || auxiliarSeleccionado.email_institucional
            : undefined
        }
        onConfirm={() => void confirmarDesvinculacion()}
        onCancel={() => setAuxiliarSeleccionado(null)}
        loading={desvinculando}
      />
    </div>
  )
}