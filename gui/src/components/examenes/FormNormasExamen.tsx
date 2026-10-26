import { Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Norma } from '@/services/normas.service'

interface Particular {
  titulo: string
  descripcion: string
}

interface Props {
  normasGenerales: Norma[]
  selectedNorms: string[]
  particulares: Particular[]
  tituloParticular: string
  descParticular: string
  fieldErrors: Record<string, string>
  onToggleNorm: (id: string) => void
  onTituloParticularChange: (val: string) => void
  onDescParticularChange: (val: string) => void
  onAddParticular: () => void
  onRemoveParticular: (index: number) => void
}

export function FormNormasExamen({
  normasGenerales,
  selectedNorms,
  particulares,
  tituloParticular,
  descParticular,
  fieldErrors,
  onToggleNorm,
  onTituloParticularChange,
  onDescParticularChange,
  onAddParticular,
  onRemoveParticular,
}: Props) {
  return (
    <fieldset className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
      <legend className="px-2 text-sm font-bold text-sci-navy">
        Normas aplicables (opcional)
      </legend>
      <p className="mb-3 text-xs text-muted-foreground">
        Puedes seleccionar normas generales del catálogo oficial o definir normas particulares específicas para esta evaluación.
      </p>

      {/* 1. NORMAS PARTICULARES AÑADIDAS (ARRIBA) */}
      {particulares.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-bold text-sci-navy">Normas particulares añadidas:</p>
          {particulares.map((norma, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 rounded-xl border border-sci-cyan/30 bg-sci-cyan/10 p-3 text-xs"
            >
              <div>
                <span className="font-bold text-sci-navy">{norma.titulo}</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="text-muted-foreground">{norma.descripcion}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveParticular(idx)}
                className="h-7 cursor-pointer text-xs font-semibold text-sci-red hover:bg-sci-red/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Quitar
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 2. CATÁLOGO DE NORMAS GENERALES */}
      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {normasGenerales.map((rule) => {
          const selected = selectedNorms.includes(rule.id)
          return (
            <button
              key={rule.id}
              type="button"
              onClick={() => onToggleNorm(rule.id)}
              className={`flex min-h-14 w-full items-start gap-3 rounded-xl border p-3.5 text-left transition cursor-pointer ${
                selected
                  ? 'border-sci-blue bg-sci-blue/5'
                  : 'border-border bg-card hover:border-sci-cyan'
              }`}
            >
              <span
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                  selected
                    ? 'border-sci-blue bg-sci-blue text-white'
                    : 'border-border bg-background'
                }`}
              >
                {selected && <Check className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <strong className="text-xs font-bold text-sci-navy">{rule.titulo}</strong>
                  <span className="rounded-full border border-sci-cyan/30 bg-sci-cyan/10 px-2 py-0.2 text-[10px] font-semibold text-sci-navy">
                    {rule.tipo}
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {rule.descripcion}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* 3. FORMULARIO PARA AGREGAR NUEVA NORMA PARTICULAR */}
      <div className="mt-5 space-y-3 border-t border-border pt-4">
        <h3 className="text-xs font-bold text-sci-navy">Agregar norma particular a este examen</h3>
        <Input
          type="text"
          maxLength={150}
          value={tituloParticular}
          onChange={(e) => onTituloParticularChange(e.target.value)}
          placeholder="Título de la norma particular (Ej. Traer calculadora científica)"
          className="h-10 text-xs border-border"
        />
        <textarea
          value={descParticular}
          onChange={(e) => onDescParticularChange(e.target.value)}
          placeholder="Descripción detallada de la regla particular..."
          rows={2}
          className="w-full rounded-xl border border-border bg-background p-3 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-sci-blue/20"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddParticular}
          className="cursor-pointer text-xs border-border"
        >
          + Incluir norma particular
        </Button>
        {fieldErrors.particular && (
          <p className="text-xs text-sci-red font-medium">{fieldErrors.particular}</p>
        )}
      </div>
    </fieldset>
  )
}