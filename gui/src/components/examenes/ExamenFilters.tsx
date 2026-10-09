import type { FormEvent } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ExamenEstado } from '@/services/examenes.service'

interface ExamenFiltersProps {
  searchInput: string
  onSearchChange: (value: string) => void
  status: ExamenEstado | 'all'
  onStatusChange: (value: ExamenEstado | 'all') => void
  date: string
  onDateChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onReset: () => void
}

export function ExamenFilters({
  searchInput,
  onSearchChange,
  status,
  onStatusChange,
  date,
  onDateChange,
  onSubmit,
  onReset,
}: ExamenFiltersProps) {
  const fields = (
    <>
      <div className="relative md:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nombre del examen..."
          className="h-10 pl-9 bg-background"
        />
      </div>

      <div>
        <Select
          value={status}
          onValueChange={(val) => onStatusChange(val as ExamenEstado | 'all')}
        >
          <SelectTrigger className="h-10 bg-background text-sm">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="Programado">Programado</SelectItem>
            <SelectItem value="En proceso">En proceso</SelectItem>
            <SelectItem value="Terminado">Terminado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="h-10 bg-background"
        />
      </div>

      <Button
        type="submit"
        className="h-10 cursor-pointer gap-2 bg-sci-blue text-white hover:opacity-90"
      >
        <Search className="h-4 w-4" /> Buscar
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={onReset}
        className="h-10 cursor-pointer"
      >
        Limpiar
      </Button>
    </>
  )

  return (
    <>
      {/* Filtros Móvil */}
      <details className="rounded-2xl border border-border bg-card shadow-xs md:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 text-sm font-semibold text-sci-navy">
          Filtros de exámenes <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </summary>
        <form onSubmit={onSubmit} className="grid gap-3 border-t border-border p-4">
          {fields}
        </form>
      </details>

      {/* Filtros Desktop */}
      <form
        onSubmit={onSubmit}
        className="hidden grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-5 shadow-xs md:grid lg:grid-cols-6"
      >
        {fields}
      </form>
    </>
  )
}