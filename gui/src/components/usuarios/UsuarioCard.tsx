import { MoreVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Usuario } from '@/services/usuarios.service'

interface UsuarioCardProps {
  usuario: Usuario
  nombreRol: string
  onEditar: (usuario: Usuario) => void
  onCambiarEstado: (usuario: Usuario) => void
  cambiandoEstado: boolean
}

const obtenerNombreCompleto = (usuario: Usuario) => {
  return [usuario.nombre, usuario.apellido_paterno, usuario.apellido_materno]
    .filter(Boolean)
    .join(' ')
}

export function UsuarioCard({
  usuario,
  nombreRol,
  onEditar,
  onCambiarEstado,
  cambiandoEstado,
}: UsuarioCardProps) {
  const nombreCompleto = obtenerNombreCompleto(usuario)

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition hover:shadow-md">
      {/* Indicador de estado */}
      <div
        className={`h-1.5 ${
          usuario.activo ? 'bg-sci-blue' : 'bg-sci-red'
        }`}
      />

      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        {/* Información del usuario */}
        <div className="flex min-w-0 w-full items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sci-navy/10 text-base font-bold text-sci-navy">
            {usuario.nombre.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-sci-navy">
              {nombreCompleto}
            </h2>

            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              CI: {usuario.ci}
              {usuario.ci_extension ? `-${usuario.ci_extension}` : ''}
              {usuario.email ? ` · ${usuario.email}` : ''}
            </p>
          </div>
        </div>

        {/* Rol, estado y acciones */}
        <div className="flex w-full flex-row flex-wrap items-center justify-between gap-2 md:w-auto md:justify-end md:flex-nowrap">
          <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold">
            {nombreRol}
          </Badge>

          <Badge
            className={
              usuario.activo
                ? 'border border-sci-cyan/30 bg-sci-cyan/10 text-sci-navy hover:bg-sci-cyan/10'
                : 'border border-sci-red/30 bg-sci-red/10 text-sci-red hover:bg-sci-red/10'
            }
          >
            {usuario.activo ? 'Activo' : 'Inactivo'}
          </Badge>

          {/* Acciones para escritorio */}
          <div className="hidden items-center gap-2 md:flex">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEditar(usuario)}
              className="cursor-pointer"
            >
              Editar
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onCambiarEstado(usuario)}
              disabled={cambiandoEstado}
              className={`cursor-pointer ${
                usuario.activo
                  ? 'text-sci-red hover:bg-sci-red/10'
                  : 'text-sci-blue hover:bg-sci-blue/10'
              }`}
            >
              {usuario.activo ? 'Desactivar' : 'Activar'}
            </Button>
          </div>

          {/* Acciones para móvil */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Acciones para ${nombreCompleto}`}
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onEditar(usuario)}>
                  Editar
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onCambiarEstado(usuario)}
                  className={
                    usuario.activo
                      ? 'text-sci-red focus:text-sci-red'
                      : 'text-sci-blue focus:text-sci-blue'
                  }
                >
                  {usuario.activo ? 'Desactivar' : 'Activar'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}