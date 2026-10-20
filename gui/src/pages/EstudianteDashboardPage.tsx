
import { useEffect, useState } from 'react'
import {
  BookOpen,
  CalendarDays,
  Clock,
  RefreshCw,
  UserRound,
  Camera,
  Save,
} from 'lucide-react'
import { estudiantesService } from '@/services/estudiantes.service'
import type { ExamenEstudiante } from '@/services/estudiantes.service'

interface UsuarioEstudiante {
  id: string | number
  nombre?: string
  apellido?: string
  codigo_sis?: string
  foto_perfil_url?: string | null
  primer_acceso_completado?: boolean
}

export default function EstudianteDashboardPage() {
  const [examenes, setExamenes] = useState<ExamenEstudiante[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
const [ci, setCi] = useState('')
const [ciExtension, setCiExtension] = useState('')
const [guardandoPerfil, setGuardandoPerfil] = useState(false)
const [subiendoFoto, setSubiendoFoto] = useState(false)
const [mensajePerfil, setMensajePerfil] = useState('')
const [errorPerfil, setErrorPerfil] = useState('')
const [fotoSeleccionada, setFotoSeleccionada] = useState<File | null>(null)
const [perfilCompletado, setPerfilCompletado] = useState(false)  
const usuario: UsuarioEstudiante | null = (() => {
    try {
      const guardado = localStorage.getItem('user_data')
      return guardado ? JSON.parse(guardado) : null
    } catch {
      return null
    }
  })()
useEffect(() => {
  setPerfilCompletado(
    usuario?.primer_acceso_completado === true,
  )

  setCi((usuario as UsuarioEstudiante & { ci?: string | null })?.ci ?? '')
}, [])
  const cargarExamenes = async () => {
    if (!usuario?.id) {
      setError('No se encontró la información del estudiante autenticado.')
      setCargando(false)
      return
    }

    try {
      setCargando(true)
      setError('')

      const respuesta = await estudiantesService.misExamenes(
        String(usuario.id),
      )

      setExamenes(respuesta.examenes ?? [])
    } catch (err) {
      console.error('Error al cargar los exámenes:', err)
      setError('No se pudieron cargar tus exámenes. Intenta nuevamente.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarExamenes()
  }, [])

  const nombreCompleto =
    [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ') ||
    'Estudiante'

  const guardarPerfil = async () => {
    if (!usuario?.id) {
      setErrorPerfil('No se encontró el ID del estudiante.')
      return
    }

    if (!ci.trim()) {
      setErrorPerfil('El CI es obligatorio.')
      return
    }

    try {
      setGuardandoPerfil(true)
      setErrorPerfil('')
      setMensajePerfil('')

    const respuesta = await estudiantesService.completarDatos(
  String(usuario.id),
  {
    ci: ci.trim(),
    ci_extension: ciExtension || null,
  },
)

setPerfilCompletado(
  respuesta.data.primer_acceso_completado === true,
)
      setMensajePerfil('Datos personales guardados correctamente.')
    } catch (err) {
      console.error('Error al guardar el perfil:', err)
      setErrorPerfil('No se pudieron guardar los datos. Verifica el CI e inténtalo nuevamente.')
    } finally {
      setGuardandoPerfil(false)
    }
  }

  const subirFotografia = async () => {
    if (!usuario?.id || !fotoSeleccionada) {
      setErrorPerfil('Selecciona una fotografía antes de continuar.')
      return
    }

    try {
      setSubiendoFoto(true)
      setErrorPerfil('')
      setMensajePerfil('')

      await estudiantesService.subirFoto(
        String(usuario.id),
        fotoSeleccionada,
      )

      setMensajePerfil('Fotografía subida correctamente.')
      setFotoSeleccionada(null)
    } catch (err) {
      console.error('Error al subir la fotografía:', err)
      setErrorPerfil('No se pudo subir la fotografía. Comprueba el formato y el tamaño.')
    } finally {
      setSubiendoFoto(false)
    }
  }
  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Módulo de estudiante
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Hola, {nombreCompleto}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Consulta tus exámenes y el estado de tus inscripciones.
            </p>
            {usuario?.codigo_sis && (
              <p className="mt-2 text-sm">
                Código SIS: <strong>{usuario.codigo_sis}</strong>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => void cargarExamenes()}
            disabled={cargando}
            className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={cargando ? 'animate-spin' : ''}
            />
            Actualizar
          </button>
        </div>
      </section>

      
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <UserRound size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Mi perfil</h2>
            <p className="text-sm text-muted-foreground">
              {perfilCompletado
                ? 'Tus datos personales están registrados.'
                : 'Completa tus datos personales para continuar.'}
            </p>
          </div>
        </div>

        {perfilCompletado ? (
          <div className="space-y-3">
            <p className="text-sm text-green-700">
              Perfil completado correctamente.
            </p>
            {usuario?.foto_perfil_url && (
              <img
                src={usuario.foto_perfil_url}
                alt="Fotografía del estudiante"
                className="h-20 w-20 rounded-full border object-cover"
              />
            )}
          </div>
        ) : (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void guardarPerfil()
              }}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className="space-y-2">
                <label htmlFor="ci" className="text-sm font-medium">
                  Carnet de identidad (CI)
                </label>
                <input
                  id="ci"
                  type="text"
                  value={ci}
                  onChange={(e) => setCi(e.target.value)}
                  required
                  maxLength={20}
                  placeholder="Ingresa tu CI"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="ciExtension" className="text-sm font-medium">
                  Extensión
                </label>
                <select
                  id="ciExtension"
                  value={ciExtension}
                  onChange={(e) => setCiExtension(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Sin extensión</option>
                  <option value="CB">CB - Cochabamba</option>
                  <option value="LP">LP - La Paz</option>
                  <option value="SC">SC - Santa Cruz</option>
                  <option value="OR">OR - Oruro</option>
                  <option value="PT">PT - Potosí</option>
                  <option value="TJ">TJ - Tarija</option>
                  <option value="CH">CH - Chuquisaca</option>
                  <option value="BE">BE - Beni</option>
                  <option value="PD">PD - Pando</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={guardandoPerfil}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  <Save size={16} />
                  {guardandoPerfil ? 'Guardando...' : 'Guardar datos'}
                </button>
              </div>
            </form>

            <div className="mt-6 space-y-3 border-t pt-5">
              <label htmlFor="fotoEstudiante" className="text-sm font-medium">
                Fotografía (JPG, PNG o WEBP; máximo 5 MB)
              </label>
              <input
                id="fotoEstudiante"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) =>
                  setFotoSeleccionada(e.target.files?.[0] ?? null)
                }
                className="block w-full text-sm"
              />
              <button
                type="button"
                onClick={() => void subirFotografia()}
                disabled={!fotoSeleccionada || subiendoFoto}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
              >
                <Camera size={16} />
                {subiendoFoto ? 'Subiendo...' : 'Subir fotografía'}
              </button>
            </div>
          </>
        )}

        {mensajePerfil && (
          <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
            {mensajePerfil}
          </p>
        )}
        {errorPerfil && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {errorPerfil}
          </p>
        )}
      </section>
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <BookOpen size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Mis exámenes</h2>
            <p className="text-sm text-muted-foreground">
              Exámenes asociados a tu inscripción.
            </p>
          </div>
        </div>

        {cargando ? (
          <div className="rounded-xl border p-8 text-center text-muted-foreground">
            <RefreshCw size={22} className="mx-auto mb-3 animate-spin" />
            Cargando tus exámenes...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 p-6 text-sm text-destructive">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void cargarExamenes()}
              className="mt-3 rounded-lg border px-3 py-2 text-foreground hover:bg-muted"
            >
              Reintentar
            </button>
          </div>
        ) : examenes.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <CalendarDays
              size={28}
              className="mx-auto mb-3 text-muted-foreground"
            />
            <h3 className="font-semibold">No tienes exámenes registrados</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Cuando tengas exámenes asociados a tu inscripción, aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {examenes.map((examen) => (
              <article
                key={examen.id_examen}
                className="rounded-xl border bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{examen.nombre}</h3>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      examen.estado === 'Habilitado'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {examen.estado}
                  </span>
                </div>

                {examen.materia && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {examen.materia}
                  </p>
                )}

                <div className="mt-4 space-y-2 text-sm">
                
<p className="flex items-center gap-2">
  <CalendarDays
    size={16}
    className="shrink-0 text-muted-foreground"
  />
  {(() => {
    const fecha = examen.fecha.slice(0, 10)
    const [anio, mes, dia] = fecha.split('-')
    return anio && mes && dia
      ? `${dia}/${mes}/${anio}`
      : examen.fecha
  })()}
</p>


                  {(examen.hora_ini || examen.hora_fin) && (
                    <p className="flex items-center gap-2">
                      <Clock
                        size={16}
                        className="shrink-0 text-muted-foreground"
                      />
                      {[examen.hora_ini, examen.hora_fin]
                        .filter(Boolean)
                        .join(' - ')}
                    </p>
                  )}

                  {examen.aula && (
                    <p>
                      <span className="text-muted-foreground">Aula:</span>{' '}
                      {examen.aula}
                    </p>
                  )}

                  {examen.docente && (
                    <p>
                      <span className="text-muted-foreground">Docente:</span>{' '}
                      {examen.docente}
                    </p>
                  )}
                </div>

                {examen.estado === 'Inhabilitado' && examen.motivo_estado && (
                  <p className="mt-4 rounded-lg bg-muted p-3 text-sm">
                    <strong>Motivo:</strong> {examen.motivo_estado}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
