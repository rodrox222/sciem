import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'

import { MateriaFormModal } from '@/components/materias/MateriaFormModal'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  materiasService,
  type Materia,
  type MateriaPayload,
} from '@/services/materias.service'
import type { PaginatedResponse } from '@/types/api'

const PER_PAGE = 10

export default function MateriasPage() {
  const [materias, setMaterias] = useState<Materia[]>([])
  const [busquedaInput, setBusquedaInput] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const [paginaActual, setPaginaActual] = useState(1)
  const [paginacion, setPaginacion] = useState<PaginatedResponse<Materia>>({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: PER_PAGE,
    from: null,
    to: null,
    data: [],
  })

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  // Modal Crear / Editar
  const [modalAbierto, setModalAbierto] = useState(false)
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<Materia | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [resultadoForm, setResultadoForm] = useState('')

  // Modal Eliminar
  const [materiaEliminar, setMateriaEliminar] = useState<Materia | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState('')

  const cargarMaterias = useCallback(async () => {
    setCargando(true)
    setError('')

    try {
      const response = await materiasService.list({
        search: busqueda,
        page: paginaActual,
        perPage: PER_PAGE,
      })
      setMaterias(response.data || [])
      setPaginacion(response)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudieron cargar las materias.',
      )
    } finally {
      setCargando(false)
    }
  }, [busqueda, paginaActual])

  useEffect(() => {
    void cargarMaterias()
  }, [cargarMaterias])

  const manejarBusqueda = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPaginaActual(1)
    setBusqueda(busquedaInput.trim())
  }

  const abrirCrear = () => {
    setMateriaSeleccionada(null)
    setResultadoForm('')
    setModalAbierto(true)
  }

  const abrirEditar = (materia: Materia) => {
    setMateriaSeleccionada(materia)
    setResultadoForm('')
    setModalAbierto(true)
  }

  const guardarMateria = async (payload: MateriaPayload) => {
    try {
      setGuardando(true)
      if (materiaSeleccionada) {
        await materiasService.update(materiaSeleccionada.id, payload)
        setResultadoForm('Asignatura actualizada exitosamente.')
      } else {
        await materiasService.create(payload)
        setResultadoForm('Asignatura creada exitosamente.')
      }
      await cargarMaterias()
    } finally {
      setGuardando(false)
    }
  }

  const confirmarEliminar = async () => {
    if (!materiaEliminar) return

    try {
      setEliminando(true)
      setErrorEliminar('')
      await materiasService.delete(materiaEliminar.id)
      setMateriaEliminar(null)
      setExito('Asignatura eliminada exitosamente.')
      await cargarMaterias()
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar la asignatura.',
      )
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
            Administración · Oferta Curricular
          </span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-sci-navy sm:text-3xl">
            Catálogo de asignaturas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona las materias oficiales habilitadas para la programación de evaluaciones académicas.
          </p>
        </div>

        <Button
          type="button"
          onClick={abrirCrear}
          className="cursor-pointer gap-2 bg-sci-blue font-semibold text-white shadow-xs hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Nueva asignatura
        </Button>
      </div>

      {/* Tarjeta de métricas */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sci-navy/10 text-sci-navy">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Asignaturas registradas</p>
              <p className="text-2xl font-extrabold text-sci-navy">{paginacion.total}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sci-cyan/15 text-sci-cyan">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Materias en esta página</p>
              <p className="text-2xl font-extrabold text-sci-navy">{materias.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <form onSubmit={manejarBusqueda} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={busquedaInput}
              onChange={(e) => setBusquedaInput(e.target.value)}
              placeholder="Buscar asignatura por nombre..."
              className="h-10 pl-9 bg-background"
            />
          </div>
          <Button type="submit" variant="outline" className="h-10 cursor-pointer gap-2">
            <Search className="h-4 w-4" /> Buscar
          </Button>
        </form>
      </div>

      {exito && (
        <div className="rounded-xl border border-sci-cyan/30 bg-sci-cyan/10 px-4 py-3 text-xs font-semibold text-sci-navy">
          {exito}
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-sci-red/30 bg-sci-red/10 px-4 py-3 text-xs text-sci-red">
          <span className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void cargarMaterias()}
            className="cursor-pointer gap-1 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
          </Button>
        </div>
      )}

      {/* Listado */}
      {cargando ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-border bg-card text-muted-foreground">
          <div className="text-center">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-sci-cyan" />
            <p className="mt-3 text-xs">Cargando materias...</p>
          </div>
        </div>
      ) : materias.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
          <div>
            <BookOpen className="mx-auto h-10 w-10" />
            <h2 className="mt-3 text-base font-bold text-foreground">No se encontraron asignaturas</h2>
            <p className="mt-1 text-xs">Ajusta el término de búsqueda o crea una nueva materia.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {materias.map((materia) => (
            <article
              key={materia.id}
              className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sci-blue/10 text-sci-blue">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-bold text-sci-navy">
                    {materia.nombre}
                  </h2>
                  {materia.codigo && (
                    <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                      {materia.codigo}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => abrirEditar(materia)}
                  className="cursor-pointer gap-1 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setErrorEliminar('')
                    setMateriaEliminar(materia)
                  }}
                  className="cursor-pointer gap-1 text-xs text-sci-red hover:bg-sci-red/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Paginación */}
      {!cargando && paginacion.total > 0 && (
        <div className="flex flex-col gap-3 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Página {paginaActual} de {paginacion.last_page} · {paginacion.total} asignaturas
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
              disabled={paginaActual <= 1}
              className="cursor-pointer gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPaginaActual((prev) => Math.min(paginacion.last_page, prev + 1))}
              disabled={paginaActual >= paginacion.last_page}
              className="cursor-pointer gap-1"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar */}
      <MateriaFormModal
        open={modalAbierto}
        materia={materiaSeleccionada}
        guardando={guardando}
        resultado={resultadoForm}
        onOpenChange={setModalAbierto}
        onSubmit={guardarMateria}
      />

      {/* Modal Confirmación de Eliminación */}
      {materiaEliminar && (
        <ConfirmModal
          open
          onOpenChange={(abierto) => !abierto && !eliminando && setMateriaEliminar(null)}
          title="Eliminar asignatura"
          description={
            errorEliminar ? (
              <span className="font-semibold text-sci-red">{errorEliminar}</span>
            ) : (
              `¿Está seguro de eliminar la asignatura "${materiaEliminar.nombre}"? Si tiene exámenes asociados, el sistema protegerá los datos y denegará la operación.`
            )
          }
          confirmText={eliminando ? 'Eliminando...' : 'Eliminar'}
          cancelText="Cancelar"
          onConfirm={confirmarEliminar}
          onCancel={() => setMateriaEliminar(null)}
          variant="destructive"
          showCancel={!eliminando}
        />
      )}
    </div>
  )
}