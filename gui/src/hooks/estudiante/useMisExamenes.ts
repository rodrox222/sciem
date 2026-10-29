import { useCallback, useEffect, useState } from 'react'
import { estudiantesService } from '@/services/estudiantes.service'
import type { ExamenEstudiante } from '@/services/estudiantes.service'

interface UseMisExamenesOptions {
  usuarioId: string | number | undefined
}

export function useMisExamenes({ usuarioId }: UseMisExamenesOptions) {
  const [examenes, setExamenes] = useState<ExamenEstudiante[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargarExamenes = useCallback(async () => {
    if (!usuarioId) {
      setError('No se encontró la información del estudiante autenticado.')
      setExamenes([])
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
  }, [usuarioId])

  useEffect(() => {
    void cargarExamenes()
  }, [cargarExamenes])

  return {
    examenes,
    cargando,
    error,
    cargarExamenes,
  }
}