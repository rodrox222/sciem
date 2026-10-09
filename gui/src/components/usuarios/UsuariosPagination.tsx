import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PaginatedResponse } from '@/types/api'
import type { Usuario } from '@/services/usuarios.service'

interface UsuariosPaginationProps {
  paginacion: PaginatedResponse<Usuario>
  paginaActual: number
  onPaginaChange: (pagina: number) => void
}

export function UsuariosPagination({
  paginacion,
  paginaActual,
  onPaginaChange,
}: UsuariosPaginationProps) {
  if (paginacion.last_page <= 1) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p>
        Mostrando{' '}
        <span className="font-semibold text-foreground">
          {paginacion.from}
        </span>{' '}
        -{' '}
        <span className="font-semibold text-foreground">
          {paginacion.to}
        </span>{' '}
        de{' '}
        <span className="font-semibold text-foreground">
          {paginacion.total}
        </span>{' '}
        usuarios
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onPaginaChange(Math.max(1, paginaActual - 1))
          }
          disabled={paginaActual <= 1}
          className="cursor-pointer gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        <span className="font-semibold text-foreground">
          Página {paginacion.current_page} de {paginacion.last_page}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onPaginaChange(
              Math.min(
                paginacion.last_page,
                paginaActual + 1,
              ),
            )
          }
          disabled={paginaActual >= paginacion.last_page}
          className="cursor-pointer gap-1"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}