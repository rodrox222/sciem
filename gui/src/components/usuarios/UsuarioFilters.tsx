import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Rol } from '@/services/usuarios.service'

interface UsuarioFiltersProps {
  busqueda: string
  rol: string
  estado: string
  roles: Rol[]
  cargandoRoles: boolean
  errorRoles: string
  onBusquedaChange: (valor: string) => void
  onRolChange: (valor: string) => void
  onEstadoChange: (valor: string) => void
}

export function UsuarioFilters({
  busqueda,
  rol,
  estado,
  roles,
  cargandoRoles,
  errorRoles,
  onBusquedaChange,
  onRolChange,
  onEstadoChange,
}: UsuarioFiltersProps) {
  // Estado local para input fluido sin retraso visual
  const [textoBusqueda, setTextoBusqueda] = useState(busqueda)

  // Sincronizar si el valor externo se resetea
  useEffect(() => {
    setTextoBusqueda(busqueda)
  }, [busqueda])

  // Debounce de 350ms antes de disparar la consulta a la API
  useEffect(() => {
    const handler = setTimeout(() => {
      if (textoBusqueda !== busqueda) {
        onBusquedaChange(textoBusqueda)
      }
    }, 350)

    return () => {
      clearTimeout(handler)
    }
  }, [textoBusqueda, busqueda, onBusquedaChange])

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Buscar con debounce */}
        <div>
          <Label className="mb-1.5 block text-xs font-semibold text-foreground">
            Buscar
          </Label>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              type="text"
              value={textoBusqueda}
              onChange={(e) => setTextoBusqueda(e.target.value)}
              placeholder="Nombre, apellido o CI..."
              className="h-10 bg-background pl-9"
            />
          </div>
        </div>

        {/* Rol */}
        <div>
          <Label className="mb-1.5 block text-xs font-semibold text-foreground">
            Rol
          </Label>

          <Select
            value={rol}
            onValueChange={onRolChange}
            disabled={cargandoRoles}
          >
            <SelectTrigger className="h-10 w-full bg-background">
              <SelectValue
                placeholder={
                  cargandoRoles ? 'Cargando roles...' : 'Todos los roles'
                }
              />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="todos">Todos los roles</SelectItem>

              {roles.map((item) => (
                <SelectItem key={item.codigo} value={item.codigo}>
                  {item.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {errorRoles && (
            <p className="mt-1 text-xs text-sci-red">
              {errorRoles}
            </p>
          )}
        </div>

        {/* Estado */}
        <div>
          <Label className="mb-1.5 block text-xs font-semibold text-foreground">
            Estado
          </Label>

          <Select value={estado} onValueChange={onEstadoChange}>
            <SelectTrigger className="h-10 w-full bg-background">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="true">Activo</SelectItem>
              <SelectItem value="false">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}