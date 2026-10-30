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

function extraerErroresBackend(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const err = error as {
      response?: { data?: { message?: string; errors?: Record<string, string[]> } }
      data?: { message?: string; errors?: Record<string, string[]> }
      message?: string
    }
    const payload = err.response?.data || err.data
    return {
      message: payload?.message || err.message || 'Error al guardar el perfil.',
      errors: payload?.errors || {},
    }
  }
  return { message: 'Error de conexión con el servidor.', errors: {} }
}

export function usePerfilEstudiante(usuario: UsuarioPerfil | null) {
  const [ci, setCi] = useState('')
  const [ciExtension, setCiExtension] = useState('')
  const [perfilCompletado, setPerfilCompletado] = useState(false)
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)

  // Errores individuales por campo
  const [errorCi, setErrorCi] = useState('')
  const [errorExtension, setErrorExtension] = useState('')
  const [errorFoto, setErrorFoto] = useState('')
  const [fotoCapturada, setFotoCapturada] = useState<File | null>(null)

  useEffect(() => {
    setPerfilCompletado(Boolean(usuario?.primer_acceso_completado))
    setCi(usuario?.ci ?? '')
    setCiExtension(usuario?.ci_extension ?? '')
  }, [usuario?.id, usuario?.primer_acceso_completado])

  const guardarTodoElPerfil = async () => {
    setErrorCi('')
    setErrorExtension('')
    setErrorFoto('')

    let hayErrores = false

    // Validación preliminar del CI
    if (!ci.trim()) {
      setErrorCi('El número de carnet de identidad es obligatorio.')
      hayErrores = true
    } else if (!/^[0-9]{5,10}$/.test(ci.trim())) {
      setErrorCi('El CI debe contener entre 5 y 10 dígitos numéricos.')
      hayErrores = true
    }

    // Validación preliminar de Extensión
    if (ciExtension.trim() && !/^[a-zA-Z0-9]{1,5}$/.test(ciExtension.trim())) {
      setErrorExtension('El complemento debe ser alfanumérico (máximo 5 caracteres).')
      hayErrores = true
    }

    // Validación preliminar de Fotografía
    if (!usuario?.foto_perfil_url && !fotoCapturada) {
      setErrorFoto('Es obligatorio capturar una fotografía en vivo antes de guardar.')
      hayErrores = true
    }

    if (hayErrores) return

    try {
      setGuardandoPerfil(true)

      // PASO 1: Guardar CI primero. Si falla aquí, se aborta y la foto NUNCA se sube
      const resCi = await estudiantesService.completarDatos({
        ci: ci.trim(),
        ci_extension: ciExtension.trim() ? ciExtension.trim().toUpperCase() : null,
      })

      // PASO 2: Solo si el CI fue aceptado, subimos la foto
      let nuevaFotoUrl = usuario?.foto_perfil_url ?? null
      if (fotoCapturada) {
        const resFoto = await estudiantesService.subirFoto(fotoCapturada)
        nuevaFotoUrl = resFoto.data.foto_perfil_url
      }

      // PASO 3: Guardar el objeto actualizado en localStorage
      const usuarioActualizado = {
        ...usuario,
        ci: resCi.data.ci,
        ci_extension: resCi.data.ci_extension,
        foto_perfil_url: nuevaFotoUrl,
        primer_acceso_completado: true,
      }

      localStorage.setItem('user_data', JSON.stringify(usuarioActualizado))
      setPerfilCompletado(true)
    } catch (error) {
      const { message, errors } = extraerErroresBackend(error)

      // Mapear cada error del backend exactamente debajo de su input correspondiente
      if (errors.ci?.[0]) {
        setErrorCi(errors.ci[0])
      }
      if (errors.ci_extension?.[0]) {
        setErrorExtension(errors.ci_extension[0])
      }
      if (errors.foto?.[0]) {
        setErrorFoto(errors.foto[0])
      }

      if (!errors.ci && !errors.ci_extension && !errors.foto) {
        // Fallback si vino un mensaje de error plano
        if (message.toLowerCase().includes('extensión') || message.toLowerCase().includes('complemento')) {
          setErrorExtension(message)
        } else if (message.toLowerCase().includes('ci') || message.toLowerCase().includes('carnet')) {
          setErrorCi(message)
        } else {
          setErrorFoto(message)
        }
      }
    } finally {
      setGuardandoPerfil(false)
    }
  }

  return {
    ci,
    setCi: (v: string) => {
      setCi(v)
      if (errorCi) setErrorCi('')
    },
    ciExtension,
    setCiExtension: (v: string) => {
      setCiExtension(v)
      if (errorExtension) setErrorExtension('')
    },
    perfilCompletado,
    guardandoPerfil,
    errorCi,
    errorExtension,
    errorFoto,
    fotoCapturada,
    setFotoCapturada,
    guardarTodoElPerfil,
  }
}