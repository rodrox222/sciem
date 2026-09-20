import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, RotateCcw, Search, ShieldAlert } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { api } from '@/services/api'
import type { PaginatedResponse } from '@/types/api'

interface LogAuditoria {
  id: number
  user_type: string | null
  user_id: string | null
  accion: string
  ip_origen: string
  detalles: Record<string, unknown> | null
  created_at: string
  rol_en_el_momento: string | null
  usuario_nombre: string | null
  usuario_email: string | null
  modulo: string | null
  user_agent: string | null
}

interface AuditoriaPaginatedResponse extends PaginatedResponse<LogAuditoria> {
  next_page_url?: string | null
  prev_page_url?: string | null
}

const initialFilters = {
  usuario_id: '',
  rol: '',
  accion: '',
  modulo: '',
  fecha_desde: '',
  fecha_hasta: '',
  search: '',
}

export const AuditoriaPage: React.FC = () => {
  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<AuditoriaPaginatedResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildQuery = (pageNumber: number, perPage?: number) => {
    const params = new URLSearchParams()
    params.set('page', String(pageNumber))
    if (perPage) params.set('per_page', String(perPage))

    Object.entries(filters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim())
    })
    return params.toString() ? `?${params.toString()}` : ''
  }

  const fetchAuditoria = useCallback(async (targetPage = page) => {
    setLoading(true)
    setError(null)

    try {
      const query = buildQuery(targetPage)
      const data = await api.get<AuditoriaPaginatedResponse>(`/auditoria${query}`)
      setResult(data)
      setPage(targetPage)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al consultar los registros de auditoría.')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page])

  useEffect(() => {
    const requestId = window.setTimeout(() => void fetchAuditoria(1), 0)
    return () => window.clearTimeout(requestId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilterChange = (key: keyof typeof initialFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleBuscar = () => {
    setPage(1)
    fetchAuditoria(1)
  }

  const handleExportarCSV = async () => {
    try {
      setLoading(true)
      setError(null)

      const query = buildQuery(1, 10000)
      const data = await api.get<AuditoriaPaginatedResponse>(`/auditoria${query}`)

      if (!data?.data?.length) {
        setError('No hay registros para exportar con los filtros actuales.')
        return
      }

      const encabezados = [
        'Fecha/Hora',
        'Usuario',
        'Usuario ID',
        'Rol',
        'Acción',
        'Módulo',
        'IP',
        'Detalles',
      ]

      const filas: Array<Array<string | number>> = data.data.map((log: LogAuditoria) => [
        fmtFecha(log.created_at),
        log.usuario_nombre || '—',
        log.user_id || '—',
        log.rol_en_el_momento || '—',
        log.accion || '—',
        log.modulo || '—',
        log.ip_origen || '—',
        log.detalles ? JSON.stringify(log.detalles) : '—',
      ])

      const contenido = [encabezados, ...filas]
        .map((fila) =>
          fila
            .map((valor: string | number) => `"${String(valor).replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\n')

      const blob = new Blob(['\uFEFF' + contenido], {
        type: 'text/csv;charset=utf-8;',
      })

      const url = URL.createObjectURL(blob)
      const enlace = document.createElement('a')
      const fechaArchivo = new Date().toISOString().slice(0, 10)

      enlace.href = url
      enlace.download = `auditoria-${fechaArchivo}.csv`
      document.body.appendChild(enlace)
      enlace.click()
      document.body.removeChild(enlace)
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      console.error('Error al exportar auditoría:', err)
      setError(err instanceof Error ? err.message : 'No se pudo exportar el historial de auditoría.')
    } finally {
      setLoading(false)
    }
  }

  const handleLimpiar = () => {
    setFilters(initialFilters)
    setPage(1)
    api.get<AuditoriaPaginatedResponse>('/auditoria?page=1').then(setResult).catch(() => {})
  }

  const fmtFecha = (iso: string) =>
    new Date(iso).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'medium' })

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
          Trazabilidad y Seguridad
        </span>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-sci-navy tracking-tight">
          Auditoría del sistema
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Historial cronológico e inalterable de las operaciones realizadas en la plataforma SCI.
        </p>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <div className="space-y-1.5 text-left">
            <Label htmlFor="f-usuario" className="text-xs font-semibold text-foreground">Usuario ID</Label>
            <Input id="f-usuario" value={filters.usuario_id} onChange={(e) => handleFilterChange('usuario_id', e.target.value)} placeholder="UUID" className="h-10 text-xs bg-background" />
          </div>
          <div className="space-y-1.5 text-left">
            <Label htmlFor="f-rol" className="text-xs font-semibold text-foreground">Rol</Label>
            <Input id="f-rol" value={filters.rol} onChange={(e) => handleFilterChange('rol', e.target.value)} placeholder="ej. admin" className="h-10 text-xs bg-background" />
          </div>
          <div className="space-y-1.5 text-left">
            <Label htmlFor="f-accion" className="text-xs font-semibold text-foreground">Acción</Label>
            <Input id="f-accion" value={filters.accion} onChange={(e) => handleFilterChange('accion', e.target.value)} placeholder="ej. LOGIN_EXITOSO" className="h-10 text-xs bg-background" />
          </div>
          <div className="space-y-1.5 text-left">
            <Label htmlFor="f-modulo" className="text-xs font-semibold text-foreground">Módulo</Label>
            <Input id="f-modulo" value={filters.modulo} onChange={(e) => handleFilterChange('modulo', e.target.value)} placeholder="ej. Exámenes" className="h-10 text-xs bg-background" />
          </div>
          <div className="space-y-1.5 text-left">
            <Label htmlFor="f-desde" className="text-xs font-semibold text-foreground">Desde</Label>
            <Input id="f-desde" type="date" value={filters.fecha_desde} onChange={(e) => handleFilterChange('fecha_desde', e.target.value)} className="h-10 text-xs bg-background" />
          </div>
          <div className="space-y-1.5 text-left">
            <Label htmlFor="f-hasta" className="text-xs font-semibold text-foreground">Hasta</Label>
            <Input id="f-hasta" type="date" value={filters.fecha_hasta} onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)} className="h-10 text-xs bg-background" />
          </div>
          <div className="space-y-1.5 text-left sm:col-span-2 lg:col-span-4 xl:col-span-1">
            <Label htmlFor="f-search" className="text-xs font-semibold text-foreground">Buscar</Label>
            <Input id="f-search" value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} placeholder="nombre, email o IP" className="h-10 text-xs bg-background" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-border">
          <Button onClick={handleBuscar} disabled={loading} className="bg-sci-blue hover:opacity-90 text-white h-10 px-5 text-xs font-semibold cursor-pointer gap-1.5">
            <Search className="h-4 w-4" />
            Buscar
          </Button>

          <Button onClick={handleLimpiar} disabled={loading} variant="outline" className="h-10 px-4 text-xs font-semibold cursor-pointer gap-1.5">
            <RotateCcw className="h-4 w-4" />
            Limpiar filtros
          </Button>

          <Button
            onClick={handleExportarCSV}
            disabled={loading}
            variant="outline"
            className="h-10 px-4 text-xs font-semibold text-sci-blue border-sci-blue/30 hover:bg-sci-blue/10 cursor-pointer gap-1.5 ml-auto"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="bg-sci-red/10 border-sci-red/20 text-sci-red">
          <ShieldAlert className="h-4 w-4 text-sci-red" />
          <AlertDescription className="ml-2 text-xs font-semibold">{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabla de Logs */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-border text-xs text-muted-foreground">
          {loading ? 'Cargando registros…' : result ? `Mostrando ${result.from ?? 0}–${result.to ?? 0} de ${result.total} eventos registrados` : '—'}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b border-border">
                <th className="px-4 py-3">Fecha / hora</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Módulo</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3 text-right">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result?.data.length ? (
                result.data.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtFecha(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-sci-navy">{log.usuario_nombre ?? '—'}</div>
                      {log.usuario_email && <div className="text-[11px] text-muted-foreground">{log.usuario_email}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{log.rol_en_el_momento ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2.5 py-0.5 rounded-full border border-sci-cyan/30 bg-sci-cyan/10 text-sci-navy font-semibold text-[11px]">
                        {log.accion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{log.modulo ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono">{log.ip_origen}</td>
                    <td className="px-4 py-3 text-right">
                      <details className="inline-block text-left">
                        <summary className="text-sci-blue hover:underline cursor-pointer font-semibold">Ver</summary>
                        <pre className="mt-1 text-[11px] bg-muted p-2 rounded-xl max-w-xs whitespace-pre-wrap break-words border border-border">
                          {log.detalles ? JSON.stringify(log.detalles, null, 2) : '—'}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))
              ) : (
                !loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No hay eventos de auditoría que coincidan con estos filtros.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {result && result.last_page > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => fetchAuditoria(page - 1)}
              className="cursor-pointer"
            >
              ← Anterior
            </Button>
            <span>Página {result.current_page} de {result.last_page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= result.last_page || loading}
              onClick={() => fetchAuditoria(page + 1)}
              className="cursor-pointer"
            >
              Siguiente →
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuditoriaPage