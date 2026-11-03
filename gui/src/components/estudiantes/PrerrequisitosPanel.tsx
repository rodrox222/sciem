import { useState, type FormEvent } from 'react'
import { Plus, LoaderCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
} from '@/services/prerrequisitos.service'

interface PrerrequisitosPanelProps {
  examId: string
  canManage: boolean
  isOffline: boolean
  prerrequisitos: Prerrequisito[]
  onPrerrequisitoCreated: () => Promise<void>
  onError: (msg: string) => void
  onSuccess: (msg: string) => void
}

export function PrerrequisitosPanel({
  examId,
  canManage,
  isOffline,
  prerrequisitos,
  onPrerrequisitoCreated,
  onError,
  onSuccess,
}: PrerrequisitosPanelProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [saving, setSaving] = useState(false)

  if (prerrequisitos.length === 0 && !canManage) {
    return null
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()

    if (isOffline) {
      onError('No se pueden crear prerrequisitos en modo offline.')
      return
    }

    if (!titulo.trim()) {
      onError('El título del prerrequisito es obligatorio.')
      return
    }

    try {
      setSaving(true)
      const response = await prerrequisitosService.create(examId, {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
      })

      onSuccess(response.message || 'Prerrequisito creado correctamente.')
      setModalOpen(false)
      setTitulo('')
      setDescripcion('')
      await onPrerrequisitoCreated()
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear el prerrequisito.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card className="mb-4 border-sci-cyan/20 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-sci-navy">
                Prerrequisitos del examen
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Condiciones que deben cumplirse para que un estudiante esté habilitado.
              </p>
            </div>

            {canManage && (
              <Button
                type="button"
                disabled={isOffline}
                className="gap-2 bg-sci-blue text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                onClick={() => {
                  setTitulo('')
                  setDescripcion('')
                  setModalOpen(true)
                }}
              >
                <Plus className="h-4 w-4" />
                Agregar prerrequisito
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {prerrequisitos.map((prerrequisito) => (
              <div
                key={prerrequisito.id}
                className="rounded-lg border border-border bg-muted/20 p-3"
              >
                <p className="text-sm font-semibold text-sci-navy">
                  {prerrequisito.titulo}
                </p>
                {prerrequisito.descripcion && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {prerrequisito.descripcion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {modalOpen && canManage && (
        <Dialog
          open={modalOpen}
          onOpenChange={(open) => {
            if (!saving) {
              setModalOpen(open)
              if (!open) {
                setTitulo('')
                setDescripcion('')
              }
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo prerrequisito</DialogTitle>
              <DialogDescription>
                Define una condición que deben cumplir los estudiantes.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="prerrequisito-titulo">Título *</Label>
                <Input
                  id="prerrequisito-titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. Aprobar la materia anterior"
                  maxLength={150}
                  required
                  disabled={saving}
                />
              </div>

              <div className="space-y-2 text-left">
                <Label htmlFor="prerrequisito-descripcion">Descripción</Label>
                <Textarea
                  id="prerrequisito-descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Describe qué debe cumplir el estudiante."
                  maxLength={500}
                  rows={4}
                  disabled={saving}
                />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="gap-2 bg-sci-blue text-white hover:opacity-90"
                >
                  {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {saving ? 'Guardando...' : 'Guardar prerrequisito'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}