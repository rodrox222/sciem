import { useEffect, useMemo, useRef, useState } from 'react'
import CambiarPasswordDialog from '@/components/estudiante-dashboard/seguridad/CambiarPasswordDialog'
import PerfilEstudiante from '@/components/estudiante-dashboard/perfil/PerfilEstudiante'
import MisExamenes from '@/components/estudiante-dashboard/examenes/MisExamenes'
import ExamenEstudianteCard from '@/components/estudiante-dashboard/examenes/ExamenEstudianteCard'
import { useMisExamenes } from '@/hooks/estudiante/useMisExamenes'
import { usePerfilEstudiante } from '@/hooks/estudiante/usePerfilEstudiante'
import type { UsuarioPerfil } from '@/hooks/estudiante/usePerfilEstudiante'
import {
  UserRound,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
} from 'lucide-react'
import { estudiantesService } from '@/services/estudiantes.service'
type UsuarioEstudiante = UsuarioPerfil
export default function EstudianteDashboardPage() {
  const [camaraAbierta, setCamaraAbierta] = useState(false)
  const [errorCamara, setErrorCamara] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)

  // Búsqueda y paginación de exámenes
  const [busquedaExamen, setBusquedaExamen] = useState('')
  const [paginaActual, setPaginaActual] = useState(1)
  const examenesPorPagina = 6
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // Cambio de contraseña
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmacion, setPasswordConfirmacion] = useState('')
  const [cambiandoPassword, setCambiandoPassword] = useState(false)
  const [mensajePassword, setMensajePassword] = useState('')
  const [errorPassword, setErrorPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [modalPasswordAbierto, setModalPasswordAbierto] = useState(false)
  const usuario: UsuarioEstudiante | null = (() => {
    try {
      const guardado = localStorage.getItem('user_data')
      return guardado ? JSON.parse(guardado) : null
    } catch {
      return null
    }
  })()
  const {
    examenes,
    cargando,
    error,
    cargarExamenes,
  } = useMisExamenes({
    usuarioId: usuario?.id,
  })
  const perfil = usePerfilEstudiante(usuario)
  const examenesFiltrados = useMemo(() => {
    const termino = busquedaExamen.trim().toLocaleLowerCase('es')

    if (!termino) return examenes

    return examenes.filter((examen) =>
      [
        examen.nombre,
        examen.materia,
        examen.aula,
        examen.docente,
      ].some((valor) =>
        String(valor ?? '').toLocaleLowerCase('es').includes(termino),
      ),
    )
  }, [examenes, busquedaExamen])
  const totalPaginas = Math.ceil(examenesFiltrados.length / examenesPorPagina)

  const examenesPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * examenesPorPagina

    return examenesFiltrados.slice(inicio, inicio + examenesPorPagina)
  }, [examenesFiltrados, paginaActual, examenesPorPagina])
  const limpiarBusqueda = () => {
    setBusquedaExamen('')
    setPaginaActual(1)
  }
  useEffect(() => {
    setPaginaActual(1)
  }, [busquedaExamen, examenesPorPagina])

  useEffect(() => {
    if (paginaActual > Math.max(1, totalPaginas)) {
      setPaginaActual(Math.max(1, totalPaginas))
    }
  }, [paginaActual, totalPaginas])
  const {
    ci,
    setCi,
    ciExtension,
    setCiExtension,
    perfilCompletado,
    guardandoPerfil,
    subiendoFoto,
    mensajePerfil,
    setMensajePerfil,
    errorPerfil,
    setErrorPerfil,
    fotoCapturada,
    setFotoCapturada,
    guardarPerfil,
    subirFotografia,
  } = perfil
  const nombreCompleto =
    [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ') ||
    'Estudiante'
  const abrirCamara = async () => {
    setErrorCamara('')
    setMensajePerfil('')
    setFotoCapturada(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorCamara(
        'Tu navegador no permite acceder a la cámara. Utiliza HTTPS o localhost.',
      )
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream
      setCamaraAbierta(true)
    } catch (error) {
      console.error('Error al abrir la cámara:', error)
      setErrorCamara(
        'No se pudo abrir la cámara. Comprueba los permisos del navegador.',
      )
    }
  }
  const cerrarCamara = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCamaraAbierta(false)
  }
  useEffect(() => {
    if (!camaraAbierta) return

    const video = videoRef.current
    const stream = streamRef.current

    if (!video || !stream) return

    video.srcObject = stream

    void video.play().catch((error) => {
      console.error('No se pudo reproducir la cámara:', error)
      setErrorCamara(
        'No se pudo mostrar la cámara. Comprueba los permisos del navegador.',
      )
    })

    return () => {
      video.srcObject = null
    }
  }, [camaraAbierta])
  const capturarFotografia = () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || video.videoWidth === 0) {
      setErrorCamara('La cámara todavía no está lista. Inténtalo nuevamente.')
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const contexto = canvas.getContext('2d')

    if (!contexto) {
      setErrorCamara('No se pudo procesar la fotografía.')
      return
    }

    contexto.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErrorCamara('No se pudo generar la fotografía.')
          return
        }

        const archivo = new File(
          [blob],
          `verificacion-${Date.now()}.jpg`,
          { type: 'image/jpeg' },
        )

        if (archivo.size > 3 * 1024 * 1024) {
          setErrorCamara(
            'La fotografía supera los 3 MB permitidos. Intenta nuevamente.',
          )
          return
        }

        setFotoCapturada(archivo)
        setErrorCamara('')
        cerrarCamara()
      },
      'image/jpeg',
      0.85,
    )
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])
  const cambiarPassword = async () => {
    setMensajePassword('')
    setErrorPassword('')

    if (!passwordActual || !passwordNueva || !passwordConfirmacion) {
      setErrorPassword('Debes completar todos los campos.')
      return
    }

    if (passwordNueva.length < 8) {
      setErrorPassword('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (passwordNueva !== passwordConfirmacion) {
      setErrorPassword('La confirmación de la nueva contraseña no coincide.')
      return
    }

    if (passwordActual === passwordNueva) {
      setErrorPassword(
        'La nueva contraseña no puede ser igual a la contraseña actual.',
      )
      return
    }

    try {
      setCambiandoPassword(true)

      await estudiantesService.cambiarPassword({
        current_password: passwordActual,
        new_password: passwordNueva,
        new_password_confirmation: passwordConfirmacion,
      })

      setMensajePassword('¡Tu contraseña se cambió correctamente!')
      setPasswordActual('')
      setPasswordNueva('')
      setPasswordConfirmacion('')
      setMostrarPassword(false)

      // Mostrar el mensaje de éxito y cerrar el modal después de 2 segundos.
      setTimeout(() => {
        setModalPasswordAbierto(false)
        setMensajePassword('')
      }, 2000)
    } catch (error: unknown) {
      console.error('Error al cambiar la contraseña:', error)

      const errorApi = error as {
        response?: {
          data?: {
            message?: string
            errors?: Record<string, string[]>
          }
        }
      }

      const erroresValidacion = errorApi.response?.data?.errors
      const primerError = erroresValidacion
        ? Object.values(erroresValidacion).flat()[0]
        : undefined

      setErrorPassword(
        primerError ||
        errorApi.response?.data?.message ||
        'No se pudo cambiar la contraseña. Inténtalo nuevamente.',
      )
    } finally {
      setCambiandoPassword(false)
    }
  }
  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <UserRound size={22} />
          </div>
          <div>
            <p className="text-sm font-medium text-primary">
              Módulo de estudiante
            </p>
            <h2 className="text-lg font-semibold">Mi perfil</h2>
            <p className="text-sm text-muted-foreground">
              {nombreCompleto}
            </p>
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
                className="h-24 w-24 rounded-xl border object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}
          </div>
        ) : (
          <PerfilEstudiante
            ci={ci}
            ciExtension={ciExtension}
            errorPerfil={errorPerfil}
            mensajePerfil={mensajePerfil}
            guardandoPerfil={guardandoPerfil}
            camaraAbierta={camaraAbierta}
            fotoCapturada={fotoCapturada}
            subiendoFoto={subiendoFoto}
            errorCamara={errorCamara}
            videoRef={videoRef}
            canvasRef={canvasRef}
            onCiChange={(valor) => {
              setCi(valor)
              setErrorPerfil('')
            }}
            onCiExtensionChange={setCiExtension}
            onGuardarPerfil={guardarPerfil}
            onAbrirCamara={abrirCamara}
            onCapturarFotografia={capturarFotografia}
            onCerrarCamara={cerrarCamara}
            onDescartarFotografia={() => setFotoCapturada(null)}
            onSubirFotografia={subirFotografia}
          />
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
      <CambiarPasswordDialog
        passwordActual={passwordActual}
        passwordNueva={passwordNueva}
        passwordConfirmacion={passwordConfirmacion}
        cambiandoPassword={cambiandoPassword}
        mensajePassword={mensajePassword}
        errorPassword={errorPassword}
        mostrarPassword={mostrarPassword}
        modalPasswordAbierto={modalPasswordAbierto}
        setPasswordActual={setPasswordActual}
        setPasswordNueva={setPasswordNueva}
        setPasswordConfirmacion={setPasswordConfirmacion}
        setMostrarPassword={setMostrarPassword}
        setModalPasswordAbierto={setModalPasswordAbierto}
        setMensajePassword={setMensajePassword}
        setErrorPassword={setErrorPassword}
        cambiarPassword={cambiarPassword}
      />
      <MisExamenes
        cargando={cargando}
        error={error}
        hayExamenes={examenes.length > 0}
        onReintentar={() => void cargarExamenes()}
      >
        <div className="space-y-5">
          {/* Encabezado y contador */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <input
              type="search"
              value={busquedaExamen}
              onChange={(event) => setBusquedaExamen(event.target.value)}
              placeholder="Buscar por examen, materia, aula o docente..."
              aria-label="Buscar exámenes"
              className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-10 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />

            {busquedaExamen && (
              <button
                type="button"
                onClick={() => setBusquedaExamen('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={17} />
              </button>
            )}
          </div>
          {/* Tarjetas */}
          {examenesFiltrados.length > 0 ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {examenesPaginados.map((examen) => (
                  <ExamenEstudianteCard
                    key={examen.id_examen}
                    examen={examen}
                  />
                ))}
              </div>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Página {paginaActual} de {totalPaginas} · {examenesFiltrados.length}{' '}
                    {examenesFiltrados.length === 1 ? 'examen' : 'exámenes'}
                  </p>

                  <nav
                    aria-label="Paginación de exámenes"
                    className="flex items-center justify-end gap-2"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setPaginaActual((pagina) => Math.max(1, pagina - 1))
                      }
                      disabled={paginaActual === 1}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={15} />
                      Anterior
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPaginaActual((pagina) =>
                          Math.min(totalPaginas, pagina + 1),
                        )
                      }
                      disabled={paginaActual === totalPaginas}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Siguiente
                      <ChevronRight size={15} />
                    </button>
                  </nav>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <CalendarDays size={23} className="text-muted-foreground" />
              </div>

              <h3 className="font-semibold text-foreground">
                No se encontraron exámenes
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                No hay exámenes que coincidan con tu búsqueda.
              </p>
              <button
                type="button"
                onClick={limpiarBusqueda}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Limpiar búsqueda
              </button>
            </div>
          )}
        </div>
      </MisExamenes>

      {/* Canvas para la fotografía del perfil */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}