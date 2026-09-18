import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, RotateCcw, Search, ShieldAlert } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '../layouts/MainLayout'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8200/api'

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

interface PaginatedResponse {
  data: LogAuditoria[]
  current_page: number
  last_page: number
  total: number
  from: number | null
  to: number | null
  next_page_url: string | null
  prev_page_url: string | null
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
  const navigate = useNavigate()
  const [filters, setFilters] = useState(initialFilters)
  const [result, setResult] = useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAuditoria = useCallback(async (url?: string) => {
    setLoading(true)
    setError(null)

    const token = localStorage.getItem('auth_token')
    if (!token) {
      navigate('/login')
      return
    }

    let target = url
    if (!target) {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value)
      })
      target = `${API_BASE_URL}/auditoria${params.toString() ? `?${params.toString()}` : ''}`
    }

    try {
      const res = await fetch(target, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (res.status === 401) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_role')
        localStorage.removeItem('user_data')
        navigate('/login')
        return
      }

      if (!res.ok) {
        throw new Error(
          data?.message
            ? `${data.message}${data.rol_actual ? ` (rol actual: ${data.rol_actual})` : ''}`
            : 'No se pudo cargar el historial de auditoría.'
        )
      }

      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión con el servidor.')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  useEffect(() => {
    const requestId = window.setTimeout(() => void fetchAuditoria(), 0)
    return () => window.clearTimeout(requestId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilterChange = (key: keyof typeof initialFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleBuscar = () => fetchAuditoria()

  const handleExportarCSV = async () => {
    try {
      const token = localStorage.getItem('auth_token')

      if (!token) {
        navigate('/login')
        return
      }

      setLoading(true)
      setError(null)

      const params = new URLSearchParams()

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value)
      })

      // Pedimos todos los registros que coincidan con los filtros.
      params.set('per_page', '10000')

      const res = await fetch(
        `${API_BASE_URL}/auditoria?${params.toString()}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await res.json()

      if (res.status === 401) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_role')
        localStorage.removeItem('user_data')
        navigate('/login')
        return
      }

      if (!res.ok) {
        throw new Error(
          data?.message || 'No se pudieron obtener los registros para exportar.'
        )
      }

      if (!data?.data?.length) {
        alert('No hay registros para exportar con los filtros actuales.')
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

      alert(`Exportación completada: ${data.data.length} registros.`)
    } catch (err: unknown) {
      console.error('Error al exportar auditoría:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo exportar el historial de auditoría.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleLimpiar = () => {
    setFilters(initialFilters)
    fetchAuditoria(`${API_BASE_URL}/auditoria`)
  }

  const fmtFecha = (iso: string) =>
    new Date(iso).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'medium' })

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-[#003770]">Auditoría del sistema</h2>
          <p className="text-sm text-slate-500 mt-1">
            Historial cronológico e inalterable de las operaciones realizadas en la plataforma.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
            <div className="space-y-1">
              <Label htmlFor="f-usuario" className="text-xs text-slate-600">Usuario ID</Label>
              <Input id="f-usuario" value={filters.usuario_id} onChange={(e) => handleFilterChange('usuario_id', e.target.value)} placeholder="UUID" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="f-rol" className="text-xs text-slate-600">Rol</Label>
              <Input id="f-rol" value={filters.rol} onChange={(e) => handleFilterChange('rol', e.target.value)} placeholder="ej. admin" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="f-accion" className="text-xs text-slate-600">Acción</Label>
              <Input id="f-accion" value={filters.accion} onChange={(e) => handleFilterChange('accion', e.target.value)} placeholder="ej. LOGIN_EXITOSO" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="f-modulo" className="text-xs text-slate-600">Módulo</Label>
              <Input id="f-modulo" value={filters.modulo} onChange={(e) => handleFilterChange('modulo', e.target.value)} placeholder="ej. Autenticacion" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="f-desde" className="text-xs text-slate-600">Desde</Label>
              <Input id="f-desde" type="date" value={filters.fecha_desde} onChange={(e) => handleFilterChange('fecha_desde', e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="f-hasta" className="text-xs text-slate-600">Hasta</Label>
              <Input id="f-hasta" type="date" value={filters.fecha_hasta} onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="f-search" className="text-xs text-slate-600">Buscar</Label>
              <Input id="f-search" value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} placeholder="nombre, email o IP" className="h-9 text-sm" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={handleBuscar} disabled={loading} className="bg-[#003770] hover:bg-[#002852] text-white h-9 px-5 text-sm">
              <Search className="h-4 w-4 mr-1.5" />
              Buscar
            </Button>

            <Button onClick={handleLimpiar} disabled={loading} variant="outline" className="h-9 px-4 text-sm border-slate-300">
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Limpiar filtros
            </Button>

            <Button
              onClick={handleExportarCSV}
              disabled={loading}
              variant="outline"
              className="h-9 px-4 text-sm border-[#0056B3] text-[#0056B3] hover:bg-blue-50"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {error && (
          <Alert className="bg-red-50 border-[#E30613]/30 text-[#E30613]">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription className="ml-2 text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 text-xs text-slate-500">
            {loading ? 'Cargando…' : result ? `Mostrando ${result.from ?? 0}–${result.to ?? 0} de ${result.total} registros` : '—'}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <th className="text-left font-semibold px-4 py-2.5">Fecha / hora</th>
                  <th className="text-left font-semibold px-4 py-2.5">Usuario</th>
                  <th className="text-left font-semibold px-4 py-2.5">Rol</th>
                  <th className="text-left font-semibold px-4 py-2.5">Acción</th>
                  <th className="text-left font-semibold px-4 py-2.5">Módulo</th>
                  <th className="text-left font-semibold px-4 py-2.5">IP</th>
                  <th className="text-left font-semibold px-4 py-2.5">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {result?.data.length ? (
                  result.data.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">{fmtFecha(log.created_at)}</td>
                      <td className="px-4 py-2.5">
                        <div className="text-slate-800">{log.usuario_nombre ?? '—'}</div>
                        {log.usuario_email && <div className="text-xs text-slate-400">{log.usuario_email}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{log.rol_en_el_momento ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-[#003770] text-xs font-semibold">{log.accion}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{log.modulo ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500">{log.ip_origen}</td>
                      <td className="px-4 py-2.5">
                        <details>
                          <summary className="text-[#003770] cursor-pointer text-xs">ver</summary>
                          <pre className="mt-1 text-[11px] bg-slate-50 p-2 rounded max-w-xs whitespace-pre-wrap break-words">
                            {log.detalles ? JSON.stringify(log.detalles, null, 2) : '—'}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))
                ) : (
                  !loading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                        No hay eventos de auditoría que coincidan con estos filtros.
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {result && result.last_page > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm">
              <Button variant="outline" disabled={!result.prev_page_url || loading} onClick={() => result.prev_page_url && fetchAuditoria(result.prev_page_url)} className="h-8 text-xs px-3">
                ← Anterior
              </Button>
              <span className="text-xs text-slate-500">Página {result.current_page} de {result.last_page}</span>
              <Button variant="outline" disabled={!result.next_page_url || loading} onClick={() => result.next_page_url && fetchAuditoria(result.next_page_url)} className="h-8 text-xs px-3">
                Siguiente →
              </Button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}

export default AuditoriaPage
