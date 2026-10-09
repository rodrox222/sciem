import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  BookOpenCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
} from 'lucide-react'

import { NormaFormModal } from '../components/normas/NormaFormModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  normasService,
  type Norma,
  type NormaEstado,
  type NormaPayload,
} from '../services/normas.service'
import { examenesService, type Examen } from '../services/examenes.service'

const topBorderStyles: Record<NormaEstado, string> = {
  Activo: 'bg-sci-cyan',
  Inactivo: 'bg-sci-red',
}

export default function NormasPage() {
  const [normas, setNormas] = useState<Norma[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<NormaEstado | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [changingId, setChangingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [normaSeleccionada, setNormaSeleccionada] = useState<Norma | null>(null)

  // Estados para validación de exámenes asociados
  const [normaPorConfirmar, setNormaPorConfirmar] = useState<Norma | null>(null)
  const [examenesAfectados, setExamenesAfectados] = useState<Examen[]>([])

  const loadNormas = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await normasService.list({
        search: searchTerm,
        tipo: 'General',
        estado: estadoFiltro === 'ALL' ? '' : estadoFiltro,
        page,
      })
      setNormas(response.data)
      setTotal(response.total)
      setLastPage(Math.max(response.last_page, 1))
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'No se pudieron consultar las normas.',
      )
    } finally {
      setLoading(false)
    }
  }, [page, searchTerm, estadoFiltro])

  useEffect(() => {
    const requestId = window.setTimeout(() => void loadNormas(), 0)
    return () => window.clearTimeout(requestId)
  }, [loadNormas])

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    setSearchTerm(searchInput.trim())
  }

  const openCreate = () => {
    setNormaSeleccionada(null)
    setModalAbierto(true)
    setSuccess('')
  }

  const openEdit = (norma: Norma) => {
    setNormaSeleccionada(norma)
    setModalAbierto(true)
    setSuccess('')
  }

  const saveNorma = async (payload: NormaPayload) => {
    if (normaSeleccionada) {
      const response = await normasService.update(normaSeleccionada.id, payload)
      setSuccess(response.message || 'Norma actualizada correctamente.')
    } else {
      const response = await normasService.create(payload)
      setSuccess(response.message || 'Norma registrada correctamente.')
    }

    await loadNormas()
  }

  const handleRequestToggleStatus = async (norma: Norma) => {
    setError('')

    if (norma.estado === 'Activo') {
      setChangingId(norma.id)
      try {
        const response = await examenesService.list({ perPage: 100 })
        const now = new Date()

        const asociados = (response.data || []).filter((exam) => {
          if (!exam.fecha || exam.estado !== 'Programado') return false

          const cleanDate = exam.fecha.slice(0, 10)
          const cleanTime = (exam.hora_ini || '00:00').slice(0, 5)
          const examDate = new Date(`${cleanDate}T${cleanTime}:00`)

          const esFuturo = !Number.isNaN(examDate.getTime()) && examDate >= now
          if (!esFuturo) return false

          return (exam.normas || []).some((n) => n.id === norma.id)
        })

        setExamenesAfectados(asociados)
      } catch {
        setExamenesAfectados([])
      } finally {
        setChangingId(null)
        setNormaPorConfirmar(norma)
      }
    } else {
      setExamenesAfectados([])
      setNormaPorConfirmar(norma)
    }
  }

  const toggleEstado = async (norma: Norma) => {
    const nextEstado: NormaEstado = norma.estado === 'Activo' ? 'Inactivo' : 'Activo'
    setChangingId(norma.id)
    setError('')
    setSuccess('')

    try {
      const response = await normasService.update(norma.id, {
        estado: nextEstado,
      })
      setSuccess(response.message || `Norma marcada como ${nextEstado.toLowerCase()}.`)
      await loadNormas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el estado de la norma.')
    } finally {
      setChangingId(null)
      setNormaPorConfirmar(null)
      setExamenesAfectados([])
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
            Configuración · Normativas
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-sci-navy tracking-tight">
            Catálogo de normas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registra y gestiona las normas generales para la programación de evaluaciones.
          </p>
        </div>

        <Button
          type="button"
          onClick={openCreate}
          className="bg-sci-blue hover:opacity-90 text-white font-semibold cursor-pointer shadow-xs gap-2"
        >
          <Plus className="h-4 w-4" />
          Registrar norma general
        </Button>
      </header>

      {/* Resumen numérico */}
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sci-navy/10 text-sci-navy">
              <BookOpenCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Normas registradas</p>
              <p className="text-2xl font-extrabold text-sci-navy">{total}</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sci-cyan/15 text-sci-cyan">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Normas activas</p>
              <p className="text-2xl font-extrabold text-sci-navy">
                {normas.filter((n) => n.estado === 'Activo').length}
              </p>
            </div>
          </div>
        </article>
      </div>

      {/* Buscador y Filtros con Shadcn UI */}
      <section className="rounded-2xl border border-border bg-card shadow-xs">
        <div className="border-b border-border p-4 sm:p-5">
          <form onSubmit={applySearch} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por título o descripción..."
                className="h-10 pl-9 bg-background border-border"
              />
            </div>

            <Select
              value={estadoFiltro}
              onValueChange={(val) => {
                setEstadoFiltro(val as NormaEstado | 'ALL')
                setPage(1)
              }}
            >
              <SelectTrigger className="h-10 w-full border-border bg-background text-foreground">
                <SelectValue placeholder="Estado de norma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los estados</SelectItem>
                <SelectItem value="Activo">Activas</SelectItem>
                <SelectItem value="Inactivo">Inactivas</SelectItem>
              </SelectContent>
            </Select>

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
                onClick={() => void loadNormas()}
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
                <p className="mt-3 text-xs">Cargando catálogo de normas...</p>
              </div>
            </div>
          ) : normas.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {normas.map((norma) => (
                <article
                  key={norma.id}
                  className="relative flex min-h-52 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span
                    className={`absolute inset-x-0 top-0 h-1 ${topBorderStyles[norma.estado ?? 'Activo']}`}
                  />

                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-border bg-muted text-sci-navy font-semibold">
                          {norma.tipo}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            norma.estado === 'Activo'
                              ? 'border-sci-cyan/30 bg-sci-cyan/10 text-sci-navy font-semibold'
                              : 'border-sci-red/30 bg-sci-red/10 text-sci-red font-semibold'
                          }
                        >
                          {norma.estado ?? 'Activo'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(norma)}
                          className="cursor-pointer gap-1 text-xs border-border"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleRequestToggleStatus(norma)}
                          disabled={changingId === norma.id}
                          className={`cursor-pointer text-xs gap-1 ${
                            norma.estado === 'Inactivo'
                              ? 'text-sci-blue hover:bg-sci-blue/10'
                              : 'text-sci-red hover:bg-sci-red/10'
                          }`}
                        >
                          {changingId === norma.id ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                          {norma.estado === 'Inactivo' ? 'Activar' : 'Desactivar'}
                        </Button>
                      </div>
                    </div>

                    <h2 className="mt-3 text-base font-bold text-sci-navy">
                      {norma.titulo}
                    </h2>
                    <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted-foreground">
                      {norma.descripcion}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border p-8 text-center">
              <div>
                <BookOpenCheck className="mx-auto h-10 w-10 text-muted-foreground" />
                <h2 className="mt-3 text-base font-bold text-foreground">
                  No se encontraron normas
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ajusta los términos de búsqueda o registra un nuevo lineamiento.
                </p>
              </div>
            </div>
          )}

          {!loading && total > 0 && (
            <div className="flex flex-col gap-3 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Página {page} de {lastPage} · {total} normas
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
        <NormaFormModal
          key={normaSeleccionada?.id ?? 'new'}
          norma={normaSeleccionada}
          onOpenChange={setModalAbierto}
          onSubmit={saveNorma}
        />
      )}

      {/* Modal con confirmación y alerta de exámenes futuros vinculados */}
      {normaPorConfirmar && (
        <ConfirmModal
          open
          onOpenChange={(open) => {
            if (!open && changingId !== normaPorConfirmar.id) {
              setNormaPorConfirmar(null)
              setExamenesAfectados([])
            }
          }}
          title={
            examenesAfectados.length > 0
              ? 'Conflicto: Norma asignada a evaluaciones futuras'
              : 'Confirmar cambio de estado'
          }
          description={
            examenesAfectados.length > 0 ? (
              <div className="space-y-3 text-left">
                <p className="text-xs font-semibold text-sci-red">
                  La norma <strong className="underline text-sci-navy">{normaPorConfirmar.titulo}</strong> está vinculada a{' '}
                  {examenesAfectados.length} examen(es) programado(s) a futuro:
                </p>

                <div className="max-h-40 overflow-y-auto rounded-xl border border-sci-red/30 bg-sci-red/10 p-2.5 space-y-2">
                  {examenesAfectados.map((ex) => (
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
                  Desactivar esta norma impedirá que se aplique como lineamiento activo en los controles de acceso. ¿Deseas desactivarla de todos modos?
                </p>
              </div>
            ) : (
              <>
                ¿Deseas marcar la norma{' '}
                <strong className="text-foreground">{normaPorConfirmar.titulo}</strong> como{' '}
                <strong className="text-foreground">
                  {normaPorConfirmar.estado === 'Inactivo' ? 'activa' : 'inactiva'}
                </strong>
                ?
              </>
            )
          }
          confirmText={
            changingId === normaPorConfirmar.id
              ? 'Actualizando...'
              : examenesAfectados.length > 0
              ? 'Confirmar desactivación'
              : normaPorConfirmar.estado === 'Inactivo'
              ? 'Activar'
              : 'Desactivar'
          }
          cancelText="Cancelar"
          onConfirm={() => void toggleEstado(normaPorConfirmar)}
          onCancel={() => {
            setNormaPorConfirmar(null)
            setExamenesAfectados([])
          }}
          variant={
            normaPorConfirmar.estado === 'Inactivo'
              ? 'default'
              : examenesAfectados.length > 0
              ? 'destructive'
              : 'default'
          }
        />
      )}
    </div>
  )
}