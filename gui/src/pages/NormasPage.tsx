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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  normasService,
  type Norma,
  type NormaPayload,
} from '../services/normas.service'

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
      setError(
        loadError instanceof Error ? loadError.message : 'No se pudieron consultar las normas.',
      )
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
    <div className="space-y-6">
      {/* Encabezado */}
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
              <p className="text-xs text-muted-foreground">Generales en esta página</p>
              <p className="text-2xl font-extrabold text-sci-navy">{visibleCounts.general}</p>
            </div>
          </div>
        </article>
      </div>

      {/* Buscador y Contenido */}
      <section className="rounded-2xl border border-border bg-card shadow-xs">
        <div className="border-b border-border p-4 sm:p-5">
          <form onSubmit={applySearch} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por título o descripción..."
                className="h-10 pl-9 bg-background"
              />
            </div>

            <Button type="submit" variant="outline" className="h-10 cursor-pointer gap-2">
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
            <div className="flex flex-col gap-3 rounded-xl border border-sci-red/20 bg-sci-red/10 px-4 py-3 text-xs text-sci-red sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadNormas()}
                className="cursor-pointer gap-1 text-xs"
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
                    className={`absolute inset-x-0 top-0 h-1 ${
                      norma.tipo === 'General' ? 'bg-sci-blue' : 'bg-sci-amber'
                    }`}
                  />

                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          norma.tipo === 'General'
                            ? 'border-sci-cyan/30 bg-sci-cyan/10 text-sci-navy'
                            : 'border-sci-amber/30 bg-sci-amber/10 text-sci-amber'
                        }`}
                      >
                        {norma.tipo}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(norma)}
                        className="cursor-pointer gap-1 text-xs"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
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
                  className="cursor-pointer gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                  disabled={page >= lastPage}
                  className="cursor-pointer gap-1"
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
    </div>
  )
}