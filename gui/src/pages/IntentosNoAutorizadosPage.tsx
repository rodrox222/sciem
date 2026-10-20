import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import {
  intentosNoAutorizadosService,
  type IntentoNoAutorizado,
} from '@/services/intentosNoAutorizados.service'

const PER_PAGE = 15

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

const formatStudentName = (intento: IntentoNoAutorizado) => {
  const estudiante = intento.estudiante

  if (!estudiante) {
    return intento.identificador_presentado
      ? 'Estudiante sin datos asociados'
      : 'Estudiante no identificado'
  }

  const name = [
    estudiante.nombre,
    estudiante.apellido_paterno,
    estudiante.apellido_materno,
  ].filter(Boolean).join(' ')

  return name || 'Estudiante sin datos asociados'
}

export default function IntentosNoAutorizadosPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [intentos, setIntentos] = useState<IntentoNoAutorizado[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadIntentos = useCallback(async () => {
    if (!id) {
      setError('No se identificó el examen.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await intentosNoAutorizadosService.listByExamen(
        id,
        page,
        PER_PAGE,
      )

      setIntentos(response.data.data)
      setLastPage(Math.max(response.data.last_page, 1))
      setTotal(response.data.total)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron consultar los intentos no autorizados.',
      )
    } finally {
      setLoading(false)
    }
  }, [id, page])

  useEffect(() => {
    void loadIntentos()
  }, [loadIntentos])

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(id ? `/examenes/${id}?tab=info` : '/examenes')}
          className="h-auto cursor-pointer gap-1 p-0 text-xs font-semibold text-sci-blue"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al examen
        </Button>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
            Gestión de Evaluación
          </span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-sci-navy sm:text-3xl">
            Intentos no autorizados
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registro de estudiantes que intentaron ingresar sin estar inscritos o estando inhabilitados.
          </p>
        </div>
      </header>

      {error && (
        <Alert variant="destructive" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <div>
              <AlertTitle className="text-xs font-semibold">
                Error al consultar los registros
              </AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadIntentos()}
            className="cursor-pointer gap-1 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </Button>
        </Alert>
      )}

      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="grid min-h-64 place-items-center text-muted-foreground">
              <div className="text-center">
                <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-sci-cyan" />
                <p className="mt-3 text-xs">Cargando intentos registrados...</p>
              </div>
            </div>
          ) : intentos.length > 0 ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-border p-4">
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    Historial de intentos
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {total} registro{total === 1 ? '' : 's'} para este examen
                  </p>
                </div>
                <ShieldAlert className="h-5 w-5 text-sci-amber" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Estudiante</th>
                      <th className="px-4 py-3 font-semibold">Código SIS</th>
                      <th className="px-4 py-3 font-semibold">Identificador presentado</th>
                      <th className="px-4 py-3 font-semibold">Tipo de intento</th>
                      <th className="px-4 py-3 font-semibold">Fecha y hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {intentos.map((intento) => (
                      <tr key={intento.id} className="align-top hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {formatStudentName(intento)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {intento.estudiante?.codigo_sis || '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                         {intento.identificador_presentado || '—'}
                        </td>
                        


<td className="px-4 py-3">
  <span
    className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${
      intento.tipo_intento === 'INHABILITADO'
        ? 'border-sci-red/30 bg-sci-red/10 text-sci-red'
        : 'border-sci-amber/30 bg-sci-amber/10 text-sci-amber'
    }`}
  >
    {intento.tipo_intento === 'INHABILITADO'
      ? 'Inhabilitado'
      : 'No inscrito'}
  </span>
</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {formatDate(intento.fecha_hora)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-border p-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Página {page} de {lastPage} · {total} registros</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="cursor-pointer gap-1 text-xs"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= lastPage}
                    onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                    className="cursor-pointer gap-1 text-xs"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="grid min-h-64 place-items-center p-8 text-center">
              <div>
                <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
                <h2 className="mt-3 text-base font-bold text-foreground">
                  No hay intentos registrados
                </h2>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  Este examen todavía no tiene intentos no autorizados registrados.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
