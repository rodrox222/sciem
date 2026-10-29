import type { ReactNode } from 'react'
import {
  BookOpen,
  CalendarDays,
  RefreshCw,
} from 'lucide-react'

interface MisExamenesProps {
  cargando: boolean
  error: string
  hayExamenes: boolean
  onReintentar: () => void
  children: ReactNode
}

export default function MisExamenes({
  cargando,
  error,
  hayExamenes,
  onReintentar,
  children,
}: MisExamenesProps) {
  return (
    <section className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <BookOpen size={22} />
        </div>

        <div>
          <h2 className="text-lg font-semibold">Mis exámenes</h2>

          <p className="text-sm text-muted-foreground">
            Exámenes asociados a tu inscripción.
          </p>
        </div>
      </div>

      {/* Estado de carga */}
      {cargando ? (
        <div className="rounded-xl border p-8 text-center text-muted-foreground">
          <RefreshCw
            size={22}
            className="mx-auto mb-3 animate-spin"
          />

          Cargando tus exámenes...
        </div>
      ) : error ? (
        /* Estado de error */
        <div className="rounded-xl border border-destructive/30 p-6 text-sm text-destructive">
          <p>{error}</p>

          <button
            type="button"
            onClick={onReintentar}
            className="mt-3 rounded-lg border px-3 py-2 text-foreground hover:bg-muted"
          >
            Reintentar
          </button>
        </div>
      ) : !hayExamenes ? (
        /* Lista vacía */
        <div className="rounded-xl border border-dashed p-8 text-center">
          <CalendarDays
            size={28}
            className="mx-auto mb-3 text-muted-foreground"
          />

          <h3 className="font-semibold">
            No tienes exámenes registrados
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            Cuando tengas exámenes asociados a tu inscripción,
            aparecerán aquí.
          </p>
        </div>
      ) : (
        /* Contenido de los exámenes */
        children
      )}
    </section>
  )
}