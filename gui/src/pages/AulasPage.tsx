import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Users,
  Wrench,
} from 'lucide-react'

import { AulaFormModal } from '../components/aulas/AulaFormModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  aulasService,
  type Aula,
  type AulaEstado,
  type AulaPayload,
} from '../services/aulas.service'
import { examenesService, type Examen } from '../services/examenes.service'

const PER_PAGE = 8

const estadoStyles: Record<AulaEstado, string> = {
  Disponible: 'border-sci-cyan/30 bg-sci-cyan/10 text-sci-navy',
  Mantenimiento: 'border-sci-amber/30 bg-sci-amber/10 text-sci-amber',
  Ocupada: 'border-sci-red/30 bg-sci-red/10 text-sci-red',
}

const topBorderStyles: Record<AulaEstado, string> = {
  Disponible: 'bg-sci-cyan',
  Mantenimiento: 'bg-sci-amber',
  Ocupada: 'bg-sci-red',
}

const todayLocal = () => {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export default function AulasPage() {
  const [aulas, setAulas] = useState<Aula[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [estado, setEstado] = useState<AulaEstado | ''>('')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [changingId, setChangingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [aulaSeleccionada, setAulaSeleccionada] = useState<Aula | null>(null)

  // Estados para validación de exámenes programados
  const [aulaPorConfirmar, setAulaPorConfirmar] = useState<Aula | null>(null)
  const [examenesFuturos, setExamenesFuturos] = useState<Examen[]>([])

  const loadAulas = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await aulasService.list({
        search: searchTerm,
        estado,
        page,
        perPage: PER_PAGE,
      })
      setAulas(response.data)
      setTotal(response.total)
      setLastPage(Math.max(response.last_page, 1))
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'No se pudo cargar el catálogo de aulas.',
      )
    } finally {
      setLoading(false)
    }
  }, [estado, page, searchTerm])

  useEffect(() => {
    const requestId = window.setTimeout(() => void loadAulas(), 0)
    return () => window.clearTimeout(requestId)
  }, [loadAulas])

  const visibleCapacity = useMemo(
    () => aulas.reduce((sum, aula) => sum + aula.capacidad, 0),
    [aulas],
  )

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    setSearchTerm(searchInput.trim())
  }

  const openCreate = () => {
    setAulaSeleccionada(null)
    setModalAbierto(true)
    setSuccess('')
  }

  const openEdit = (aula: Aula) => {
    setAulaSeleccionada(aula)
    setModalAbierto(true)
    setSuccess('')
  }

  const saveAula = async (payload: AulaPayload) => {
    if (aulaSeleccionada) {
      const response = await aulasService.update(aulaSeleccionada.id, payload)
      setSuccess(response.message || 'Ambiente actualizado correctamente.')
    } else {
      const response = await aulasService.create(payload)
      setSuccess(response.message || 'Ambiente registrado correctamente.')
    }

    await loadAulas()
  }

  const handleRequestMaintenance = async (aula: Aula) => {
    if (aula.estado === 'Ocupada') return

    if (aula.estado === 'Disponible') {
      setChangingId(aula.id)
      setError('')
      try {
        // Consultar únicamente exámenes futuros programados
        const response = await examenesService.list({
          estado: 'Programado',
          fecha_desde: todayLocal(),
          perPage: 50,
        })
        const now = new Date()

        const examenesAsignados = (response.data || []).filter((exam) => {
          const esMismaAula =
            exam.aula?.id === aula.id ||
            exam.id_aula === aula.id ||
            exam.aula?.nombre === aula.nombre

          if (!esMismaAula || !exam.fecha) return false

          const cleanDate = exam.fecha.slice(0, 10)
          const cleanTime = (exam.hora_ini || '00:00').slice(0, 5)
          const examDate = new Date(`${cleanDate}T${cleanTime}:00`)

          return !Number.isNaN(examDate.getTime()) && examDate >= now
        })

        setExamenesFuturos(examenesAsignados)
      } catch {
        setExamenesFuturos([])
      } finally {
        setChangingId(null)
        setAulaPorConfirmar(aula)
      }
    } else {
      setExamenesFuturos([])
      setAulaPorConfirmar(aula)
    }
  }

  const toggleMaintenance = async (aula: Aula) => {
    if (aula.estado === 'Ocupada') return

    const nextState: AulaEstado =
      aula.estado === 'Mantenimiento' ? 'Disponible' : 'Mantenimiento'
    const action = nextState === 'Mantenimiento' ? 'en mantenimiento' : 'disponible'

    setChangingId(aula.id)
    setError('')
    setSuccess('')

    try {
      const response = await aulasService.update(aula.id, {
        nombre: aula.nombre,
        ubicacion: aula.ubicacion,
        capacidad: aula.capacidad,
        estado: nextState,
      })
      setSuccess(response.message || `Ambiente marcado como ${action}.`)
      await loadAulas()
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : 'Error al actualizar el estado.',
      )
    } finally {
      setChangingId(null)
      setAulaPorConfirmar(null)
      setExamenesFuturos([])
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
            Administración · Infraestructura
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-sci-navy tracking-tight">
            Aulas y ambientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta, registra y actualiza los espacios habilitados para exámenes institucionales.
          </p>
        </div>

        <Button
          type="button"
          onClick={openCreate}
          className="bg-sci-blue hover:opacity-90 text-white font-semibold cursor-pointer shadow-xs gap-2"
        >
          <Plus className="h-4 w-4" />
          Registrar ambiente
        </Button>
      </header>

      {/* Resumen de Métricas */}
      <section aria-label="Resumen del catálogo" className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sci-navy/10 text-sci-navy">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Ambientes registrados</p>
              <p className="text-2xl font-extrabold text-sci-navy">{total}</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sci-cyan/15 text-sci-cyan">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Capacidad en esta página</p>
              <p className="text-2xl font-extrabold text-sci-navy">{visibleCapacity}</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sci-amber/15 text-sci-amber">
              <Wrench className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">En mantenimiento aquí</p>
              <p className="text-2xl font-extrabold text-sci-navy">
                {aulas.filter((aula) => aula.estado === 'Mantenimiento').length}
              </p>
            </div>
          </div>
        </article>
      </section>

      {/* Filtros de Búsqueda */}
      <section className="rounded-2xl border border-border bg-card shadow-xs">
        <div className="border-b border-border p-4 sm:p-5">
          <form onSubmit={applySearch} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por nombre o ubicación..."
                className="h-10 pl-9 bg-background border-border"
              />
            </div>

            <select
              value={estado}
              onChange={(event) => {
                setEstado(event.target.value as AulaEstado | '')
                setPage(1)
              }}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
            >
              <option value="">Todos los estados</option>
              <option value="Disponible">Disponible</option>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Ocupada">Ocupada</option>
            </select>

            <Button type="submit" variant="outline" className="h-10 cursor-pointer gap-2 border-border">
              <Search className="h-4 w-4" /> Buscar
            </Button>
          </form>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {success && (
            <div className="rounded-xl border border-sci-cyan/30 bg-sci-cyan/10 px-4 py-3 text-xs text-sci-navy font-semibold">
              {success}
            </div>
          )}

          {error && (
            <div className="flex flex-col gap-3 rounded-xl border border-sci-red/30 bg-sci-red/10 px-4 py-3 text-xs text-sci-red sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadAulas()}
                className="cursor-pointer gap-1 text-xs border-border"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reintentar
              </Button>
            </div>
          )}

          {loading ? (
            <div className="grid min-h-64 place-items-center text-muted-foreground">
              <div className="text-center">
                <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-sci-cyan" />
                <p className="mt-3 text-xs">Cargando ambientes...</p>
              </div>
            </div>
          ) : aulas.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {aulas.map((aula) => (
                <article
                  key={aula.id}
                  className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition hover:shadow-md"
                >
                  <span
                    className={`absolute inset-x-0 top-0 h-1 ${topBorderStyles[aula.estado]}`}
                  />

                  <div className="flex items-start gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sci-navy/10 text-lg font-bold text-sci-navy">
                      A
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-bold text-sci-navy">
                            {aula.nombre}
                          </h2>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {aula.ubicacion}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${estadoStyles[aula.estado]}`}
                        >
                          {aula.estado}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Users className="h-4 w-4 text-sci-cyan" />
                          {aula.capacidad} estudiantes
                        </span>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(aula)}
                            className="cursor-pointer gap-1 text-xs border-border"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>

                          {aula.estado !== 'Ocupada' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleRequestMaintenance(aula)}
                              disabled={changingId === aula.id}
                              className={`cursor-pointer text-xs ${
                                aula.estado === 'Mantenimiento'
                                  ? 'text-sci-blue hover:bg-sci-blue/10'
                                  : 'text-sci-amber hover:bg-sci-amber/10'
                              }`}
                            >
                              {changingId === aula.id ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Wrench className="h-3.5 w-3.5" />
                              )}
                              {aula.estado === 'Mantenimiento'
                                ? 'Habilitar'
                                : 'Mantenimiento'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border p-8 text-center">
              <div>
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
                <h2 className="mt-3 text-base font-bold text-foreground">
                  No se encontraron ambientes
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ajusta los filtros de búsqueda o registra un nuevo espacio.
                </p>
              </div>
            </div>
          )}

          {!loading && total > 0 && (
            <div className="flex flex-col gap-3 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Página {page} de {lastPage} · {total} ambientes
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="cursor-pointer gap-1 border-border"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                  disabled={page >= lastPage}
                  className="cursor-pointer gap-1 border-border"
                >
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {modalAbierto && (
        <AulaFormModal
          key={aulaSeleccionada?.id ?? 'new'}
          aula={aulaSeleccionada}
          onOpenChange={setModalAbierto}
          onSubmit={saveAula}
        />
      )}

      {aulaPorConfirmar && (
        <ConfirmModal
          open
          onOpenChange={(open) => {
            if (!open && changingId !== aulaPorConfirmar.id) {
              setAulaPorConfirmar(null)
              setExamenesFuturos([])
            }
          }}
          title={
            examenesFuturos.length > 0
              ? 'Conflicto de Horarios: Exámenes Programados'
              : 'Confirmar cambio de estado'
          }
          description={
            examenesFuturos.length > 0 ? (
              <div className="space-y-3 text-left">
                <p className="text-xs font-semibold text-sci-red">
                  El ambiente <strong className="underline text-sci-navy">{aulaPorConfirmar.nombre}</strong> tiene{' '}
                  {examenesFuturos.length} evaluación(es) agendada(s) a futuro:
                </p>

                <div className="max-h-40 overflow-y-auto rounded-xl border border-sci-red/30 bg-sci-red/10 p-2.5 space-y-2">
                  {examenesFuturos.map((ex) => (
                    <div
                      key={ex.id}
                      className="rounded-lg bg-card p-2 border border-border text-xs shadow-xs"
                    >
                      <p className="font-bold text-sci-navy truncate">{ex.nombre}</p>
                      <p className="text-muted-foreground text-[11px] truncate">
                        {ex.materia?.nombre ?? 'Materia asignada'}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="h-3 w-3 text-sci-cyan" />
                          {ex.fecha.slice(0, 10)}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="h-3 w-3 text-sci-amber" />
                          {ex.hora_ini.slice(0, 5)} - {ex.hora_fin.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground leading-snug">
                  Si pasas este ambiente a mantenimiento, el control de acceso para estos exámenes se verá comprometido. ¿Deseas proceder de todos modos?
                </p>
              </div>
            ) : (
              <>
                ¿Deseas marcar el ambiente{' '}
                <strong className="text-foreground">{aulaPorConfirmar.nombre}</strong> como{' '}
                <strong className="text-foreground">
                  {aulaPorConfirmar.estado === 'Mantenimiento'
                    ? 'disponible'
                    : 'en mantenimiento'}
                </strong>
                ?
              </>
            )
          }
          confirmText={
            changingId === aulaPorConfirmar.id
              ? 'Actualizando...'
              : examenesFuturos.length > 0
              ? 'Confirmar mantenimiento'
              : aulaPorConfirmar.estado === 'Mantenimiento'
              ? 'Habilitar'
              : 'Poner en mantenimiento'
          }
          cancelText="Cancelar"
          onConfirm={() => void toggleMaintenance(aulaPorConfirmar)}
          onCancel={() => {
            setAulaPorConfirmar(null)
            setExamenesFuturos([])
          }}
          variant={
            aulaPorConfirmar.estado === 'Mantenimiento'
              ? 'default'
              : examenesFuturos.length > 0
              ? 'destructive'
              : 'default'
          }
        />
      )}
    </div>
  )
}