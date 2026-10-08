import { useEffect, useState } from 'react'
import { Check, LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import {
  prerrequisitosService,
  type Prerrequisito,
  type PrerrequisitoEstudiante,
} from '@/services/prerrequisitos.service'

import type { EstudianteInscritoExamen } from '@/services/estudiantes.service'

interface PrerrequisitosEstudianteModalProps {
  examId: string
  estudiante: EstudianteInscritoExamen
  prerrequisitos: Prerrequisito[]
  onClose: () => void
  onSuccess?: () => void
}

export function PrerrequisitosEstudianteModal({
  examId,
  estudiante,
  prerrequisitos,
  onClose,
  onSuccess,
}: PrerrequisitosEstudianteModalProps) {
  const [cumplimientos, setCumplimientos] = useState<
    Record<string, boolean>
  >({})

  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const cargarCumplimientos = async () => {
      setLoading(true)
      setError('')

      try {
        /*
         * Este GET será implementado por Backend.
         *
         * Mientras no exista, usamos la lista de prerrequisitos
         * del examen sin asumir que alguno está cumplido.
         */
        const response =
          await prerrequisitosService.getByStudent(
            examId,
            estudiante.id,
          )

        const estados: Record<string, boolean> = {}

        response.forEach((prerrequisito: PrerrequisitoEstudiante) => {
          estados[prerrequisito.id] = prerrequisito.cumplido
        })

        setCumplimientos(estados)
      } catch {
        /*
         * El GET todavía puede no existir.
         * Dejamos todos los prerrequisitos como pendientes
         * sin mostrar información falsa.
         */
        const estadosIniciales: Record<string, boolean> = {}

        prerrequisitos.forEach((prerrequisito) => {
          estadosIniciales[prerrequisito.id] = false
        })

        setCumplimientos(estadosIniciales)
      } finally {
        setLoading(false)
      }
    }

    void cargarCumplimientos()
  }, [examId, estudiante.id, prerrequisitos])

  const cambiarCumplimiento = async (
    prerrequisito: Prerrequisito,
    cumplido: boolean,
  ) => {
    setSavingId(prerrequisito.id)
    setError('')

    try {
      await prerrequisitosService.toggleCumplimiento(
        prerrequisito.id,
        estudiante.id,
        { cumplido },
      )

      setCumplimientos((actual) => ({
        ...actual,
        [prerrequisito.id]: cumplido,
      }))

      onSuccess?.()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar el prerrequisito.',
      )
    } finally {
      setSavingId(null)
    }
  }

  const marcarTodos = async () => {
    for (const prerrequisito of prerrequisitos) {
      if (!cumplimientos[prerrequisito.id]) {
        await cambiarCumplimiento(prerrequisito, true)
      }
    }
  }

  const todosCumplidos =
    prerrequisitos.length > 0 &&
    prerrequisitos.every(
      (prerrequisito) => cumplimientos[prerrequisito.id],
    )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-sci-navy">
            Prerrequisitos del estudiante
          </DialogTitle>

          <DialogDescription className="text-xs">
            {estudiante.nombre_completo}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-sci-red/20 bg-sci-red/10 px-4 py-3 text-xs font-medium text-sci-red">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-40 items-center justify-center">
            <LoaderCircle className="h-7 w-7 animate-spin text-sci-cyan" />
          </div>
        ) : prerrequisitos.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/20 p-5 text-center">
            <p className="text-sm font-semibold text-sci-navy">
              No hay prerrequisitos configurados.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {prerrequisitos.map((prerrequisito) => {
                const cumplido =
                  cumplimientos[prerrequisito.id] ?? false

                const guardando =
                  savingId === prerrequisito.id

                return (
                  <button
                    key={prerrequisito.id}
                    type="button"
                    disabled={guardando}
                    onClick={() =>
                      void cambiarCumplimiento(
                        prerrequisito,
                        !cumplido,
                      )
                    }
                    className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                      cumplido
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-border bg-white hover:bg-muted/30'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        cumplido
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {guardando ? (
                        <LoaderCircle className="h-3 w-3 animate-spin" />
                      ) : (
                        cumplido && <Check className="h-3 w-3" />
                      )}
                    </span>

                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-sci-navy">
                        {prerrequisito.titulo}
                      </span>

                      {prerrequisito.descripcion && (
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                          {prerrequisito.descripcion}
                        </span>
                      )}

                      <span
                        className={`mt-2 block text-[11px] font-semibold ${
                          cumplido
                            ? 'text-emerald-700'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {cumplido
                          ? 'Cumplido'
                          : 'Pendiente'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={todosCumplidos || savingId !== null}
                onClick={() => void marcarTodos()}
                className="text-xs font-semibold"
              >
                Marcar todos como cumplidos
              </Button>

              <Button
                type="button"
                onClick={onClose}
                className="bg-sci-blue text-xs font-semibold text-white hover:opacity-90"
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}