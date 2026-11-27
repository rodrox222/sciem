import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import PerfilEstudiante from '@/components/estudiante-dashboard/perfil/PerfilEstudiante'
import {
  usePerfilEstudiante,
  type UsuarioPerfil,
} from '@/hooks/estudiante/usePerfilEstudiante'

export default function PrimerAccesoPage() {
  const [camaraAbierta, setCamaraAbierta] = useState(false)
  const [errorCamara, setErrorCamara] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const usuario: UsuarioPerfil | null = (() => {
    try {
      const guardado = localStorage.getItem('user_data')
      return guardado ? JSON.parse(guardado) : null
    } catch {
      return null
    }
  })()

  const {
    ci,
    setCi,
    ciExtension,
    setCiExtension,
    perfilCompletado,
    guardandoPerfil,
    errorFoto,
    errorCi,
    errorExtension,
    guardarTodoElPerfil,
    fotoCapturada,
    setFotoCapturada,
  } = usePerfilEstudiante(usuario)

  const abrirCamara = async () => {
    setErrorCamara('')
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
    } catch (err) {
      console.error('Error al abrir la cámara:', err)
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

    void video.play().catch((err) => {
      console.error('No se pudo reproducir la cámara:', err)
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

  if (perfilCompletado) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PerfilEstudiante
        ci={ci}
        ciExtension={ciExtension}
        errorCi={errorCi}
        errorExtension={errorExtension}
        errorFoto={errorFoto}
        guardandoPerfil={guardandoPerfil}
        camaraAbierta={camaraAbierta}
        fotoCapturada={fotoCapturada}
        errorCamara={errorCamara}
        videoRef={videoRef}
        canvasRef={canvasRef}
        onCiChange={setCi}
        onCiExtensionChange={setCiExtension}
        onGuardarTodo={guardarTodoElPerfil}
        onAbrirCamara={abrirCamara}
        onCapturarFotografia={capturarFotografia}
        onCerrarCamara={cerrarCamara}
        onDescartarFotografia={() => setFotoCapturada(null)}
      />
    </div>
  )
}
