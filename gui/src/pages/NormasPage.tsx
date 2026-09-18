import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  FileText,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'

import { NormaFormModal } from '../components/normas/NormaFormModal'
import { MainLayout } from '../layouts/MainLayout'
import {
  normasService,
  type Norma,
  type NormaPayload,
} from '../services/normas.service'
import { ApiError } from '../services/apiClient'

const getErrorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Ocurrió un error inesperado. Intenta nuevamente.'

const TIPO_BADGE_STYLES: Record<string, string> = {
  General: 'border-blue-200 bg-blue-50 text-[#002b5b]',
  Particular: 'border-purple-200 bg-purple-50 text-purple-700',
}

const ESTADO_BADGE_STYLES: Record<string, string> = {
  Activo: 'border-green-200 bg-green-50 text-green-700',
  Inactivo: 'border-red-200 bg-red-50 text-red-600',
}

const ESTADO_BORDER_STYLES: Record<string, string> = {
  Activo: 'bg-[#002b5b]',
  Inactivo: 'bg-red-500',
}

export default function NormasPage() {
  const [normas, setNormas] = useState<Norma[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [normaSeleccionada, setNormaSeleccionada] = useState<Norma | null>(null)

  const loadNormas = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await normasService.list({
        search: searchTerm,
        tipo: 'General',
        page,
      })
      setNormas(response.data)
      setTotal(response.total)
      setLastPage(Math.max(response.last_page, 1))
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [page, searchTerm])

  useEffect(() => {
    const requestId = window.setTimeout(() => void loadNormas(), 0)
    return () => window.clearTimeout(requestId)
  }, [loadNormas])

  const visibleCounts = useMemo(
    () => ({
      general: normas.filter((norma) => norma.tipo === 'General').length,
    }),
    [normas],
  )

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

  return (
    <MainLayout>
      <section className="space-y-6">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D59A18]">
              Configuración · Normativas
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-[#003770]">
              Catálogo de normas
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#64748B]">
              El administrador registra normas generales para programar cada examen.
              Las normas particulares se agregan dentro de un examen.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0056B3] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#003770]"
          >
            <Plus className="h-5 w-5" />
            Registrar norma general
          </button>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#0056B3]/10 text-[#0056B3]">
                <BookOpenCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-[#64748B]">Normas registradas</p>
                <p className="text-2xl font-bold text-[#003770]">{total}</p>
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#168FBD]/10 text-[#168FBD]">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-[#64748B]">Generales en esta página</p>
                <p className="text-2xl font-bold text-[#003770]">
                  {visibleCounts.general}
                </p>
              </div>
            </div>
          </article>


        </div>

        <section className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="border-b border-[#E2E8F0] p-4 sm:p-5">
            <form
              onSubmit={applySearch}
              className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <label className="relative block">
                <span className="sr-only">Buscar norma</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Buscar por título o descripción"
                  className="h-11 w-full rounded-lg border border-[#E2E8F0] pl-10 pr-3 text-sm text-[#1E293B] outline-none transition focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/15"
                />
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
                  onClick={() => void loadNormas()}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#E30613]/25 px-3 font-semibold hover:bg-white"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reintentar
                </button>
              </div>
            )}

            {loading ? (
              <div className="grid min-h-64 place-items-center text-[#64748B]">
                <div className="text-center">
                  <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[#D59A18]" />
                  <p className="mt-3 text-sm">Cargando normas...</p>
                </div>
              </div>
            ) : normas.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {normas.map((norma) => (
                  <article
                    key={norma.id}
                    className="relative flex min-h-52 flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span
                      className={`absolute inset-x-0 top-0 h-1 ${
                        norma.tipo === 'General' ? 'bg-[#168FBD]' : 'bg-[#D59A18]'
                      }`}
                    />

                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          norma.tipo === 'General'
                            ? 'border-[#168FBD]/30 bg-[#168FBD]/10 text-[#08759E]'
                            : 'border-[#D59A18]/30 bg-[#D59A18]/10 text-[#946807]'
                        }`}
                      >
                        {norma.tipo}
                      </span>
                      <button
                        type="button"
                        onClick={() => openEdit(norma)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] px-3 text-sm font-semibold text-[#003770] transition hover:border-[#0056B3] hover:bg-[#0056B3]/5"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>
                    </div>

                    <h2 className="mt-4 text-lg font-bold text-[#003770]">
                      {norma.titulo}
                    </h2>
                    <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-[#64748B]">
                      {norma.descripcion}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[#E2E8F0] bg-[#F7F7F7] px-6 text-center">
                <div>
                  <BookOpenCheck className="mx-auto h-10 w-10 text-[#D59A18]" />
                  <h2 className="mt-3 text-lg font-bold text-[#003770]">
                    No se encontraron normas
                  </h2>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Ajusta la búsqueda o registra un nuevo lineamiento.
                  </p>
                </div>
              </div>
            )}

            {!loading && total > 0 && (
              <div className="flex flex-col gap-3 border-t border-[#E2E8F0] pt-4 text-sm text-[#64748B] sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Página {page} de {lastPage} · {total} normas
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 font-semibold text-[#003770] hover:bg-[#F7F7F7] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                    disabled={page >= lastPage}
                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 font-semibold text-[#003770] hover:bg-[#F7F7F7] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </button>
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
      </section>
    </MainLayout>
  )
}
