import { useEffect, useState, type FormEvent } from 'react'
import { BookOpen, Check, LoaderCircle, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Materia, MateriaPayload } from '@/services/materias.service'

interface MateriaFormModalProps {
  open: boolean
  materia: Materia | null
  guardando: boolean
  resultado: string
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: MateriaPayload) => Promise<void>
}

export function MateriaFormModal({
  open,
  materia,
  guardando,
  resultado,
  onOpenChange,
  onSubmit,
}: MateriaFormModalProps) {
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [errorNombre, setErrorNombre] = useState('')
  const [errorGeneral, setErrorGeneral] = useState('')

  const editando = Boolean(materia)

  useEffect(() => {
    if (!open) return

    if (materia) {
      setNombre(materia.nombre || '')
      setCodigo(materia.codigo || '')
    } else {
      setNombre('')
      setCodigo('')
    }
    setErrorNombre('')
    setErrorGeneral('')
  }, [open, materia])

  const manejarSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorNombre('')
    setErrorGeneral('')

    if (!nombre.trim()) {
      setErrorNombre('El nombre de la materia es obligatorio.')
      return
    }

    try {
      await onSubmit({
        nombre: nombre.trim(),
        codigo: codigo.trim() || null,
      })
    } catch (err) {
      setErrorGeneral(
        err instanceof Error ? err.message : 'No se pudo guardar la materia.',
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={(abierto) => !guardando && onOpenChange(abierto)}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border bg-card text-card-foreground shadow-2xl rounded-2xl">
        {resultado ? (
          <div className="p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Check className="h-7 w-7" />
            </div>
            <DialogHeader className="mt-4">
              <DialogTitle className="text-center text-sci-navy">
                Operación completada
              </DialogTitle>
              <DialogDescription className="text-center">
                {resultado}
              </DialogDescription>
            </DialogHeader>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-6 w-full cursor-pointer bg-sci-blue font-semibold text-white hover:opacity-90"
            >
              Aceptar
            </Button>
          </div>
        ) : (
          <form onSubmit={manejarSubmit}>
            <DialogHeader className="border-b border-border px-6 py-5 text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sci-cyan">
                Gestión Curricular
              </span>
              <DialogTitle className="mt-1 text-xl font-bold text-sci-navy">
                {editando ? 'Editar asignatura' : 'Nueva asignatura'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {editando
                  ? 'Modifica los datos oficiales de la asignatura.'
                  : 'Registra una materia para que esté disponible en las evaluaciones.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 py-6">
              {errorGeneral && (
                <div className="rounded-xl border border-sci-red/20 bg-sci-red/10 px-4 py-3 text-xs font-semibold text-sci-red">
                  {errorGeneral}
                </div>
              )}

              <div className="space-y-1.5 text-left">
                <Label htmlFor="mat-nombre" className="text-xs font-semibold">
                  Nombre de la asignatura *
                </Label>
                <Input
                  id="mat-nombre"
                  autoFocus
                  maxLength={150}
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value)
                    if (errorNombre) setErrorNombre('')
                  }}
                  placeholder="Ej. Álgebra II"
                  className={errorNombre ? 'border-sci-red' : ''}
                />
                {errorNombre && (
                  <p className="text-xs font-medium text-sci-red">{errorNombre}</p>
                )}
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="mat-codigo" className="text-xs font-semibold">
                  Código de materia (opcional)
                </Label>
                <Input
                  id="mat-codigo"
                  maxLength={30}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ej. MAT-102"
                />
              </div>

              <div className="flex gap-3 rounded-xl border border-sci-cyan/20 bg-sci-cyan/10 p-3 text-xs text-muted-foreground">
                <BookOpen className="h-4 w-4 shrink-0 text-sci-cyan mt-0.5" />
                <p>
                  Esta asignatura podrá vincularse inmediatamente a los exámenes programados por docentes y administradores.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/40 px-6 py-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={guardando}
                className="cursor-pointer"
              >
                <X className="mr-2 h-4 w-4" /> Cancelar
              </Button>
              <Button
                type="submit"
                disabled={guardando}
                className="bg-sci-blue hover:opacity-90 text-white font-semibold cursor-pointer min-w-32"
              >
                {guardando && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                {guardando
                  ? 'Guardando...'
                  : editando
                    ? 'Guardar cambios'
                    : 'Crear asignatura'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}