import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  UserPlus,
  Users,
  Mail,
  Trash2,
  RefreshCw,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react'

import { auxiliaresService, type AuxiliarAsignado } from '@/services/auxiliares.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface DetalleAuxiliaresTabProps {
  examenId: string
  puedeGestionar: boolean
}

export default function DetalleAuxiliaresTab({
  examenId,
  puedeGestionar,
}: DetalleAuxiliaresTabProps) {
  const [auxiliares, setAuxiliares] = useState<AuxiliarAsignado[]>([])
  const [email, setEmail] = useState('')
  const [cargando, setCargando] = useState(true)
  const [asignando, setAsignando] = useState(false)
  const [actualizando, setActualizando] = useState(false)
const [auxiliarSeleccionado, setAuxiliarSeleccionado] =
  useState<AuxiliarAsignado | null>(null)

const [desvinculando, setDesvinculando] = useState(false)
  const cargarAuxiliares = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true)

    try {
      const respuesta = await auxiliaresService.listarPorExamen(examenId)
      setAuxiliares(respuesta.data ?? [])
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los auxiliares del examen.'

      toast.error(mensaje)
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }, [examenId])

  useEffect(() => {
    void cargarAuxiliares()
  }, [cargarAuxiliares])

  const asignarAuxiliar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const emailNormalizado = email.trim().toLowerCase()

    if (!emailNormalizado) {
      toast.error('Ingresa el correo institucional del auxiliar.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
      toast.error('Ingresa un correo electrónico válido.')
      return
    }

    setAsignando(true)

    try {
      const respuesta = await auxiliaresService.asignar(examenId, emailNormalizado)

      toast.success(respuesta.message || 'Auxiliar asignado correctamente.')
      setEmail('')
      await cargarAuxiliares(true)
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudo asignar al auxiliar.'

      toast.error(mensaje)
    } finally {
      setAsignando(false)
    }
  }

  const confirmarDesvinculacion = async () => {
  if (!auxiliarSeleccionado) return

  setDesvinculando(true)

  try {
    const respuesta = await auxiliaresService.desvincular(
      examenId,
      auxiliarSeleccionado.id_auxiliar,
    )

    toast.success(
      respuesta.message || 'Auxiliar desvinculado correctamente.',
    )

    setAuxiliarSeleccionado(null)
    await cargarAuxiliares(true)
  } catch (error: unknown) {
    const mensaje =
      error instanceof Error
        ? error.message
        : 'No se pudo desvincular al auxiliar.'

    toast.error(mensaje)
  } finally {
    setDesvinculando(false)
  }
}
  const actualizarLista = async () => {
    setActualizando(true)
    await cargarAuxiliares(true)
  }

  return (
    <div className="space-y-6">
      {puedeGestionar && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Asignar auxiliar
            </CardTitle>
            <CardDescription>
              Ingresa el correo institucional de un estudiante registrado para asignarlo como auxiliar de este examen.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={asignarAuxiliar}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="auxiliar@institucion.edu"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={asignando}
                  className="pl-9"
                  maxLength={255}
                  autoComplete="email"
                />
              </div>

              <Button type="submit" disabled={asignando || !email.trim()}>
                {asignando ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                {asignando ? 'Asignando...' : 'Asignar auxiliar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Auxiliares asignados
            </CardTitle>
            <CardDescription>
              Personas habilitadas como auxiliares para este examen.
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={actualizarLista}
            disabled={actualizando || cargando}
            aria-label="Actualizar lista de auxiliares"
            title="Actualizar lista"
          >
            <RefreshCw className={`h-4 w-4 ${actualizando ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>

        <CardContent>
          {cargando ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Cargando auxiliares...
            </div>
          ) : auxiliares.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-10 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Todavía no hay auxiliares asignados</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Los auxiliares que asignes aparecerán en esta lista.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {auxiliares.map((auxiliar) => {
                const nombre = [
                  auxiliar.nombre,
                  auxiliar.apellido_paterno,
                  auxiliar.apellido_materno,
                ].filter(Boolean).join(' ')

             const estaDesvinculando =
  desvinculando && auxiliarSeleccionado?.id_auxiliar === auxiliar.id_auxiliar

                return (
                  <div
                    key={auxiliar.id}
                    className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <ShieldCheck className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="break-words font-medium">
                          {nombre || 'Auxiliar'}
                        </p>
                        <p className="break-all text-sm text-muted-foreground">
                          {auxiliar.email_institucional}
                        </p>
                        {auxiliar.codigo_sis && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Código SIS: {auxiliar.codigo_sis}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <Badge variant="secondary" className="shrink-0">
                        {auxiliar.estado}
                      </Badge>

                      {puedeGestionar && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setAuxiliarSeleccionado(auxiliar)}
                          disabled={estaDesvinculando}
                        >
                          {estaDesvinculando ? (
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Desvincular
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
            </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={auxiliarSeleccionado !== null}
        title="Desvincular auxiliar"
        description="¿Estás seguro de que deseas desvincular a este auxiliar del examen? Esta acción desactivará su asignación."
        itemName={
          auxiliarSeleccionado
            ? [
                auxiliarSeleccionado.nombre,
                auxiliarSeleccionado.apellido_paterno,
                auxiliarSeleccionado.apellido_materno,
              ]
                .filter(Boolean)
                .join(' ') || auxiliarSeleccionado.email_institucional
            : undefined
        }
        onConfirm={() => void confirmarDesvinculacion()}
        onCancel={() => setAuxiliarSeleccionado(null)}
        loading={desvinculando}
      />
    </div>
  )
}