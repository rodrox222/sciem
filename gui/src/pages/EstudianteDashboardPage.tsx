import { useEffect, useRef, useState } from 'react'
import CambiarPasswordDialog from '@/components/estudiante-dashboard/seguridad/CambiarPasswordDialog'
import PerfilEstudiante from '@/components/estudiante-dashboard/perfil/PerfilEstudiante'
import MisExamenes from '@/components/estudiante-dashboard/examenes/MisExamenes'
import ExamenEstudianteCard from '@/components/estudiante-dashboard/examenes/ExamenEstudianteCard'
import SolicitudQr from '@/components/estudiante-dashboard/examenes/SolicitudQr'
import CodigoQrEstudiante from '@/components/estudiante-dashboard/examenes/CodigoQrEstudiante'
import { useMisExamenes } from '@/hooks/estudiante/useMisExamenes'
import { usePerfilEstudiante } from '@/hooks/estudiante/usePerfilEstudiante'
import type { UsuarioPerfil } from '@/hooks/estudiante/usePerfilEstudiante'
import {
  UserRound,
} from 'lucide-react'
import { estudiantesService } from '@/services/estudiantes.service'
type UsuarioEstudiante = UsuarioPerfil
export default function EstudianteDashboardPage() {
  const [camaraAbierta, setCamaraAbierta] = useState(false)
  const [errorCamara, setErrorCamara] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoQrRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
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
  const {
  examenes,
  cargando,
  error,
  cargarExamenes,
} = useMisExamenes({
  usuarioId: usuario?.id,
})
const perfil = usePerfilEstudiante(usuario)

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
  console.error('Error al capturar la fotografía QR:', {
    videoDisponible: Boolean(video),
    canvasDisponible: Boolean(canvas),
    videoQrRef: videoQrRef.current,
    canvasRef: canvasRef.current,
  })

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
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {examenes.map((examen) => (
      <ExamenEstudianteCard
        key={examen.id_examen}
        examen={examen}
      >
        {examen.estado === 'Habilitado' && perfilCompletado && (
          <div className="mt-5">
            {examenQrId !== examen.id_examen ? (
              <button
                type="button"
                onClick={() => void abrirCamaraQr(examen.id_examen)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Solicitar QR
              </button>
            ) : (
              <div className="space-y-3">
                <SolicitudQr
                  camaraAbierta={camaraAbierta}
                  fotoVerificacion={fotoVerificacion}
                  solicitandoQr={solicitandoQr}
                  errorQr={errorQr}
                  mensajeQr={mensajeQr}
                  videoRef={videoQrRef}
                  onAbrirCamara={() =>
                    void abrirCamaraQr(examen.id_examen)
                  }
                  onCapturarFoto={capturarFotoQr}
                  onCancelar={() => {
                    cerrarCamara()
                    setFotoVerificacion(null)
                    setExamenQrId(null)
                    setErrorQr('')
                    setMensajeQr('')
                    setQrToken(null)
                  }}
                  onSolicitarQr={solicitarQr}
                  onVolverATomar={() =>
                    void abrirCamaraQr(examen.id_examen)
                  }
                />

                {qrToken && (
                  <CodigoQrEstudiante
                    qrToken={qrToken}
                    onDescargarQr={descargarQr}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </ExamenEstudianteCard>
    ))}
  </div>
</MisExamenes>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
