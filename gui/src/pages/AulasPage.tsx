import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Users,
  Wrench,
} from 'lucide-react'

import { MainLayout } from '../layouts/MainLayout'
import { AulaFormModal } from '../components/aulas/AulaFormModal'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog'
import {
  aulasService,
  type Aula,
  type AulaEstado,
  type AulaPayload,
} from '../services/aulas.service'
import { ApiError } from '../services/apiClient'

const PER_PAGE = 8

const estadoStyles: Record<AulaEstado, string> = {
  Disponible: 'border-[#168FBD]/30 bg-[#168FBD]/10 text-[#08759E]',
  Mantenimiento: 'border-[#D59A18]/30 bg-[#D59A18]/10 text-[#946807]',
  Ocupada: 'border-[#E30613]/25 bg-[#E30613]/8 text-[#B0040E]',
}

const topBorderStyles: Record<AulaEstado, string> = {
  Disponible: 'bg-[#168FBD]',
  Mantenimiento: 'bg-[#D59A18]',
  Ocupada: 'bg-[#E30613]',
}

const getErrorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Ocurrió un error inesperado. Intenta nuevamente.'

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
  const [aulaPorConfirmar, setAulaPorConfirmar] = useState<Aula | null>(null)

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
      setError(getErrorMessage(loadError))
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

  const ensureUniqueName = async (payload: AulaPayload) => {
    const response = await aulasService.list({
      search: payload.nombre,
      perPage: 100,
    })
    const duplicate = response.data.some(
      (aula) =>
        aula.nombre.trim().toLocaleLowerCase() ===
          payload.nombre.trim().toLocaleLowerCase() &&
        aula.id !== aulaSeleccionada?.id,
    )

    if (duplicate) {
      throw new ApiError('Ya existe un ambiente con ese nombre.', 422, {
        nombre: ['Ya existe un ambiente con ese nombre.'],
      })
    }
  }

  const saveAula = async (payload: AulaPayload) => {
    await ensureUniqueName(payload)

    if (aulaSeleccionada) {
      const response = await aulasService.update(aulaSeleccionada.id, payload)
      setSuccess(response.message || 'Ambiente actualizado correctamente.')
    } else {
      const response = await aulasService.create(payload)
      setSuccess(response.message || 'Ambiente registrado correctamente.')
    }

    await loadAulas()
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
      setError(getErrorMessage(updateError))
    } finally {
      setChangingId(null)
      setAulaPorConfirmar(null)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#168FBD]">
              Administración · Entorno
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-[#003770]">
              Aulas y ambientes
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#64748B]">
              Consulta, registra y actualiza los espacios habilitados para los
              exámenes institucionales.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0056B3] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#003770] focus:outline-none focus:ring-2 focus:ring-[#0056B3]/30"
          >
            <Plus className="h-5 w-5" />
            Registrar ambiente
          </button>
        </header>

        <section
          aria-label="Resumen del catálogo"
          className="grid gap-3 sm:grid-cols-3"
        >
          <article className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#0056B3]/10 text-[#0056B3]">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-[#64748B]">Ambientes registrados</p>
                <p className="text-2xl font-bold text-[#003770]">{total}</p>
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#168FBD]/10 text-[#168FBD]">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-[#64748B]">Capacidad en esta página</p>
                <p className="text-2xl font-bold text-[#003770]">{visibleCapacity}</p>
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#D59A18]/10 text-[#D59A18]">
                <Wrench className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-[#64748B]">En mantenimiento aquí</p>
                <p className="text-2xl font-bold text-[#003770]">
                  {aulas.filter((aula) => aula.estado === 'Mantenimiento').length}
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="border-b border-[#E2E8F0] p-4 sm:p-5">
            <form
              onSubmit={applySearch}
              className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]"
            >
              <label className="relative block">
                <span className="sr-only">Buscar ambiente</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Buscar por nombre o ubicación"
                  className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-white pl-10 pr-3 text-sm text-[#1E293B] outline-none transition placeholder:text-[#64748B] focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/15"
                />
              </label>

              <label>
                <span className="sr-only">Filtrar por estado</span>
                <select
                  value={estado}
                  onChange={(event) => {
                    setEstado(event.target.value as AulaEstado | '')
                    setPage(1)
                  }}
                  className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#1E293B] outline-none transition focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/15"
                >
                  <option value="">Todos los estados</option>
                  <option value="Disponible">Disponible</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                  <option value="Ocupada">Ocupada</option>
                </select>
              </label>

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#0056B3] px-5 text-sm font-semibold text-[#0056B3] transition hover:bg-[#0056B3] hover:text-white"
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </form>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            {success && (
              <div
                className="rounded-lg border border-[#168FBD]/25 bg-[#168FBD]/8 px-4 py-3 text-sm text-[#08759E]"
                role="status"
              >
                {success}
              </div>
            )}

            {error && (
              <div
                className="flex flex-col gap-3 rounded-lg border border-[#E30613]/25 bg-[#E30613]/5 px-4 py-3 text-sm text-[#B0040E] sm:flex-row sm:items-center sm:justify-between"
                role="alert"
              >
                <span className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </span>
                <button
                  type="button"
                  onClick={() => void loadAulas()}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#E30613]/25 px-3 font-semibold transition hover:bg-white"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reintentar
                </button>
              </div>
            )}

            {loading ? (
              <div className="grid min-h-64 place-items-center text-[#64748B]">
                <div className="text-center">
                  <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[#168FBD]" />
                  <p className="mt-3 text-sm">Cargando ambientes...</p>
                </div>
              </div>
            ) : aulas.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {aulas.map((aula) => (
                  <article
                    key={aula.id}
                    className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span
                      className={`absolute inset-x-0 top-0 h-1 ${topBorderStyles[aula.estado]}`}
                    />

                    <div className="flex items-start gap-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-[#0056B3]/15 bg-[#0056B3]/8 text-lg font-bold text-[#003770]">
                        A
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="truncate text-lg font-bold text-[#003770]">
                              {aula.nombre}
                            </h2>
                            <p className="mt-1 text-sm text-[#64748B]">
                              {aula.ubicacion}
                            </p>
                          </div>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${estadoStyles[aula.estado]}`}
                          >
                            {aula.estado}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 border-t border-[#E2E8F0] pt-4 sm:flex-row sm:items-center sm:justify-between">
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
                            <Users className="h-4 w-4 text-[#168FBD]" />
                            {aula.capacidad} estudiantes
                          </span>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(aula)}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] px-3 text-sm font-semibold text-[#003770] transition hover:border-[#0056B3] hover:bg-[#0056B3]/5"
                            >
                              <Pencil className="h-4 w-4" />
                              Editar
                            </button>

                            {aula.estado !== 'Ocupada' && (
                              <button
                                type="button"
                                onClick={() => setAulaPorConfirmar(aula)}
                                disabled={changingId === aula.id}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#D59A18]/30 px-3 text-sm font-semibold text-[#946807] transition hover:bg-[#D59A18]/8 disabled:cursor-wait disabled:opacity-60"
                              >
                                {changingId === aula.id ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Wrench className="h-4 w-4" />
                                )}
                                {aula.estado === 'Mantenimiento'
                                  ? 'Habilitar'
                                  : 'Mantenimiento'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[#E2E8F0] bg-[#F7F7F7] px-6 text-center">
                <div>
                  <Building2 className="mx-auto h-10 w-10 text-[#168FBD]" />
                  <h2 className="mt-3 text-lg font-bold text-[#003770]">
                    No se encontraron ambientes
                  </h2>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Ajusta la búsqueda o registra un nuevo ambiente.
                  </p>
                </div>
              </div>
            )}

            {!loading && total > 0 && (
              <div className="flex flex-col gap-3 border-t border-[#E2E8F0] pt-4 text-sm text-[#64748B] sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Página {page} de {lastPage} · {total} ambientes
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 font-semibold text-[#003770] transition hover:bg-[#F7F7F7] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.min(lastPage, current + 1))
                    }
                    disabled={page >= lastPage}
                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 font-semibold text-[#003770] transition hover:bg-[#F7F7F7] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {modalAbierto && (
        <AulaFormModal
          key={aulaSeleccionada?.id ?? 'new'}
          aula={aulaSeleccionada}
          onOpenChange={setModalAbierto}
          onSubmit={saveAula}
        />
      )}

      {aulaPorConfirmar && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && changingId !== aulaPorConfirmar.id) setAulaPorConfirmar(null)
          }}
        >
          <DialogContent
            showCloseButton={false}
            className="max-w-md gap-0 overflow-hidden border-t-4 border-[#D59A18] bg-white p-0 text-[#1E293B] shadow-2xl"
          >
            <DialogHeader className="gap-2 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#946807]">
                Catálogo de aulas
              </p>
              <DialogTitle className="text-xl font-bold text-[#003770]">
                Confirmar cambio de estado
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-[#64748B]">
                ¿Deseas marcar <strong className="text-[#003770]">{aulaPorConfirmar.nombre}</strong> como{' '}
                <strong className="text-[#003770]">
                  {aulaPorConfirmar.estado === 'Mantenimiento' ? 'disponible' : 'en mantenimiento'}
                </strong>?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse gap-2 border-t border-[#E2E8F0] bg-[#F7F7F7] px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setAulaPorConfirmar(null)}
                disabled={changingId === aulaPorConfirmar.id}
                className="min-h-11 rounded-lg border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-[#003770] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void toggleMaintenance(aulaPorConfirmar)}
                disabled={changingId === aulaPorConfirmar.id}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0056B3] px-4 text-sm font-semibold text-white hover:bg-[#003770] disabled:cursor-wait disabled:opacity-50"
              >
                {changingId === aulaPorConfirmar.id && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Confirmar
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  )
}