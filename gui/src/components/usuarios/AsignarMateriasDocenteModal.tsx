import { useEffect, useState, useMemo } from 'react'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  LoaderCircle,
  Search,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  usuariosService,
  type Usuario,
  type MateriaDocenteItem,
} from '@/services/usuarios.service'

interface AsignarMateriasDocenteModalProps {
  open: boolean
  docente: Usuario | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AsignarMateriasDocenteModal({
  open,
  docente,
  onOpenChange,
  onSuccess,
}: AsignarMateriasDocenteModalProps) {
  const [materias, setMaterias] = useState<MateriaDocenteItem[]>([])
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')

  const nombreDocente = docente
    ? [docente.nombre, docente.apellido_paterno, docente.apellido_materno]
        .filter(Boolean)
        .join(' ')
    : ''

  useEffect(() => {
    if (!open || !docente) return

    setCargando(true)
    setError('')
    setMensajeExito('')
    setBusqueda('')

    usuariosService
      .getMateriasDocente(docente.id)
      .then((res) => {
        setMaterias(res.materias || [])
        const iniciales = new Set<string>()
        res.materias.forEach((m) => {
          if (m.asignada) {
            iniciales.add(m.id)
          }
        })
        setSeleccionadas(iniciales)
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar las materias del docente.'
        )
      })
      .finally(() => {
        setCargando(false)
      })
  }, [open, docente])

  const materiasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return materias
    const q = busqueda.toLowerCase().trim()
    return materias.filter(
      (m) =>
        m.nombre.toLowerCase().includes(q) ||
        (m.codigo && m.codigo.toLowerCase().includes(q))
    )
  }, [materias, busqueda])

  const toggleMateria = (id: string) => {
    setSeleccionadas((prev) => {
      const nuevo = new Set(prev)
      if (nuevo.has(id)) {
        nuevo.delete(id)
      } else {
        nuevo.add(id)
      }
      return nuevo
    })
    setError('')
    setMensajeExito('')
  }

  const handleGuardar = async () => {
    if (!docente) return

    setGuardando(true)
    setError('')
    setMensajeExito('')

    try {
      await usuariosService.syncMateriasDocente(
        docente.id,
        Array.from(seleccionadas)
      )
      setMensajeExito('Materias actualizadas exitosamente.')
      onSuccess()
      setTimeout(() => {
        onOpenChange(false)
      }, 700)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al guardar las materias.'
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 shadow-xl border-border max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 pb-2 border-b border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-sci-navy">
              <BookOpen className="h-5 w-5 text-sci-cyan" />
              Asignar Materias / Asignaturas
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Docente: <strong className="text-sci-navy">{nombreDocente}</strong>
              {docente?.email ? ` (${docente.email})` : ''}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-sci-red/20 bg-sci-red/5 p-3.5 text-sm text-sci-red font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {mensajeExito && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-50 p-3.5 text-sm text-emerald-700 font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> {mensajeExito}
            </div>
          )}

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar materia por nombre o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {/* Lista de Materias */}
          <div className="rounded-xl border border-border bg-slate-50/50 p-2 divide-y divide-border/60 max-h-[300px] overflow-y-auto">
            {cargando ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
                <LoaderCircle className="h-5 w-5 animate-spin text-sci-cyan" />
                <span className="text-sm">Cargando catálogo de materias...</span>
              </div>
            ) : materiasFiltradas.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No se encontraron materias que coincidan con la búsqueda.
              </div>
            ) : (
              materiasFiltradas.map((mat) => {
                const estaAsignada = seleccionadas.has(mat.id)
                return (
                  <label
                    key={mat.id}
                    onClick={() => toggleMateria(mat.id)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      estaAsignada
                        ? 'bg-sci-cyan/10 hover:bg-sci-cyan/15'
                        : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={estaAsignada}
                        onChange={() => {}} // Manejado por onClick del label
                        className="h-4 w-4 rounded border-gray-300 text-sci-cyan focus:ring-sci-cyan cursor-pointer"
                      />
                      <div>
                        <div className="text-sm font-semibold text-sci-navy">
                          {mat.nombre}
                        </div>
                        {mat.codigo && (
                          <div className="text-xs text-muted-foreground font-mono">
                            Código: {mat.codigo}
                          </div>
                        )}
                      </div>
                    </div>

                    <Badge
                      className={
                        estaAsignada
                          ? 'border border-sci-cyan/40 bg-sci-cyan/20 text-sci-navy text-xs'
                          : 'border border-slate-200 bg-white text-slate-500 text-xs'
                      }
                    >
                      {estaAsignada ? 'Asignada' : 'No asignada'}
                    </Badge>
                  </label>
                )
              })
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Materias seleccionadas: <strong>{seleccionadas.size}</strong> de {materias.length}
            </span>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-border flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleGuardar}
            disabled={guardando || cargando}
            className="bg-sci-blue text-white hover:opacity-90"
          >
            {guardando && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Asignaciones
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
