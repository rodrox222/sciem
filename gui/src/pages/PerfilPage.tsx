import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpenCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Save,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/services/api'
import { apiUrl } from '@/services/apiUrl'
import { estudiantesService } from '@/services/estudiantes.service'

interface MeResponse {
  id: string
  ci: string | null
  ci_extension: string | null
  nombre: string
  apellido_paterno: string
  apellido_materno: string | null
  email: string | null
  codigo_sis?: string | null
  foto_perfil_url?: string | null
  primer_acceso_completado?: boolean | null
  es_auxiliar?: boolean | null
  rol: 'docente' | 'estudiante' | string
}

interface MateriaDocenteItem {
  id: string
  nombre: string
  asignada: boolean
}

interface MisMateriasResponse {
  materias: MateriaDocenteItem[]
}

export default function PerfilPage() {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Docente: materias asignadas
  const [materias, setMaterias] = useState<MateriaDocenteItem[]>([])
  const [selectedMaterias, setSelectedMaterias] = useState<Set<string>>(new Set())
  const [searchMateria, setSearchMateria] = useState('')
  const [savingMaterias, setSavingMaterias] = useState(false)

  // Estudiante: foto de primer ingreso
  const [fotoSrc, setFotoSrc] = useState<string | null>(null)
  const [loadingFoto, setLoadingFoto] = useState(false)

  // Estudiante: cambio de contraseña
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmacion, setPasswordConfirmacion] = useState('')
  const [mostrarPasswords, setMostrarPasswords] = useState(false)
  const [cambiandoPassword, setCambiandoPassword] = useState(false)

  const loadPerfil = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const userMe = await api.get<MeResponse>('/me')
      setMe(userMe)

      if (userMe.rol === 'docente') {
        const resMat = await api.get<MisMateriasResponse>('/docente/materias')
        const lista = Array.isArray(resMat.materias) ? resMat.materias : []
        setMaterias(lista)
        setSelectedMaterias(new Set(lista.filter((m) => m.asignada).map((m) => m.id)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar tu perfil.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Mi Perfil | SCI'
    void loadPerfil()
  }, [loadPerfil])

  // Cargar fotografía de primer acceso para estudiante (soporta URL directa o /api/estudiante/foto/{id})
  useEffect(() => {
    if (!me || me.rol !== 'estudiante' || !me.foto_perfil_url) {
      setFotoSrc(null)
      return
    }

    const rawUrl = me.foto_perfil_url.trim()
    if (/^https?:\/\//i.test(rawUrl)) {
      setFotoSrc(rawUrl)
      return
    }

    let revoked = false
    let objectUrl: string | null = null
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || ''

    setLoadingFoto(true)
    fetch(apiUrl(`/estudiante/foto/${me.id}`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar la foto')
        return res.blob()
      })
      .then((blob) => {
        if (revoked) return
        objectUrl = URL.createObjectURL(blob)
        setFotoSrc(objectUrl)
      })
      .catch(() => {
        if (!revoked) setFotoSrc(null)
      })
      .finally(() => {
        if (!revoked) setLoadingFoto(false)
      })

    return () => {
      revoked = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [me])

  const materiasFiltradas = useMemo(() => {
    const term = searchMateria.trim().toLowerCase()
    if (!term) return materias
    return materias.filter((m) => m.nombre.toLowerCase().includes(term))
  }, [materias, searchMateria])

  const toggleMateria = (id: string) => {
    setSelectedMaterias((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleGuardarMaterias = async () => {
    setSavingMaterias(true)
    try {
      const res = await api.post<{ message: string }>('/docente/materias', {
        materias_ids: Array.from(selectedMaterias),
      })
      toast.success(res.message || 'Materias actualizadas correctamente.')
      await loadPerfil()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron actualizar tus materias.')
    } finally {
      setSavingMaterias(false)
    }
  }

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordNueva.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (passwordNueva !== passwordConfirmacion) {
      toast.error('La confirmación de la contraseña no coincide.')
      return
    }

    setCambiandoPassword(true)
    try {
      const res = await estudiantesService.cambiarPassword({
        current_password: passwordActual,
        new_password: passwordNueva,
        new_password_confirmation: passwordConfirmacion,
      })
      toast.success(res.message || 'Contraseña actualizada correctamente.')
      setPasswordActual('')
      setPasswordNueva('')
      setPasswordConfirmacion('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.')
    } finally {
      setCambiandoPassword(false)
    }
  }

  const nombreCompleto = me
    ? [me.nombre, me.apellido_paterno, me.apellido_materno].filter(Boolean).join(' ')
    : ''

  const ciCompleto = me?.ci
    ? `${me.ci}${me.ci_extension ? `-${me.ci_extension}` : ''}`
    : 'Sin registrar'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
          Cuenta Institucional
        </span>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-sci-navy sm:text-3xl">
          Mi Perfil
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {me?.rol === 'docente'
            ? 'Consulta tus datos registrados y selecciona las materias que dictas para programar exámenes.'
            : 'Consulta tus datos personales, tu fotografía de primer ingreso y actualiza tu contraseña.'}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Card className="rounded-2xl border-border p-8 text-center text-xs text-muted-foreground">
          Cargando información del perfil...
        </Card>
      ) : me ? (
        <>
          {/* Datos personales (solo lectura) */}
          <Card className="rounded-2xl border-border shadow-xs">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-sci-blue/10 text-sci-blue">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle className="text-base font-bold text-sci-navy">
                      Datos personales
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Información registrada en el sistema (solo lectura).
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="border-sci-cyan/40 bg-sci-cyan/10 text-sci-navy capitalize font-semibold">
                  {me.rol}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-5">
              <div className={`grid gap-6 ${me.rol === 'estudiante' ? 'md:grid-cols-[1fr_220px]' : ''}`}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Nombre completo
                    </Label>
                    <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-semibold text-sci-navy">
                      {nombreCompleto || '—'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Carnet de Identidad (CI)
                    </Label>
                    <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-semibold text-sci-navy">
                      {ciCompleto}
                    </p>
                  </div>

                  {me.rol === 'estudiante' && (
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Código SIS
                      </Label>
                      <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-semibold text-sci-navy">
                        {me.codigo_sis || '—'}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Correo electrónico
                    </Label>
                    <p className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-sci-navy truncate">
                      <Mail className="h-4 w-4 shrink-0 text-sci-cyan" />
                      <span className="truncate">{me.email || '—'}</span>
                    </p>
                  </div>
                </div>

                {/* Primera foto tomada al entrar al sistema (Estudiante) */}
                {me.rol === 'estudiante' && (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-muted/20 p-4 text-center">
                    <span className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Fotografía de primer ingreso
                    </span>
                    {loadingFoto ? (
                      <div className="grid h-36 w-36 place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                        Cargando foto...
                      </div>
                    ) : fotoSrc ? (
                      <img
                        src={fotoSrc}
                        alt={`Fotografía de ${nombreCompleto}`}
                        className="h-36 w-36 rounded-xl border border-border object-cover shadow-xs"
                      />
                    ) : (
                      <div className="grid h-36 w-36 place-items-center rounded-xl border border-dashed border-border px-3 text-xs text-muted-foreground">
                        Sin fotografía registrada aún
                      </div>
                    )}
                    {me.primer_acceso_completado && (
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <ShieldCheck className="h-3.5 w-3.5" /> Verificada en primer acceso
                      </span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sección Docente: Autoasignación de Materias */}
          {me.rol === 'docente' && (
            <Card className="rounded-2xl border-border shadow-xs">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-sci-cyan/15 text-sci-navy">
                      <BookOpenCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle className="text-base font-bold text-sci-navy">
                        Mis Materias
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Marca las materias que dictas. Solo estas aparecerán disponibles cuando programes un nuevo examen.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-sci-blue/30 bg-sci-blue/5 text-sci-blue font-semibold">
                    {selectedMaterias.size} seleccionada(s)
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    value={searchMateria}
                    onChange={(e) => setSearchMateria(e.target.value)}
                    placeholder="Filtrar materias..."
                    className="h-10 bg-background pl-9"
                  />
                </div>

                <div className="max-h-72 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                  {materiasFiltradas.length === 0 ? (
                    <p className="p-4 text-center text-xs text-muted-foreground">
                      No se encontraron materias con ese criterio.
                    </p>
                  ) : (
                    materiasFiltradas.map((mat) => {
                      const checked = selectedMaterias.has(mat.id)
                      return (
                        <label
                          key={mat.id}
                          className={`flex items-center gap-3 px-4 py-3 text-sm cursor-pointer transition-colors ${
                            checked ? 'bg-sci-blue/5' : 'hover:bg-muted/30'
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleMateria(mat.id)}
                          />
                          <span className="font-medium text-sci-navy">{mat.nombre}</span>
                        </label>
                      )
                    })
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    onClick={() => void handleGuardarMaterias()}
                    disabled={savingMaterias}
                    className="gap-2 bg-sci-blue text-white hover:opacity-90 font-semibold cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    {savingMaterias ? 'Guardando...' : 'Guardar materias'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sección Estudiante: Cambio de Contraseña */}
          {me.rol === 'estudiante' && (
            <Card className="rounded-2xl border-border shadow-xs">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-sci-amber/15 text-sci-amber">
                    <KeyRound className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle className="text-base font-bold text-sci-navy">
                      Seguridad de la cuenta
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Puedes actualizar tu contraseña cuando lo necesites.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-5">
                <form onSubmit={handleCambiarPassword} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="est-pass-actual" className="text-xs font-semibold text-sci-navy">
                        Contraseña actual
                      </Label>
                      <Input
                        id="est-pass-actual"
                        type={mostrarPasswords ? 'text' : 'password'}
                        value={passwordActual}
                        onChange={(e) => setPasswordActual(e.target.value)}
                        required
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="est-pass-nueva" className="text-xs font-semibold text-sci-navy">
                        Nueva contraseña
                      </Label>
                      <Input
                        id="est-pass-nueva"
                        type={mostrarPasswords ? 'text' : 'password'}
                        minLength={8}
                        value={passwordNueva}
                        onChange={(e) => setPasswordNueva(e.target.value)}
                        required
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="est-pass-conf" className="text-xs font-semibold text-sci-navy">
                        Confirmar nueva contraseña
                      </Label>
                      <Input
                        id="est-pass-conf"
                        type={mostrarPasswords ? 'text' : 'password'}
                        minLength={8}
                        value={passwordConfirmacion}
                        onChange={(e) => setPasswordConfirmacion(e.target.value)}
                        required
                        className="bg-background"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setMostrarPasswords((v) => !v)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {mostrarPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {mostrarPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                    </button>

                    <Button
                      type="submit"
                      disabled={cambiandoPassword}
                      className="gap-2 bg-sci-blue text-white hover:opacity-90 font-semibold cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {cambiandoPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}
