import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock3,
  MapPin,
  UserRound,
  CheckCircle2,
  FileText,
  QrCode,
  RefreshCw,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SolicitudQr from '@/components/estudiante-dashboard/examenes/SolicitudQr'
import CodigoQrEstudiante from '@/components/estudiante-dashboard/examenes/CodigoQrEstudiante'

import { useMisExamenes } from '@/hooks/estudiante/useMisExamenes'
import { estudiantesService } from '@/services/estudiantes.service'
import { examenesService } from '@/services/examenes.service'

type UsuarioEstudiante = {
  id?: string | number
  primer_acceso_completado?: boolean
}

type Prerrequisito = {
  id: string
  titulo: string
  descripcion?: string | null
}

export default function EstudianteDetalleExamenPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

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
  } = useMisExamenes({ usuarioId: usuario?.id })

  const examen = examenes.find(
    (item) => String(item.id_examen) === String(id),
  )

  const [pestana, setPestana] = useState<'ficha' | 'qr'>('ficha')
  const [prerrequisitos, setPrerrequisitos] = useState<Prerrequisito[]>([])
  const [cargandoPrerrequisitos, setCargandoPrerrequisitos] = useState(false)
  const [errorPrerrequisitos, setErrorPrerrequisitos] = useState('')

  // Estados exclusivos para la cámara y la solicitud del QR.
  const [camaraAbierta, setCamaraAbierta] = useState(false)
  const [solicitandoQr, setSolicitandoQr] = useState(false)
  const [errorQr, setErrorQr] = useState('')
  const [mensajeQr, setMensajeQr] = useState('')
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [fotoVerificacion, setFotoVerificacion] = useState<File | null>(null)

  const videoQrRef = useRef<HTMLVideoElement>(null)
  const canvasQrRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const cerrarCamara = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoQrRef.current) {
      videoQrRef.current.srcObject = null
    }

    setCamaraAbierta(false)
  }, [])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    if (!camaraAbierta) return

    const video = videoQrRef.current
    const stream = streamRef.current

    if (!video || !stream) return

    video.srcObject = stream

    void video.play().catch((error) => {
      console.error('No se pudo reproducir el vídeo:', error)
      setErrorQr('No se pudo reproducir la cámara. Comprueba los permisos.')
    })

    return () => {
      video.srcObject = null
    }
  }, [camaraAbierta])

  const abrirCamaraQr = async () => {
    setErrorQr('')
    setMensajeQr('')
    setFotoVerificacion(null)

    cerrarCamara()

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorQr(
        'El navegador no permite acceder a la cámara. Utiliza HTTPS o localhost.',
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
      setCamaraAbierta(true)
    } catch (error) {
      console.error('Error al abrir la cámara QR:', error)

      const nombreError = error instanceof Error ? error.name : ''

      switch (nombreError) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          setErrorQr(
            'No tienes permiso para usar la cámara. Habilita el permiso en tu navegador.',
          )
          break

        case 'NotFoundError':
        case 'DevicesNotFoundError':
          setErrorQr('No se encontró una cámara disponible en este dispositivo.')
          break

        case 'NotReadableError':
        case 'TrackStartError':
          setErrorQr(
            'No se pudo iniciar la cámara. Comprueba que no esté siendo utilizada por otra aplicación.',
          )
          break

        case 'OverconstrainedError':
          setErrorQr('La cámara no admite la configuración solicitada.')
          break

        case 'SecurityError':
          setErrorQr('Abre la aplicación mediante HTTPS o localhost.')
          break

        default:
          setErrorQr(
            'No se pudo abrir la cámara. Comprueba los permisos e inténtalo nuevamente.',
          )
      }
    }
  }

  const capturarFotoQr = () => {
    const video = videoQrRef.current
    const canvas = canvasQrRef.current

    if (!video || !canvas) {
      setErrorQr('No se encontró el vídeo o el área de captura.')
      return
    }

    if (
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setErrorQr(
        'Espera un momento hasta que la cámara esté lista e inténtalo nuevamente.',
      )
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
    if (!id || !fotoVerificacion) {
      setErrorQr('Primero debes tomar la fotografía de verificación.')
      return
    }

    try {
      setSolicitandoQr(true)
      setErrorQr('')
      setMensajeQr('')

      const respuesta = await estudiantesService.generarTokenQr(
        id,
        fotoVerificacion,
      )

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
        setErrorQr('El servidor no devolvió un token QR válido.')
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
    const svg = document.querySelector('[data-qr-estudiante="true"]')

    if (!(svg instanceof SVGSVGElement)) {
      setErrorQr('No se encontró el código QR para descargar.')
      return
    }

    const svgCopia = svg.cloneNode(true) as SVGSVGElement
    const contenidoSvg = new XMLSerializer().serializeToString(svgCopia)
    const archivoSvg = new Blob([contenidoSvg], {
      type: 'image/svg+xml;charset=utf-8',
    })
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
        enlace.download = `QR-examen-${id}.png`
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

  useEffect(() => {
    if (!id) return

    let cancelado = false

    const cargarPrerrequisitos = async () => {
      try {
        setCargandoPrerrequisitos(true)
        setErrorPrerrequisitos('')

        const respuesta = await examenesService.listPrerrequisitos(id)

        if (cancelado) return

        // Admite una respuesta directa o una respuesta de Axios.
        const datos = respuesta as unknown as
          | Prerrequisito[]
          | { data: Prerrequisito[] }

        const lista = Array.isArray(datos) ? datos : datos.data

        setPrerrequisitos(Array.isArray(lista) ? lista : [])
      } catch (error) {
        console.error('Error al cargar los prerrequisitos:', error)

        if (!cancelado) {
          setErrorPrerrequisitos(
            'No se pudieron cargar los prerrequisitos. Es posible que este recurso no esté disponible para estudiantes.',
          )
        }
      } finally {
        if (!cancelado) setCargandoPrerrequisitos(false)
      }
    }

    void cargarPrerrequisitos()

    return () => {
      cancelado = true
    }
  }, [id])

  if (cargando) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 p-6 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin" />
        Cargando información del examen...
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
        <Button variant="outline" onClick={() => void cargarExamenes()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
        <Button variant="ghost" onClick={() => navigate('/estudiante')}>
          Volver a mis exámenes
        </Button>
      </div>
    )
  }

  if (!examen) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-muted-foreground">
          No se encontró el examen solicitado entre tus exámenes.
        </p>
        <Button variant="outline" onClick={() => navigate('/estudiante')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a mis exámenes
        </Button>
      </div>
    )
  }

  const fecha = examen.fecha?.slice(0, 10) ?? ''
  const [anio, mes, dia] = fecha.split('-')
  const fechaFormateada =
    anio && mes && dia ? `${dia}/${mes}/${anio}` : examen.fecha
  const horario = [examen.hora_ini, examen.hora_fin].filter(Boolean).join(' - ')
  const habilitado = examen.estado === 'Habilitado'

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      <Button
        variant="ghost"
        className="-ml-3"
        onClick={() => navigate('/estudiante')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a mis exámenes
      </Button>

      <Card className="overflow-hidden rounded-2xl">
        <div className="h-1.5 bg-sci-blue" />

        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <BookOpen className="h-4 w-4" />
              Detalle del examen
            </span>

            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                habilitado
                  ? 'bg-green-100 text-green-800'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {examen.estado}
            </span>
          </div>

          <CardTitle className="text-2xl font-bold md:text-3xl">
            {examen.nombre}
          </CardTitle>

          <p className="text-muted-foreground">
            {examen.materia || 'Materia no especificada'}
          </p>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex gap-3 rounded-xl border p-4">
            <CalendarDays className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Fecha</p>
              <p className="font-medium">{fechaFormateada}</p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border p-4">
            <Clock3 className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Horario</p>
              <p className="font-medium">{horario || 'No especificado'}</p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border p-4">
            <MapPin className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Aula</p>
              <p className="font-medium">{examen.aula || 'No asignada'}</p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border p-4">
            <UserRound className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Docente</p>
              <p className="font-medium">{examen.docente || 'No especificado'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 border-b pb-3">
        <Button
          variant={pestana === 'ficha' ? 'default' : 'outline'}
          onClick={() => setPestana('ficha')}
        >
          <FileText className="mr-2 h-4 w-4" />
          Ficha técnica
        </Button>

        <Button
          variant={pestana === 'qr' ? 'default' : 'outline'}
          onClick={() => setPestana('qr')}
        >
          <QrCode className="mr-2 h-4 w-4" />
          Solicitar QR
        </Button>
      </div>

      {pestana === 'ficha' && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Prerrequisitos del examen</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {cargandoPrerrequisitos ? (
              <p className="text-sm text-muted-foreground">
                Cargando prerrequisitos...
              </p>
            ) : errorPrerrequisitos ? (
              <p role="alert" className="text-sm text-destructive">
                {errorPrerrequisitos}
              </p>
            ) : prerrequisitos.length > 0 ? (
              prerrequisitos.map((prerrequisito) => (
                <div
                  key={prerrequisito.id}
                  className="flex gap-3 rounded-xl border p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <h3 className="font-medium">{prerrequisito.titulo}</h3>
                    {prerrequisito.descripcion && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {prerrequisito.descripcion}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Este examen no tiene prerrequisitos registrados.
              </p>
            )}

            {examen.motivo_estado && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Motivo del estado</p>
                <p className="mt-1">{examen.motivo_estado}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {pestana === 'qr' && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Solicitud del código QR</CardTitle>
            <p className="text-sm text-muted-foreground">
              Toma una fotografía de verificación para solicitar tu código de ingreso.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {!habilitado ? (
              <div className="rounded-xl border bg-muted/40 p-4 text-sm">
                No puedes solicitar el QR porque tu estado actual es{' '}
                <strong>{examen.estado}</strong>.
                {examen.motivo_estado && (
                  <p className="mt-2">{examen.motivo_estado}</p>
                )}
              </div>
            ) : !perfilCompletadoPlaceholder(usuario) ? (
              <p className="rounded-xl border p-4 text-sm text-muted-foreground">
                Si no has completado tu perfil, vuelve al panel de estudiante y completa tus datos antes de solicitar el QR.
              </p>
            ) : (
              <>
                {!camaraAbierta && !fotoVerificacion && !qrToken && (
                  <Button onClick={() => void abrirCamaraQr()}>
                    <QrCode className="mr-2 h-4 w-4" />
                    Abrir cámara y solicitar QR
                  </Button>
                )}

                {(camaraAbierta || fotoVerificacion) && (
                  <SolicitudQr
                    camaraAbierta={camaraAbierta}
                    fotoVerificacion={fotoVerificacion}
                    solicitandoQr={solicitandoQr}
                    errorQr={errorQr}
                    mensajeQr={mensajeQr}
                    videoRef={videoQrRef}
                    onAbrirCamara={() => void abrirCamaraQr()}
                    onCapturarFoto={capturarFotoQr}
                    onCancelar={() => {
                      cerrarCamara()
                      setFotoVerificacion(null)
                      setErrorQr('')
                      setMensajeQr('')
                      setQrToken(null)
                    }}
                    onSolicitarQr={solicitarQr}
                    onVolverATomar={() => void abrirCamaraQr()}
                  />
                )}

                {qrToken && (
                  <CodigoQrEstudiante
                    qrToken={qrToken}
                    onDescargarQr={descargarQr}
                  />
                )}

                {errorQr && (
                  <p role="alert" className="text-sm text-destructive">
                    {errorQr}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <canvas ref={canvasQrRef} className="hidden" />
    </div>
  )
}
function perfilCompletadoPlaceholder(usuario: UsuarioEstudiante | null) {
  return usuario?.primer_acceso_completado === true
}