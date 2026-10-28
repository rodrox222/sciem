import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  BookOpen,
  CalendarDays,
  Clock,
  RefreshCw,
  UserRound,
  Camera,
  Save,
  X,
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
  const [fotoCapturada, setFotoCapturada] = useState<File | null>(null)
  const [camaraAbierta, setCamaraAbierta] = useState(false)
  const [errorCamara, setErrorCamara] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoQrRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [perfilCompletado, setPerfilCompletado] = useState(false)
  const [examenQrId, setExamenQrId] = useState<string | null>(null)
  const [solicitandoQr, setSolicitandoQr] = useState(false)
  const [errorQr, setErrorQr] = useState('')
  const [mensajeQr, setMensajeQr] = useState('')
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [fotoVerificacion, setFotoVerificacion] = useState<File | null>(null)
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

      const respuesta = await estudiantesService.misExamenes()
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
    if (!/^[0-9]+$/.test(ci.trim())) {
      setErrorPerfil('El CI debe contener solamente números.')
      return
    }
    try {
      setGuardandoPerfil(true)
      setErrorPerfil('')
      setMensajePerfil('')
      const respuesta = await estudiantesService.completarDatos({
        ci: ci.trim(),
        ci_extension: ciExtension || null,
      })
      const completado =
        respuesta.data.primer_acceso_completado === true

      setPerfilCompletado(completado)

      const usuarioActualizado = {
        ...usuario,
        ci: respuesta.data.ci,
        primer_acceso_completado: completado,
      }

      localStorage.setItem('user_data', JSON.stringify(usuarioActualizado))

      setMensajePerfil(
        completado
          ? 'Perfil completado correctamente.'
          : 'CI guardado. Ahora debes subir tu fotografía.',
      )
    } catch (err) {
      console.error('Error al guardar el perfil:', err)
      setErrorPerfil('No se pudieron guardar los datos. Verifica el CI e inténtalo nuevamente.')
    } finally {
      setGuardandoPerfil(false)
    }
  }
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

  useEffect(() => {
    if (!camaraAbierta) return

    const video = examenQrId !== null
      ? videoQrRef.current
      : videoRef.current

    const stream = streamRef.current

    if (!video || !stream) {
      console.error('Cámara sin elemento de vídeo o sin flujo', {
        videoDisponible: Boolean(video),
        streamDisponible: Boolean(stream),
        examenQrId,
      })
      return
    }

    video.srcObject = stream

    const iniciarVideo = async () => {
      try {
        await video.play()
      } catch (error) {
        console.error('No se pudo reproducir el vídeo:', error)

        if (examenQrId !== null) {
          setErrorQr('No se pudo reproducir la cámara. Comprueba los permisos.')
        } else {
          setErrorCamara('No se pudo reproducir la cámara. Comprueba los permisos.')
        }
      }
    }

    void iniciarVideo()

    return () => {
      video.srcObject = null
    }
  }, [camaraAbierta, examenQrId])
  const cerrarCamara = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCamaraAbierta(false)
  }

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
  const subirFotografia = async () => {
    if (!usuario?.id || !fotoCapturada) {
      setErrorPerfil('Primero debes tomar una fotografía con la cámara.')
      return
    }

    try {
      setSubiendoFoto(true)
      setErrorPerfil('')
      setMensajePerfil('')
      const respuesta = await estudiantesService.subirFoto(fotoCapturada)
      const completado =
        respuesta.data.primer_acceso_completado === true

      const usuarioActualizado = {
        ...usuario,
        foto_perfil_url: respuesta.data.foto_perfil_url,
        ci: respuesta.data.ci,
        ci_extension: respuesta.data.ci_extension,
        primer_acceso_completado: completado,
      }

      localStorage.setItem('user_data', JSON.stringify(usuarioActualizado))
      setPerfilCompletado(completado)
      setFotoCapturada(null)

      setMensajePerfil(
        completado
          ? 'Fotografía registrada y perfil completado.'
          : 'Fotografía registrada. Guarda tu CI para completar el perfil.',
      )
    } catch (error) {
      console.error('Error al subir la fotografía:', error)
      setErrorPerfil(
        'No se pudo registrar la fotografía. Comprueba la conexión e inténtalo nuevamente.',
      )
    } finally {
      setSubiendoFoto(false)
    }
  }
  const abrirCamaraQr = async (idExamen: string) => {
    setErrorQr('')
    setMensajeQr('')
    setFotoVerificacion(null)
    setExamenQrId(idExamen)

    // Detener cualquier cámara anterior.
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorQr(
        'El navegador no permite acceder a la cámara. Comprueba que estés usando localhost o HTTPS.',
      )
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream

      console.log('Cámara QR abierta:', {
        tracks: stream.getVideoTracks().map((track) => ({
          estado: track.readyState,
          activa: track.enabled,
          configuracion: track.getSettings(),
        })),
      })

      setCamaraAbierta(true)
    } catch (error) {
      console.error('Error al abrir la cámara QR:', error)

      if (error instanceof Error) {
        switch (error.name) {
          case 'NotAllowedError':
          case 'PermissionDeniedError':
            setErrorQr(
              'No tienes permiso para usar la cámara. Habilita el permiso en tu navegador e inténtalo nuevamente.',
            )
            break

          case 'NotFoundError':
          case 'DevicesNotFoundError':
            setErrorQr(
              'No se encontró una cámara disponible en este dispositivo.',
            )
            break

          case 'NotReadableError':
          case 'TrackStartError':
            setErrorQr(
              'No se pudo iniciar la cámara. Puede estar siendo utilizada por otra aplicación. Ciérrala e inténtalo nuevamente.',
            )
            break

          case 'OverconstrainedError':
            setErrorQr(
              'La cámara no admite la configuración solicitada. Comprueba tu dispositivo e inténtalo nuevamente.',
            )
            break

          case 'SecurityError':
            setErrorQr(
              'El navegador bloqueó el acceso a la cámara. Abre la aplicación mediante HTTPS o localhost.',
            )
            break

          default:
            setErrorQr(
              'No se pudo abrir la cámara. Comprueba los permisos del navegador e inténtalo nuevamente.',
            )
        }
      } else {
        setErrorQr(
          'Ocurrió un error al acceder a la cámara. Comprueba los permisos e inténtalo nuevamente.',
        )
      }
    }
  }

  const capturarFotoQr = () => {
    const video = videoQrRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) {
      setErrorQr('No se encontró el vídeo o el área de captura.')
      return
    }

    if (
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setErrorQr('Espera un momento hasta que la cámara esté lista e inténtalo nuevamente.')
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const contexto = canvas.getContext('2d')

    if (!contexto) {
      setErrorQr('No se pudo procesar la fotografía.')
      return
    }

    contexto.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErrorQr('No se pudo capturar la fotografía.')
          return
        }

        const archivo = new File(
          [blob],
          `verificacion-examen-${Date.now()}.jpg`,
          { type: 'image/jpeg' },
        )

        if (archivo.size > 3 * 1024 * 1024) {
          setErrorQr('La fotografía supera los 3 MB permitidos.')
          return
        }

        setFotoVerificacion(archivo)
        setErrorQr('')
        cerrarCamara()
      },
      'image/jpeg',
      0.85,
    )
  }


  const solicitarQr = async () => {
    if (examenQrId === null || !fotoVerificacion) {
      setErrorQr('Primero debes tomar la fotografía de verificación.')
      return
    }

    try {
      setSolicitandoQr(true)
      setErrorQr('')
      setMensajeQr('')

      const respuesta = await estudiantesService.generarTokenQr(
        examenQrId,
        fotoVerificacion,
      )

      console.log('Respuesta de generación QR:', respuesta)

      // Admite la respuesta directa del servicio o la respuesta de Axios.
      const datos = respuesta as unknown as {
        qr_token?: string
        data?: {
          qr_token?: string
          data?: {
            qr_token?: string
          }
        }
      }

      const token =
        datos.data?.data?.qr_token ??
        datos.data?.qr_token ??
        datos.qr_token

      if (!token) {
        console.error('No se encontró qr_token en la respuesta:', respuesta)
        setErrorQr('El servidor no devolvió un token QR válido. Revisa la consola.')
        return
      }

      setQrToken(token)
      setMensajeQr('QR generado correctamente.')
      setFotoVerificacion(null)
      cerrarCamara()
    } catch (error) {
      console.error('Error al solicitar el QR:', error)
      setErrorQr(
        'No se pudo generar el QR. Verifica que estés habilitado para el examen e inténtalo nuevamente.',
      )
    } finally {
      setSolicitandoQr(false)
    }
  }
  const descargarQr = () => {
    const svg = document.querySelector(
      '[data-qr-estudiante="true"]',
    )

    if (!(svg instanceof SVGSVGElement)) {
      setErrorQr('No se encontró el código QR para descargar.')
      return
    }

    const svgCopia = svg.cloneNode(true) as SVGSVGElement
    const contenidoSvg = new XMLSerializer().serializeToString(svgCopia)
    const archivoSvg = new Blob(
      [contenidoSvg],
      { type: 'image/svg+xml;charset=utf-8' },
    )
    const urlSvg = URL.createObjectURL(archivoSvg)
    const imagen = new Image()

    imagen.onload = () => {
      const canvas = document.createElement('canvas')
      const escala = 3

      canvas.width = imagen.width * escala
      canvas.height = imagen.height * escala

      const contexto = canvas.getContext('2d')

      if (!contexto) {
        URL.revokeObjectURL(urlSvg)
        setErrorQr('No se pudo preparar la imagen del QR.')
        return
      }

      contexto.fillStyle = '#FFFFFF'
      contexto.fillRect(0, 0, canvas.width, canvas.height)
      contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height)

      URL.revokeObjectURL(urlSvg)

      canvas.toBlob((blob) => {
        if (!blob) {
          setErrorQr('No se pudo generar la imagen PNG del QR.')
          return
        }

        const urlPng = URL.createObjectURL(blob)
        const enlace = document.createElement('a')

        enlace.href = urlPng
        enlace.download = `QR-examen-${examenQrId}.png`
        enlace.click()

        URL.revokeObjectURL(urlPng)
        setErrorQr('')
      }, 'image/png')
    }

    imagen.onerror = () => {
      URL.revokeObjectURL(urlSvg)
      setErrorQr('No se pudo convertir el QR a imagen.')
    }

    imagen.src = urlSvg
  }
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
                  onChange={(e) => {
                    setCi(e.target.value)
                    setErrorPerfil('')
                  }}
                  required
                  maxLength={20}
                  inputMode="numeric"
                  pattern="[0-9]+"
                  aria-invalid={Boolean(errorPerfil)}
                  aria-describedby={errorPerfil ? 'ci-error' : undefined}
                  placeholder="Ingresa tu CI"
                  className={`w-full rounded-lg border bg-background px-3 py-2 text-sm ${errorPerfil
                    ? 'border-red-500 focus-visible:outline-red-500'
                    : ''
                    }`}
                />

                {errorPerfil && (
                  <p id="ci-error" role="alert" className="text-sm text-red-600">
                    {errorPerfil}
                  </p>
                )}
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
              <div>
                <p className="text-sm font-medium">Fotografía de perfil</p>
                <p className="text-sm text-muted-foreground">
                  Debes tomar la fotografía en vivo. No puedes seleccionar imágenes de tu galería.
                </p>
              </div>

              {!camaraAbierta && (
                <button
                  type="button"
                  onClick={() => void abrirCamara()}
                  className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted"
                >
                  <Camera size={16} />
                  Abrir cámara
                </button>
              )}

              {camaraAbierta && (
                <div className="max-w-md space-y-3">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-xl border bg-black"
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={capturarFotografia}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
                    >
                      <Camera size={16} />
                      Tomar fotografía
                    </button>

                    <button
                      type="button"
                      onClick={cerrarCamara}
                      className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm"
                    >
                      <X size={16} />
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {fotoCapturada && (
                <div className="space-y-3">
                  <p className="text-sm text-green-700">
                    Fotografía capturada correctamente.
                  </p>

                  <button
                    type="button"
                    onClick={() => void subirFotografia()}
                    disabled={subiendoFoto}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                  >
                    <Save size={16} />
                    {subiendoFoto ? 'Registrando...' : 'Registrar fotografía'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFotoCapturada(null)}
                    disabled={subiendoFoto}
                    className="ml-2 rounded-lg border px-4 py-2 text-sm"
                  >
                    Volver a tomar
                  </button>
                </div>
              )}

              {errorCamara && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {errorCamara}
                </p>
              )}
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
            {/* Cambiar contraseña */}
<section className="rounded-2xl border bg-card p-6 shadow-sm">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-primary/10 p-2 text-primary">
        <UserRound size={22} />
      </div>

      <div>
        <h2 className="text-lg font-semibold">Cambiar contraseña</h2>
        <p className="text-sm text-muted-foreground">
          Actualiza tu contraseña para mantener segura tu cuenta.
        </p>
      </div>
    </div>

    <button
      type="button"
      onClick={() => {
        setErrorPassword('')
        setMensajePassword('')
        setModalPasswordAbierto(true)
      }}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
    >
      <Save size={16} />
      Cambiar contraseña
    </button>
  </div>
</section>

{/* Modal para cambiar contraseña */}
{modalPasswordAbierto && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget && !cambiandoPassword) {
        setModalPasswordAbierto(false)
        setErrorPassword('')
        setMensajePassword('')
      }
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-password"
      className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl"
    >
      {/* Encabezado */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <UserRound size={22} />
          </div>

          <div>
            <h2
              id="titulo-modal-password"
              className="text-lg font-semibold"
            >
              Cambiar contraseña
            </h2>

            <p className="text-sm text-muted-foreground">
              Actualiza tu contraseña para mantener segura tu cuenta.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setModalPasswordAbierto(false)
            setErrorPassword('')
            setMensajePassword('')
          }}
          disabled={cambiandoPassword}
          aria-label="Cerrar modal"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </div>

      {/* Formulario */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void cambiarPassword()
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <label
            htmlFor="passwordActual"
            className="text-sm font-medium"
          >
            Contraseña actual
          </label>

          <input
            id="passwordActual"
            type={mostrarPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={passwordActual}
            onChange={(e) => {
              setPasswordActual(e.target.value)
              setErrorPassword('')
              setMensajePassword('')
            }}
            required
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Ingresa tu contraseña actual"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="passwordNueva"
            className="text-sm font-medium"
          >
            Nueva contraseña
          </label>

          <input
            id="passwordNueva"
            type={mostrarPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={passwordNueva}
            onChange={(e) => {
              setPasswordNueva(e.target.value)
              setErrorPassword('')
              setMensajePassword('')
            }}
            minLength={8}
            required
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Mínimo 8 caracteres"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="passwordConfirmacion"
            className="text-sm font-medium"
          >
            Confirmar nueva contraseña
          </label>

          <input
            id="passwordConfirmacion"
            type={mostrarPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={passwordConfirmacion}
            onChange={(e) => {
              setPasswordConfirmacion(e.target.value)
              setErrorPassword('')
              setMensajePassword('')
            }}
            minLength={8}
            required
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Repite la nueva contraseña"
          />
        </div>

        {/* Mostrar contraseñas */}
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mostrarPassword}
            onChange={(e) => setMostrarPassword(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Mostrar contraseñas
        </label>

        {/* Mensajes */}
        {mensajePassword && (
          <p
            role="status"
            className="rounded-lg bg-green-50 p-3 text-sm text-green-800"
          >
            {mensajePassword}
          </p>
        )}

        {errorPassword && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {errorPassword}
          </p>
        )}

        {/* Botones */}
        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => {
              setModalPasswordAbierto(false)
              setErrorPassword('')
              setMensajePassword('')
              setPasswordActual('')
              setPasswordNueva('')
              setPasswordConfirmacion('')
              setMostrarPassword(false)
            }}
            disabled={cambiandoPassword}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={cambiandoPassword}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={16} />
            {cambiandoPassword
              ? 'Cambiando contraseña...'
              : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
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
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${examen.estado === 'Habilitado'
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
                {examen.estado === 'Habilitado' && perfilCompletado && (
                  <div className="mt-5 border-t pt-4">
                    {examenQrId !== examen.id_examen && (
                      <button
                        type="button"
                        onClick={() => void abrirCamaraQr(examen.id_examen)}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                      >
                        <Camera size={16} />
                        Solicitar QR
                      </button>
                    )}
                    {examenQrId === examen.id_examen && (
                      <div className="mt-4 space-y-3">
                        {camaraAbierta && (
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Toma una fotografía en vivo para verificar tu identidad.
                            </p>

                            <div className="space-y-3">
                              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                                <p className="font-semibold">
                                  Recomendaciones para la fotografía
                                </p>
                                <p className="mt-1">
                                  Utiliza un fondo claro, busca buena iluminación y asegúrate
                                  de que tu rostro se vea completo y claramente.
                                </p>
                              </div>


                              <div className="relative w-full max-w-md overflow-hidden rounded-xl border bg-black">
                                <video
                                  ref={videoQrRef}
                                  autoPlay
                                  playsInline
                                  muted
                                  className="w-full h-auto min-h-[240px] max-h-[65dvh] object-cover rounded-xl border bg-black sm:max-w-md"
                                />
                                <svg
                                  viewBox="0 0 320 300"
                                  preserveAspectRatio="xMidYMid meet"
                                  className="pointer-events-none absolute inset-0 h-full w-full"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M160 35
         C118 35 100 69 100 111
         C100 140 111 159 128 173
         L128 188
         C113 199 89 204 66 216
         C45 228 34 250 29 280
         L291 280
         C286 250 275 228 254 216
         C231 204 207 199 192 188
         L192 173
         C209 159 220 140 220 111
         C220 69 202 35 160 35 Z"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>

                                <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-3 py-2 text-xs font-medium text-white">
                                  Centra tu rostro y hombros
                                </div>
                              </div>

                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-2">
                              <button
                                type="button"
                                onClick={capturarFotoQr}
                                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground sm:w-auto"
                              >
                                <Camera size={16} />
                                Capturar verificación
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  cerrarCamara()
                                  setFotoVerificacion(null)
                                  setExamenQrId(null)
                                  setErrorQr('')
                                }}
                                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border px-4 py-3 text-sm sm:w-auto"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        {fotoVerificacion && (
                          <div className="space-y-3">
                            <p className="text-sm text-green-700">
                              Fotografía de verificación capturada.
                            </p>

                            <button
                              type="button"
                              onClick={() => void solicitarQr()}
                              disabled={solicitandoQr}
                              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                            >
                              {solicitandoQr ? 'Generando QR...' : 'Confirmar y generar QR'}
                            </button>

                            <button
                              type="button"
                              onClick={() => void abrirCamaraQr(examen.id_examen)}
                              disabled={solicitandoQr}
                              className="ml-2 rounded-lg border px-4 py-2 text-sm"
                            >
                              Volver a tomar
                            </button>
                          </div>
                        )}

                        {mensajeQr && (
                          <p className="text-sm text-green-700">{mensajeQr}</p>
                        )}

                        {errorQr && (
                          <p role="alert" className="text-sm text-red-700">{errorQr}</p>
                        )}
                        {qrToken && examenQrId === examen.id_examen && (
                          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border p-4">
                            <h3 className="font-semibold">Tu código QR de ingreso</h3>

                            <QRCodeSVG
                              data-qr-estudiante="true"
                              value={qrToken}
                              size={220}
                              level="M"
                              includeMargin
                            />
                            <button
                              type="button"
                              onClick={descargarQr}
                              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                            >
                              Descargar QR
                            </button>
                            <p className="text-center text-sm text-muted-foreground">
                              Presenta este código QR para verificar tu ingreso al examen.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
