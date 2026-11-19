import { BookOpen, MoreVertical } from 'lucide-react'
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
  onGestionarMaterias?: (usuario: Usuario) => void
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
  onGestionarMaterias,
  cambiandoEstado,
}: UsuarioCardProps) {
  const nombreCompleto = obtenerNombreCompleto(usuario)

  const estaActivo =
    usuario.activo === true ||
    (usuario.activo as unknown) === 1 ||
    (usuario.activo as unknown) === '1'

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition hover:shadow-md">
      {/* Indicador de estado */}
      <div
        className={`h-1.5 ${
          estaActivo ? 'bg-sci-blue' : 'bg-sci-red'
        }`}
      />

      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        {/* Información del usuario */}
        <div className="flex min-w-0 w-full items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sci-navy/10 text-base font-bold text-sci-navy mt-0.5">
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

            {/* Listado de materias asignadas para docentes */}
            {usuario.tipo_usuario === 'docente' && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-sci-navy/70 mr-0.5">
                  Materias asignadas:
                </span>
                {usuario.materias && usuario.materias.length > 0 ? (
                  usuario.materias.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center rounded-md bg-sci-cyan/10 px-2 py-0.5 text-[11px] font-medium text-sci-navy border border-sci-cyan/25"
                    >
                      {m.codigo ? `[${m.codigo}] ` : ''}{m.nombre}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] italic text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Sin materias asignadas
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rol, estado y acciones */}
        <div className="flex w-full flex-row flex-wrap items-center justify-between gap-2 md:w-auto md:justify-end md:flex-nowrap shrink-0">
          <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold">
            {nombreRol}
          </Badge>

          <Badge
            className={
              estaActivo
                ? 'border border-sci-cyan/30 bg-sci-cyan/10 text-sci-navy hover:bg-sci-cyan/10'
                : 'border border-sci-red/30 bg-sci-red/10 text-sci-red hover:bg-sci-red/10'
            }
          >
            {estaActivo ? 'Activo' : 'Inactivo'}
          </Badge>

          {/* Acciones para escritorio */}
          <div className="hidden items-center gap-2 md:flex">
            {usuario.tipo_usuario === 'docente' && onGestionarMaterias && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onGestionarMaterias(usuario)}
                className="cursor-pointer border-sci-blue/30 text-sci-blue hover:bg-sci-blue/10 flex items-center gap-1 font-semibold"
                title="Asignar o desvincular materias del docente"
              >
                <BookOpen className="h-3.5 w-3.5 text-sci-blue" />
                Materias
              </Button>
            )}

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
                estaActivo
                  ? 'text-sci-red hover:bg-sci-red/10'
                  : 'text-sci-blue hover:bg-sci-blue/10'
              }`}
            >
              {estaActivo ? 'Desactivar' : 'Activar'}
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

              <DropdownMenuContent align="end" className="w-44">
                {usuario.tipo_usuario === 'docente' && onGestionarMaterias && (
                  <DropdownMenuItem onClick={() => onGestionarMaterias(usuario)}>
                    <BookOpen className="mr-2 h-4 w-4 text-sci-blue" />
                    Gestionar Materias
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={() => onEditar(usuario)}>
                  Editar
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onCambiarEstado(usuario)}
                  className={
                    estaActivo
                      ? 'text-sci-red focus:text-sci-red'
                      : 'text-sci-blue focus:text-sci-blue'
                  }
                >
                  {estaActivo ? 'Desactivar' : 'Activar'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}
