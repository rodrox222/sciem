import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  LoaderCircle,
  BookOpen,
  Users,
  PencilLine,
  QrCode,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import {
  examenesService,
  type Examen,
  type ExamenEstado,
} from '@/services/examenes.service'

import { DetalleInfoTab } from '@/components/examenes/DetalleInfoTab'
import { DetalleEstudiantesTab } from '@/components/examenes/DetalleEstudiantesTab'
import { DetalleEditarTab } from '@/components/examenes/DetalleEditarTab'
import { DetalleEscanerTab } from '@/components/examenes/DetalleEscanerTab'

const estadoBadges: Record<ExamenEstado, string> = {
  Programado: 'border-sci-cyan/30 bg-sci-cyan/10 text-sci-navy',
  'En proceso': 'border-sci-amber/30 bg-sci-amber/10 text-sci-amber',
  Terminado: 'border-muted-foreground/30 bg-muted text-muted-foreground',
}

export default function DetalleExamenPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'info'

  const role = (localStorage.getItem('user_role') ?? '').toLowerCase()
  const canManage = ['admin', 'administrador', 'docente', 'auxiliar'].includes(role)

  const [exam, setExam] = useState<Examen | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadExam = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const data = await examenesService.get(id)
      setExam(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo obtener el examen.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!id) return

    let cancelled = false

    examenesService
      .get(id)
      .then((data) => {
        if (cancelled) return
        setExam(data)
        setError('')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'No se pudo obtener el examen.')
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-sci-cyan" />
          <p className="mt-3 text-xs text-muted-foreground">Cargando evaluación...</p>
        </div>
      </div>
    )
  }

  if (error || !exam) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/examenes')}
          className="gap-1 text-sci-blue"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a exámenes
        </Button>
        <div className="rounded-2xl border border-sci-red/20 bg-sci-red/10 p-6 text-center text-xs font-semibold text-sci-red">
          {error || 'Examen no encontrado.'}
        </div>
      </div>
    )
  }

  const canEdit = canManage && exam.estado === 'Programado'

  return (
    <div className="space-y-6">
      {/* Encabezado contextual */}
      <header className="space-y-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate('/examenes')}
          className="h-auto cursor-pointer gap-1 p-0 text-xs font-semibold text-sci-blue hover:text-sci-navy"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a exámenes
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sci-cyan">
                Gestión de Evaluación
              </span>
              <Badge
                variant="outline"
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${estadoBadges[exam.estado]}`}
              >
                {exam.estado}
              </Badge>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-sci-navy sm:text-3xl">
              {exam.nombre}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {exam.materia?.nombre ?? 'Asignatura'} · {exam.aula?.nombre ?? 'Aula asignada'}
            </p>
          </div>
        </div>
      </header>

      {/* Navegación por pestañas */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setSearchParams({ tab: val })}
        className="space-y-6"
      >

<TabsList className="flex h-auto w-full flex-wrap items-stretch justify-start gap-1 rounded-xl border border-border bg-card p-1 sm:flex-nowrap sm:items-center">

          
<TabsTrigger
  value="info"
  className="min-w-0 flex-1 cursor-pointer justify-center gap-1.5 whitespace-normal px-2 py-2 text-center text-[11px] font-medium sm:flex-none sm:gap-2 sm:whitespace-nowrap sm:px-3 sm:text-xs"
>
  <BookOpen className="h-3.5 w-3.5" /> Ficha Técnica
</TabsTrigger>

          <TabsTrigger
  value="estudiantes"
  className="min-w-0 flex-1 cursor-pointer justify-center gap-1.5 whitespace-normal px-2 py-2 text-center text-[11px] font-medium sm:flex-none sm:gap-2 sm:whitespace-nowrap sm:px-3 sm:text-xs"
>
  <Users className="h-3.5 w-3.5" />
  Padrón de Estudiantes
</TabsTrigger>

          {canManage && (
            <TabsTrigger
  value="escaner"
  className="min-w-0 flex-1 cursor-pointer justify-center gap-1.5 whitespace-normal px-2 py-2 text-center text-[11px] font-medium sm:flex-none sm:gap-2 sm:whitespace-nowrap sm:px-3 sm:text-xs"
>
  <QrCode className="h-3.5 w-3.5 text-sci-cyan" />
  Escanear Acceso
</TabsTrigger>
          )}

          {canEdit && (
           <TabsTrigger
  value="editar"
  className="min-w-0 flex-1 cursor-pointer justify-center gap-1.5 whitespace-normal px-2 py-2 text-center text-[11px] font-medium sm:flex-none sm:gap-2 sm:whitespace-nowrap sm:px-3 sm:text-xs"
>
  <PencilLine className="h-3.5 w-3.5" />
  Modificar Examen
</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="info">
          <DetalleInfoTab exam={exam} />
        </TabsContent>

        <TabsContent value="estudiantes">
          <DetalleEstudiantesTab exam={exam} canManage={canManage} />
        </TabsContent>

        {canManage && (
          <TabsContent value="escaner">
            <DetalleEscanerTab exam={exam} />
          </TabsContent>
        )}

        {canEdit && (
          <TabsContent value="editar">
            <DetalleEditarTab exam={exam} onUpdated={loadExam} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}