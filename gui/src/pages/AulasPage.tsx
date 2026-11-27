import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  DoorClosed,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  Wrench,
} from 'lucide-react'

import { AulaFormModal } from '@/components/aulas/AulaFormModal'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Button } from '@/components/ui/button'
import {
  aulasService,
  type Aula,
  type AulaEstado,
  type AulaPayload,
} from '@/services/aulas.service'
import { api } from '@/services/api'
import type { Examen } from '@/services/examenes.service'

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

  // Estados para eliminación (Soft Delete nativo)
  const [aulaEliminar, setAulaEliminar] = useState<Aula | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState('')

  const confirmarEliminarAula = async () => {
    if (!aulaEliminar) return

    try {
      setEliminando(true)
      setErrorEliminar('')
      await aulasService.delete(aulaEliminar.id)
      setAulaEliminar(null)
      setSuccess('Ambiente eliminado exitosamente.')
      await loadAulas()
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar el ambiente.',
      )
    } finally {
      setEliminando(false)
    }
  }

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

      setAulas(response.data || [])
      setTotal(response.total ?? 0)
      setLastPage(Math.max(response.last_page ?? 1, 1))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudieron cargar los ambientes.',
      )
    } finally {
      setLoading(false)
    }
  }, [estado, page, searchTerm])

  useEffect(() => {
    void loadAulas()
  }, [loadAulas])

  // Búsqueda en tiempo real con debounce y limpieza automática
  useEffect(() => {
    const handler = setTimeout(() => {
      const limpio = searchInput.trim()
      if (limpio !== searchTerm) {
        setPage(1)
        setSearchTerm(limpio)
      }
    }, 300)

    return () => clearTimeout(handler)
  }, [searchInput, searchTerm])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSearchTerm(searchInput.trim())
    setPage(1)
  }

  const openCreate = () => {
    setAulaSeleccionada(null)
    setModalAbierto(true)
  }

  const openEdit = (aula: Aula) => {
    setAulaSeleccionada(aula)
    setModalAbierto(true)
  }

  const handleSaveAula = async (payload: AulaPayload) => {
    if (aulaSeleccionada) {
      await aulasService.update(aulaSeleccionada.id, payload)
      setSuccess('Ambiente actualizado exitosamente.')
    } else {
      await aulasService.create(payload)
      setSuccess('Ambiente creado exitosamente.')
    }

    await loadAulas()
  }

  // Interceptar la solicitud de Mantenimiento para validar si hay exámenes futuros
  const handleRequestMaintenance = async (aula: Aula) => {
    // Si ya está en mantenimiento, se desea HABILITAR (pasar a Disponible): no requiere confirmación previa
    if (aula.estado === 'Mantenimiento') {
      await cambiarEstadoDirecto(aula, 'Disponible')
      return
    }

    // Si se desea pasar a Mantenimiento: Consultar exámenes programados o en proceso que no hayan concluido
    try {
      setChangingId(aula.id)
      const res = await api.get<{ data?: Examen[] } | Examen[]>(
        `/examenes?id_aula=${aula.id}&estado=${encodeURIComponent('Programado,En proceso')}&per_page=100`,
      )
      const rawExams = Array.isArray(res) ? res : res?.data ?? []
      const now = new Date()
      const hoy = todayLocal()
      const ahoraHora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      const futuros = rawExams.filter((ex) => {
        if (ex.id_aula !== aula.id) return false
        if (ex.estado !== 'Programado' && ex.estado !== 'En proceso') return false
        const fecha = ex.fecha ? ex.fecha.slice(0, 10) : ''
        if (!fecha || fecha < hoy) return false
        if (fecha === hoy) {
          const horaFin = (ex.hora_fin || '23:59').slice(0, 5)
          return horaFin >= ahoraHora
        }
        return true
      })

      setExamenesFuturos(futuros)
      setAulaPorConfirmar(aula)
    } catch {
      // En caso de fallo de red al consultar exámenes, proceder a abrir el modal preventivo vacío
      setExamenesFuturos([])
      setAulaPorConfirmar(aula)
    } finally {
      setChangingId(null)
    }
  }

  // Ejecución directa del cambio de estado una vez confirmado
  const cambiarEstadoDirecto = async (aula: Aula, nuevoEstado: AulaEstado) => {
    try {
      setChangingId(aula.id)
      setError('')
      const payload: AulaPayload = {
        nombre: aula.nombre,
        ubicacion: aula.ubicacion,
        capacidad: aula.capacidad,
        estado: nuevoEstado,
      }
      await aulasService.update(aula.id, payload)
      setSuccess(`Ambiente marcado como ${nuevoEstado.toLowerCase()}.`)
      await loadAulas()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cambiar el estado del ambiente.',
      )
    } finally {
      setChangingId(null)
      setAulaPorConfirmar(null)
    }
  }

  const stats = [
    { label: 'Total de ambientes', value: total, color: 'text-sci-navy' },
    {
      label: 'Disponibles',
      value: aulas.filter((aula) => aula.estado === 'Disponible').length,
      color: 'text-sci-cyan',
    },
    {
      label: 'Mantenimiento',
      value: aulas.filter((aula) => aula.estado === 'Mantenimiento').length,
      color: 'text-sci-amber',
    },
    {
      label: 'Ocupadas',
      value: aulas.filter((aula) => aula.estado === 'Ocupada').length,
      color: 'text-sci-red',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold tracking-wider text-sci-cyan uppercase">
            Administración del campus
          </span>
          <h1 className="mt-1 text-2xl font-black text-sci-navy sm:text-3xl">
            Gestión de Ambientes
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Control de aulas, laboratorios y auditorios para evaluaciones oficiales.
          </p>
        </div>

        <Button
          type="button"
          onClick={openCreate}
          className="cursor-pointer gap-2 bg-sci-blue text-white shadow-sm hover:opacity-95"
        >
          <Plus className="h-4 w-4" /> Nuevo ambiente
        </Button>
      </section>

      {/* Métricas rápidas */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sci-navy/10 text-sci-navy">
              <DoorClosed className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <span className="block text-xs font-medium text-muted-foreground">
                {stat.label}
              </span>
              <strong className={`text-xl font-black ${stat.color}`}>
                {stat.value}
              </strong>
            </div>
          </article>
        ))}
      </section>

      {/* Filtros y listado */}
      <section className="rounded-2xl border border-border bg-card shadow-xs">
        <div className="border-b border-border p-4 sm:p-5">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar ambiente por nombre o ubicación..."
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
              />
            </div>

            <select
              value={estado}
              onChange={(event) => {
                setEstado(event.target.value as AulaEstado | '')
                setPage(1)
              }}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sci-blue/20 sm:w-52"
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

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setErrorEliminar('')
                              setAulaEliminar(aula)
                            }}
                            className="cursor-pointer gap-1 text-xs text-sci-red hover:bg-sci-red/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center text-muted-foreground">
              <div className="text-center">
                <DoorClosed className="mx-auto h-8 w-8 text-sci-navy/40" />
                <p className="mt-3 text-xs font-medium">
                  No se encontraron ambientes registrados.
                </p>
              </div>
            </div>
          )}

          {lastPage > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
                className="cursor-pointer text-xs border-border"
              >
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                Página {page} de {lastPage}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(prev + 1, lastPage))}
                disabled={page >= lastPage}
                className="cursor-pointer text-xs border-border"
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Modal Crear / Editar */}
      {modalAbierto && (
        <AulaFormModal
          key={aulaSeleccionada?.id ?? 'new'}
          aula={aulaSeleccionada}
          onOpenChange={setModalAbierto}
          onSubmit={handleSaveAula}
        />
      )}

      {/* Modal de Advertencia al pasar a Mantenimiento con Exámenes Futuros */}
      {aulaPorConfirmar && (
        <ConfirmModal
          open
          onOpenChange={(abierto) => !abierto && setAulaPorConfirmar(null)}
          title="Confirmar pase a Mantenimiento"
          description={
            examenesFuturos.length > 0 ? (
              <div className="space-y-2 text-left">
                <p className="font-semibold text-sci-amber">
                  Atención: Este ambiente tiene {examenesFuturos.length} evaluación(es) programada(s) próximamente:
                </p>
                <ul className="max-h-36 overflow-y-auto list-disc pl-5 text-xs text-muted-foreground space-y-1">
                  {examenesFuturos.map((ex) => (
                    <li key={ex.id}>
                      <span className="font-medium text-foreground">{ex.nombre}</span> — Fecha: {ex.fecha?.slice(0, 10)} ({ex.hora_ini?.slice(0, 5)})
                    </li>
                  ))}
                </ul>
                <p className="text-xs pt-1">
                  ¿Desea cambiar el estado a <strong>Mantenimiento</strong> de todas formas?
                </p>
              </div>
            ) : (
              `¿Está seguro de cambiar el estado del ambiente "${aulaPorConfirmar.nombre}" a Mantenimiento?`
            )
          }
          confirmText="Sí, pasar a Mantenimiento"
          cancelText="Cancelar"
          onConfirm={() => void cambiarEstadoDirecto(aulaPorConfirmar, 'Mantenimiento')}
          onCancel={() => setAulaPorConfirmar(null)}
          variant={examenesFuturos.length > 0 ? 'destructive' : 'default'}
        />
      )}

      {/* Modal de confirmación para eliminación (Soft Delete nativo) */}
      {aulaEliminar && (
        <ConfirmModal
          open
          onOpenChange={(abierto) => !abierto && !eliminando && setAulaEliminar(null)}
          title="Eliminar ambiente"
          description={
            errorEliminar ? (
              <span className="font-semibold text-sci-red">{errorEliminar}</span>
            ) : (
              `¿Está seguro de eliminar el ambiente "${aulaEliminar.nombre}"? Si tiene exámenes programados pendientes o en curso, la operación será denegada para proteger la integridad académica.`
            )
          }
          confirmText={eliminando ? 'Eliminando...' : 'Eliminar'}
          cancelText="Cancelar"
          onConfirm={() => void confirmarEliminarAula()}
          onCancel={() => setAulaEliminar(null)}
          variant="destructive"
          showCancel={!eliminando}
        />
      )}
    </div>
  )
}
