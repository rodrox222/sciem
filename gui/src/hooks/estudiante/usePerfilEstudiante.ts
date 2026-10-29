import { useEffect, useState } from 'react'
import { estudiantesService } from '@/services/estudiantes.service'

export interface UsuarioPerfil {
  id: string | number
  nombre?: string
  apellido?: string
  codigo_sis?: string
  foto_perfil_url?: string | null
  primer_acceso_completado?: boolean
  ci?: string | null
  ci_extension?: string | null
}

export function usePerfilEstudiante(usuario: UsuarioPerfil | null) {
  const [ci, setCi] = useState('')
  const [ciExtension, setCiExtension] = useState('')
  const [perfilCompletado, setPerfilCompletado] = useState(false)
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [mensajePerfil, setMensajePerfil] = useState('')
  const [errorPerfil, setErrorPerfil] = useState('')
  const [fotoCapturada, setFotoCapturada] = useState<File | null>(null)

  useEffect(() => {
    setPerfilCompletado(usuario?.primer_acceso_completado === true)
    setCi(usuario?.ci ?? '')
    setCiExtension(usuario?.ci_extension ?? '')
  }, [usuario?.id])

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

      localStorage.setItem(
        'user_data',
        JSON.stringify(usuarioActualizado),
      )

      setMensajePerfil(
        completado
          ? 'Perfil completado correctamente.'
          : 'CI guardado. Ahora debes subir tu fotografía.',
      )
    } catch (error) {
      console.error('Error al guardar el perfil:', error)
      setErrorPerfil(
        'No se pudieron guardar los datos. Verifica el CI e inténtalo nuevamente.',
      )
    } finally {
      setGuardandoPerfil(false)
    }
  }

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

      localStorage.setItem(
        'user_data',
        JSON.stringify(usuarioActualizado),
      )

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

  return {
    ci,
    setCi,
    ciExtension,
    setCiExtension,
    perfilCompletado,
    setPerfilCompletado,
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
  }
}
