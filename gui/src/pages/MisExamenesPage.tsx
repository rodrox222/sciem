import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  Search,
  Eye,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

type EstadoExamen = 'Programado' | 'Cancelado' | 'Finalizado'

interface ExamenDocente {
  id: number
  asignatura: string
  fecha: string
  horaInicio: string
  horaFin: string
  duracion: number
  aula: string
  normas: number
  estado: EstadoExamen
  docente: string
}

const misExamenesIniciales: ExamenDocente[] = [
  {
    id: 1,
    asignatura: 'Sistemas Operativos',
    fecha: '2026-09-18',
    horaInicio: '08:00',
    horaFin: '09:30',
    duracion: 90,
    aula: 'Aula A-101',
    normas: 3,
    estado: 'Programado',
    docente: 'Juan Pérez',
  },
  {
    id: 2,
    asignatura: 'Redes de Computadoras',
    fecha: '2026-09-25',
    horaInicio: '14:00',
    horaFin: '15:30',
    duracion: 90,
    aula: 'Laboratorio L-01',
    normas: 2,
    estado: 'Programado',
    docente: 'Juan Pérez',
  },
  {
    id: 3,
    asignatura: 'Bases de Datos',
    fecha: '2026-08-20',
    horaInicio: '10:00',
    horaFin: '11:30',
    duracion: 90,
    aula: 'Aula A-203',
    normas: 4,
    estado: 'Finalizado',
    docente: 'Juan Pérez',
  },
]

const ESTADO_BADGE_STYLES: Record<EstadoExamen, string> = {
  Programado: 'border-sci-cyan/30 bg-sci-cyan/10 text-sci-navy',
  Finalizado: 'border-muted-foreground/30 bg-muted text-muted-foreground',
  Cancelado: 'border-sci-red/30 bg-sci-red/10 text-sci-red',
}

export default function MisExamenesPage() {
  const navigate = useNavigate()

  const [examenes] = useState<ExamenDocente[]>(misExamenesIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | EstadoExamen>('Todos')
  const [examenSeleccionado, setExamenSeleccionado] = useState<ExamenDocente | null>(null)

  const examenesFiltrados = examenes.filter((examen) => {
    const texto = busqueda.trim().toLowerCase()

    const coincideBusqueda =
      !texto ||
      examen.asignatura.toLowerCase().includes(texto) ||
      examen.aula.toLowerCase().includes(texto)

    const coincideEstado =
      filtroEstado === 'Todos' || examen.estado === filtroEstado

    return coincideBusqueda && coincideEstado
  })

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
            Docencia y Evaluaciones
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-sci-navy tracking-tight">
            Mis exámenes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta y supervisa los exámenes programados bajo tu responsabilidad académica.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => navigate('/programar-examen')}
          className="bg-sci-blue hover:opacity-90 text-white font-semibold cursor-pointer shadow-xs gap-2"
        >
          <Plus className="h-4 w-4" />
          Programar examen
        </Button>
      </div>

      {/* Resumen numérico */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <p className="text-xs text-muted-foreground font-medium">Total de mis exámenes</p>
          <p className="mt-1 text-2xl font-extrabold text-sci-navy">{examenes.length}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <p className="text-xs text-muted-foreground font-medium">Programados</p>
          <p className="mt-1 text-2xl font-extrabold text-sci-cyan">
            {examenes.filter((examen) => examen.estado === 'Programado').length}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <p className="text-xs text-muted-foreground font-medium">Finalizados</p>
          <p className="mt-1 text-2xl font-extrabold text-muted-foreground">
            {examenes.filter((examen) => examen.estado === 'Finalizado').length}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por asignatura o aula..."
              className="h-10 pl-9 bg-background"
            />
          </div>

          <select
            value={filtroEstado}
            onChange={(event) =>
              setFiltroEstado(event.target.value as 'Todos' | EstadoExamen)
            }
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Programado">Programados</option>
            <option value="Finalizado">Finalizados</option>
            <option value="Cancelado">Cancelados</option>
          </select>
        </div>
      </section>

      {/* Listado */}
      <section className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-sci-navy">
            Mis evaluaciones registradas
          </h2>
          <p className="text-xs text-muted-foreground">
            Historial de exámenes activos y pasados.
          </p>
        </div>

        <div className="p-5">
          {examenesFiltrados.length > 0 ? (
            <div className="space-y-3">
              {examenesFiltrados.map((examen) => (
                <article
                  key={examen.id}
                  className="rounded-2xl border border-border bg-card p-5 transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-sci-navy">
                          {examen.asignatura}
                        </h3>

                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                            ESTADO_BADGE_STYLES[examen.estado]
                          }`}
                        >
                          {examen.estado}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 shrink-0 text-sci-cyan" />
                          <span>{examen.fecha}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 shrink-0 text-sci-cyan" />
                          <span>
                            {examen.horaInicio} - {examen.horaFin}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0 text-sci-cyan" />
                          <span>{examen.aula}</span>
                        </div>

                        <div>
                          <span className="font-semibold text-foreground">Duración:</span>{' '}
                          {examen.duracion} min
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setExamenSeleccionado(examen)}
                        className="cursor-pointer gap-1.5 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver detalle
                      </Button>

                      {examen.estado === 'Programado' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer gap-1.5 text-xs text-sci-red hover:bg-sci-red/10"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold text-foreground">
                No se encontraron exámenes registrados.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Prueba ajustando los filtros de búsqueda o programa una nueva evaluación.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Modal Detalle */}
      {examenSeleccionado && (
        <Dialog open onOpenChange={(open) => !open && setExamenSeleccionado(null)}>
          <DialogContent className="max-w-xl p-0 overflow-hidden border-border bg-card text-card-foreground shadow-2xl rounded-2xl">
            <DialogHeader className="border-b border-border px-6 py-5 text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sci-cyan">
                Detalle de la evaluación
              </span>
              <DialogTitle className="mt-1 text-xl font-bold text-sci-navy">
                {examenSeleccionado.asignatura}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Información técnica y horaria de la evaluación docente.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 text-xs">
              <div className="space-y-1">
                <p className="font-semibold text-foreground uppercase tracking-wider text-[10px]">Fecha</p>
                <p className="text-muted-foreground">{examenSeleccionado.fecha}</p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-foreground uppercase tracking-wider text-[10px]">Horario</p>
                <p className="text-muted-foreground">{examenSeleccionado.horaInicio} - {examenSeleccionado.horaFin}</p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-foreground uppercase tracking-wider text-[10px]">Ambiente</p>
                <p className="text-muted-foreground">{examenSeleccionado.aula}</p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-foreground uppercase tracking-wider text-[10px]">Duración estimada</p>
                <p className="text-muted-foreground">{examenSeleccionado.duracion} minutos</p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-foreground uppercase tracking-wider text-[10px]">Normas vinculadas</p>
                <p className="text-muted-foreground">{examenSeleccionado.normas} normativas asignadas</p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-foreground uppercase tracking-wider text-[10px]">Estado</p>
                <p className="font-semibold text-sci-navy">{examenSeleccionado.estado}</p>
              </div>
            </div>

            <div className="flex justify-end border-t border-border bg-muted/40 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExamenSeleccionado(null)}
                className="cursor-pointer text-xs"
              >
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}