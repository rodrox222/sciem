import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  CalendarRange,
  CheckCircle2,
  Clock,
  Lock,
  Play,
  Save,
  UserCog,
} from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/services/api'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { configService } from '@/services/config.service'
import {
  formatGestionLabel,
  gestionesService,
  PERIODO_LABELS,
  suggestGestionDates,
  type Gestion,
  type PeriodoGestion,
} from '@/services/gestiones.service'

const formatFecha = (fecha?: string) => {
  if (!fecha) return '—'
  const d = new Date(`${fecha.slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime())
    ? fecha
    : new Intl.DateTimeFormat('es-BO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(d)
}

export const ConfiguracionPage: React.FC = () => {
  const [minutes, setMinutes] = useState<number>(configService.getTimeoutMinutes())
  const [savingTimeout, setSavingTimeout] = useState(false)
  const [saved, setSaved] = useState(false)

  // Perfil del Administrador
  const [adminNombre, setAdminNombre] = useState('')
  const [adminPaterno, setAdminPaterno] = useState('')
  const [adminMaterno, setAdminMaterno] = useState('')
  const [adminCi, setAdminCi] = useState('')
  const [adminCiExt, setAdminCiExt] = useState('')
  const [adminPass, setAdminPass] = useState('')
  const [adminPassConf, setAdminPassConf] = useState('')
  const [savingAdmin, setSavingAdmin] = useState(false)

  const [gestiones, setGestiones] = useState<Gestion[]>([])
  const [activa, setActiva] = useState<Gestion | null>(null)
  const [vencida, setVencida] = useState(false)
  const [loadingGestiones, setLoadingGestiones] = useState(true)
  const [savingGestion, setSavingGestion] = useState(false)
  const [closingGestion, setClosingGestion] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)

  // Edición de fechas de la gestión activa
  const [editInicio, setEditInicio] = useState('')
  const [editFin, setEditFin] = useState('')

  // Formulario para iniciar una nueva gestión cuando no hay activa
  const currentYear = new Date().getFullYear()
  const [newAnio, setNewAnio] = useState<number>(currentYear)
  const [newPeriodo, setNewPeriodo] = useState<PeriodoGestion>(1)
  const [newInicio, setNewInicio] = useState(() => suggestGestionDates(currentYear, 1).fecha_inicio)
  const [newFin, setNewFin] = useState(() => suggestGestionDates(currentYear, 1).fecha_fin)

  const loadGestiones = useCallback(async () => {
    setLoadingGestiones(true)
    try {
      const [activaRes, listRes] = await Promise.all([
        gestionesService.getActiva(),
        gestionesService.list(),
      ])
      setActiva(activaRes.gestion)
      setVencida(activaRes.vencida)
      setGestiones(listRes)
      if (activaRes.gestion) {
        setEditInicio(activaRes.gestion.fecha_inicio.slice(0, 10))
        setEditFin(activaRes.gestion.fecha_fin.slice(0, 10))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar las gestiones.')
    } finally {
      setLoadingGestiones(false)
    }
  }, [])

  useEffect(() => {
    void loadGestiones()
    void configService.syncTimeoutFromServer().then(setMinutes)
    void api
      .get<{
        nombre: string
        apellido_paterno: string
        apellido_materno: string | null
        ci: string
        ci_extension: string | null
      }>('/me')
      .then((me) => {
        setAdminNombre(me.nombre || '')
        setAdminPaterno(me.apellido_paterno || '')
        setAdminMaterno(me.apellido_materno || '')
        setAdminCi(me.ci || '')
        setAdminCiExt(me.ci_extension || '')
      })
      .catch(() => {})
  }, [loadGestiones])

  const handleSaveAdminPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    if (adminPass && adminPass !== adminPassConf) {
      toast.error('La confirmación de la contraseña no coincide.')
      return
    }
    setSavingAdmin(true)
    try {
      const payload: Record<string, string | null> = {
        nombre: adminNombre.trim(),
        apellido_paterno: adminPaterno.trim(),
        apellido_materno: adminMaterno.trim() || null,
        ci: adminCi.trim(),
        ci_extension: adminCiExt.trim() || null,
      }
      if (adminPass) {
        payload.password = adminPass
        payload.password_confirmation = adminPassConf
      }

      const res = await api.put<{ message: string; user: Record<string, unknown> }>(
        '/admin/perfil',
        payload,
      )
      try {
        const raw = localStorage.getItem('user_data')
        const prev = raw ? JSON.parse(raw) : {}
        localStorage.setItem('user_data', JSON.stringify({ ...prev, ...res.user }))
      } catch {}
      setAdminPass('')
      setAdminPassConf('')
      toast.success(res.message || 'Datos del administrador actualizados.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el perfil.')
    } finally {
      setSavingAdmin(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingTimeout(true)
    setSaved(false)
    try {
      const updated = await configService.saveTimeoutMinutes(minutes)
      setMinutes(updated)
      setSaved(true)
      toast.success(`Tiempo de inactividad actualizado a ${updated} minuto(s).`)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el tiempo de inactividad.')
    } finally {
      setSavingTimeout(false)
    }
  }

  const handlePeriodoOrAnioChange = (anio: number, periodo: PeriodoGestion) => {
    setNewAnio(anio)
    setNewPeriodo(periodo)
    const suggested = suggestGestionDates(anio, periodo)
    setNewInicio(suggested.fecha_inicio)
    setNewFin(suggested.fecha_fin)
  }

  const handleUpdateFechas = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activa) return
    setSavingGestion(true)
    try {
      const res = await gestionesService.update(activa.id, {
        fecha_inicio: editInicio,
        fecha_fin: editFin,
      })
      toast.success(res.message)
      await loadGestiones()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron actualizar las fechas.')
    } finally {
      setSavingGestion(false)
    }
  }

  const handleCreateGestion = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingGestion(true)
    try {
      const res = await gestionesService.create({
        anio: newAnio,
        periodo: newPeriodo,
        fecha_inicio: newInicio,
        fecha_fin: newFin,
      })
      toast.success(res.message)
      await loadGestiones()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo iniciar la gestión.')
    } finally {
      setSavingGestion(false)
    }
  }

  const handleCerrarGestion = async () => {
    if (!activa) return
    setClosingGestion(true)
    try {
      const res = await gestionesService.cerrar(activa.id)
      toast.success(res.message)
      setConfirmCloseOpen(false)
      await loadGestiones()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cerrar la gestión.')
    } finally {
      setClosingGestion(false)
    }
  }

  const historial = gestiones.filter((g) => !g.activo)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
          Parámetros del Sistema
        </span>
        <h1 className="mt-1 text-2xl font-extrabold text-sci-navy sm:text-3xl tracking-tight">
          Configuración General
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administra la gestión académica vigente, los tiempos de seguridad y las políticas del sistema.
        </p>
      </div>

      {/* Gestión / Semestre Académico */}
      <Card className="rounded-2xl border-border shadow-xs">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sci-blue/10 text-sci-blue">
                <CalendarRange className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-base font-bold text-sci-navy">
                  Gestión / Semestre Académico
                </CardTitle>
                <CardDescription className="text-xs">
                  Define el periodo vigente (1: Primer Semestre, 2: Segundo Semestre, 3: Verano, 4: Invierno) y sus fechas límite.
                </CardDescription>
              </div>
            </div>

            {activa ? (
              <Badge
                variant="outline"
                className={
                  vencida
                    ? 'border-sci-red/30 bg-sci-red/10 text-sci-red font-semibold'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 font-semibold'
                }
              >
                {activa.codigo} · {vencida ? 'Vencida' : 'Activa'}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-sci-amber/40 bg-sci-amber/10 text-sci-amber font-semibold">
                Sin gestión activa
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-5">
          {loadingGestiones ? (
            <p className="text-xs text-muted-foreground">Cargando información de gestiones...</p>
          ) : activa ? (
            <>
              {vencida && (
                <Alert variant="destructive" className="border-sci-red/30 bg-sci-red/10 text-sci-red">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-xs font-bold">Gestión fuera de plazo</AlertTitle>
                  <AlertDescription className="text-xs">
                    La gestión {activa.codigo} superó su fecha de finalización ({formatFecha(activa.fecha_fin)}). No se pueden programar nuevos exámenes hasta extenderla o cerrarla e iniciar una nueva.
                  </AlertDescription>
                </Alert>
              )}

              <div className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Semestre en curso</p>
                  <p className="text-lg font-extrabold text-sci-navy">
                    {formatGestionLabel(activa)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vigencia: {formatFecha(activa.fecha_inicio)} al {formatFecha(activa.fecha_fin)}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setConfirmCloseOpen(true)}
                  disabled={closingGestion}
                  className="gap-2 bg-sci-red hover:bg-sci-red/90 text-white font-semibold cursor-pointer"
                >
                  <Lock className="h-4 w-4" /> Cerrar gestión actual
                </Button>
              </div>

              <form onSubmit={handleUpdateFechas} className="grid gap-4 sm:grid-cols-3 sm:items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="gestion-edit-inicio" className="text-xs font-semibold text-sci-navy">
                    Fecha de inicio
                  </Label>
                  <Input
                    id="gestion-edit-inicio"
                    type="date"
                    value={editInicio}
                    onChange={(e) => setEditInicio(e.target.value)}
                    required
                    className="bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gestion-edit-fin" className="text-xs font-semibold text-sci-navy">
                    Fecha de finalización
                  </Label>
                  <Input
                    id="gestion-edit-fin"
                    type="date"
                    value={editFin}
                    onChange={(e) => setEditFin(e.target.value)}
                    required
                    className="bg-background"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={savingGestion}
                  className="gap-2 bg-sci-blue text-white hover:opacity-90 font-semibold cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  {savingGestion ? 'Guardando...' : 'Actualizar fechas'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <Alert className="border-sci-amber/40 bg-sci-amber/10 text-sci-dark">
                <AlertCircle className="h-4 w-4 text-sci-amber" />
                <AlertTitle className="text-xs font-bold">No hay una gestión activa</AlertTitle>
                <AlertDescription className="text-xs">
                  Actualmente no existe un semestre abierto. Docentes y administradores no podrán programar nuevos exámenes hasta que inicies una gestión.
                </AlertDescription>
              </Alert>

              <form onSubmit={handleCreateGestion} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-sci-navy">Periodo</Label>
                  <Select
                    value={String(newPeriodo)}
                    onValueChange={(val) => handlePeriodoOrAnioChange(newAnio, Number(val) as PeriodoGestion)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecciona periodo" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PERIODO_LABELS) as unknown as PeriodoGestion[]).map((p) => (
                        <SelectItem key={p} value={String(p)}>
                          {p} · {PERIODO_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gestion-new-anio" className="text-xs font-semibold text-sci-navy">
                    Año
                  </Label>
                  <Input
                    id="gestion-new-anio"
                    type="number"
                    min={2020}
                    max={2100}
                    value={newAnio}
                    onChange={(e) =>
                      handlePeriodoOrAnioChange(
                        Math.max(2020, parseInt(e.target.value, 10) || currentYear),
                        newPeriodo,
                      )
                    }
                    required
                    className="bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gestion-new-inicio" className="text-xs font-semibold text-sci-navy">
                    Fecha de inicio
                  </Label>
                  <Input
                    id="gestion-new-inicio"
                    type="date"
                    value={newInicio}
                    onChange={(e) => setNewInicio(e.target.value)}
                    required
                    className="bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gestion-new-fin" className="text-xs font-semibold text-sci-navy">
                    Fecha de finalización
                  </Label>
                  <Input
                    id="gestion-new-fin"
                    type="date"
                    value={newFin}
                    onChange={(e) => setNewFin(e.target.value)}
                    required
                    className="bg-background"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    Código resultante:{' '}
                    <strong className="text-sci-navy">
                      {newPeriodo}-{newAnio}
                    </strong>
                  </span>
                  <Button
                    type="submit"
                    disabled={savingGestion}
                    className="gap-2 bg-sci-blue text-white hover:opacity-90 font-semibold cursor-pointer"
                  >
                    <Play className="h-4 w-4" />
                    {savingGestion ? 'Iniciando...' : `Iniciar gestión ${newPeriodo}-${newAnio}`}
                  </Button>
                </div>
              </form>
            </>
          )}

          {historial.length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                Gestiones cerradas ({historial.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {historial.map((g) => (
                  <div
                    key={g.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs"
                  >
                    <span className="font-bold text-sci-navy">{g.codigo}</span>
                    <span className="text-muted-foreground">
                      ({formatFecha(g.fecha_inicio)} – {formatFecha(g.fecha_fin)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Perfil del Administrador */}
      <Card className="rounded-2xl border-border shadow-xs">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sci-cyan/15 text-sci-navy">
              <UserCog className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-base font-bold text-sci-navy">
                Perfil del Administrador
              </CardTitle>
              <CardDescription className="text-xs">
                Consulta y modifica los datos de la cuenta administradora (el ingreso del administrador es con su CI).
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          <form onSubmit={handleSaveAdminPerfil} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="admin-nombre" className="text-xs font-semibold text-sci-navy">
                  Nombre(s) *
                </Label>
                <Input
                  id="admin-nombre"
                  value={adminNombre}
                  onChange={(e) => setAdminNombre(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-paterno" className="text-xs font-semibold text-sci-navy">
                  Apellido paterno *
                </Label>
                <Input
                  id="admin-paterno"
                  value={adminPaterno}
                  onChange={(e) => setAdminPaterno(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-materno" className="text-xs font-semibold text-sci-navy">
                  Apellido materno
                </Label>
                <Input
                  id="admin-materno"
                  value={adminMaterno}
                  onChange={(e) => setAdminMaterno(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-ci" className="text-xs font-semibold text-sci-navy">
                  Carnet de Identidad (CI) *
                </Label>
                <Input
                  id="admin-ci"
                  value={adminCi}
                  onChange={(e) => setAdminCi(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-ci-ext" className="text-xs font-semibold text-sci-navy">
                  Extensión (opcional)
                </Label>
                <Input
                  id="admin-ci-ext"
                  value={adminCiExt}
                  onChange={(e) => setAdminCiExt(e.target.value)}
                  placeholder="Ej. 1A"
                  maxLength={10}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-pass" className="text-xs font-semibold text-sci-navy">
                  Nueva contraseña (opcional)
                </Label>
                <Input
                  id="admin-pass"
                  type="password"
                  minLength={8}
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  placeholder="Dejar vacío para no cambiar"
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-pass-conf" className="text-xs font-semibold text-sci-navy">
                  Confirmar contraseña
                </Label>
                <Input
                  id="admin-pass-conf"
                  type="password"
                  minLength={8}
                  value={adminPassConf}
                  onChange={(e) => setAdminPassConf(e.target.value)}
                  placeholder="Repetir nueva contraseña"
                  className="bg-background"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={savingAdmin}
                className="gap-2 bg-sci-blue text-white hover:opacity-90 font-semibold cursor-pointer"
              >
                <Save className="h-4 w-4" />
                {savingAdmin ? 'Guardando...' : 'Actualizar datos del administrador'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tiempo de inactividad */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-start gap-4 pb-6 border-b border-border">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sci-amber/15 text-sci-amber">
              <Clock className="h-6 w-6" />
            </span>
            <div className="flex-1 space-y-1">
              <label htmlFor="timeout" className="text-sm font-bold text-sci-navy">
                Tiempo de inactividad de sesión
              </label>
              <p className="text-xs text-muted-foreground">
                Define cuántos minutos de inactividad deben transcurrir antes de advertir al usuario y cerrar su sesión de forma automática.
              </p>

              <div className="pt-3 flex items-center gap-3">
                <input
                  id="timeout"
                  type="number"
                  min={1}
                  max={120}
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-center text-sci-navy focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm font-medium text-muted-foreground">minutos</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {saved ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Configuración guardada exitosamente
              </span>
            ) : (
              <span />
            )}

            <Button type="submit" disabled={savingTimeout} className="gap-2 font-semibold cursor-pointer">
              <Save className="h-4 w-4" /> {savingTimeout ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        isOpen={confirmCloseOpen}
        title="¿Cerrar gestión actual?"
        description="Se finalizará la gestión vigente sin abrir la siguiente todavía. Los exámenes registrados conservarán su estado actual, pero no se podrán programar nuevos exámenes hasta iniciar una nueva gestión."
        itemName={activa ? formatGestionLabel(activa) : undefined}
        onConfirm={() => void handleCerrarGestion()}
        onCancel={() => setConfirmCloseOpen(false)}
        loading={closingGestion}
      />
    </div>
  )
}

export default ConfiguracionPage
