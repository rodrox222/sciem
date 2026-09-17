import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export interface Estudiante {
  id: number
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  codigoSis: string
  ci: string
  correo?: string
  estado: 'Activo' | 'Inactivo'
}

interface EstudianteFormModalProps {
  open: boolean
  estudiante?: Estudiante | null
  onClose: () => void
  onSave: (estudiante: Estudiante) => void
}

interface FormData {
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  codigoSis: string
  ci: string
  correo: string
}

interface FormErrors {
  nombre?: string
  apellidoPaterno?: string
  apellidoMaterno?: string
  codigoSis?: string
  ci?: string
  correo?: string
}
const formularioInicial: FormData = {
  nombre: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  codigoSis: '',
  ci: '',
  correo: '',
}

export function EstudianteFormModal({
  open,
  estudiante,
  onClose,
  onSave,
}: EstudianteFormModalProps) {
  const [formData, setFormData] = useState<FormData>(formularioInicial)
  const [errors, setErrors] = useState<FormErrors>({})

  const modoEdicion = Boolean(estudiante)

  useEffect(() => {
    if (!open) {
      return
    }

    if (estudiante) {
      setFormData({
        nombre: estudiante.nombre,
        apellidoPaterno: estudiante.apellidoPaterno,
        apellidoMaterno: estudiante.apellidoMaterno,
        codigoSis: estudiante.codigoSis,
        ci: estudiante.ci,
        correo: estudiante.correo ?? '',
      })
    } else {
      setFormData(formularioInicial)
    }

    setErrors({})
  }, [open, estudiante])

  if (!open) {
    return null
  }

  const actualizarCampo = (campo: keyof FormData, valor: string) => {
    setFormData((actual) => ({
      ...actual,
      [campo]: valor,
    }))

    setErrors((actual) => ({
      ...actual,
      [campo]: undefined,
    }))
  }

  const validarFormulario = (): boolean => {
    const nuevosErrores: FormErrors = {}

    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio.'
    }

    if (!formData.apellidoPaterno.trim()) {
      nuevosErrores.apellidoPaterno =
        'El apellido paterno es obligatorio.'
    }

    if (!formData.codigoSis.trim()) {
      nuevosErrores.codigoSis =
        'El código SIS es obligatorio.'
    }

    if (!formData.ci.trim()) {
      nuevosErrores.ci =
        'El carnet de identidad es obligatorio.'
    } else if (!/^\d+[A-Za-z]?$/.test(formData.ci.trim())) {
      nuevosErrores.ci =
        'El CI debe contener números y opcionalmente una sola letra al final.'
    }

    if (formData.correo.trim()) {
      const correoValido =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo.trim())

      if (!correoValido) {
        nuevosErrores.correo =
          'Ingresa un correo electrónico válido.'
      }
    }

    setErrors(nuevosErrores)

    return Object.keys(nuevosErrores).length === 0
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!validarFormulario()) {
      return
    }

    const estudianteGuardado: Estudiante = {
      id: estudiante?.id ?? Date.now(),
      nombre: formData.nombre.trim(),
      apellidoPaterno: formData.apellidoPaterno.trim(),
      apellidoMaterno: formData.apellidoMaterno.trim(),
      codigoSis: formData.codigoSis.trim(),
      ci: formData.ci.trim(),
      correo: formData.correo.trim() || undefined,
      estado: estudiante?.estado ?? 'Activo',
    }

    onSave(estudianteGuardado)
  }

  const inputClass = (campo: keyof FormErrors) =>
    `w-full min-h-[44px] rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition ${
      errors[campo]
        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
        : 'border-slate-300 focus:border-[#003770] focus:ring-2 focus:ring-blue-100'
    }`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="estudiante-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Encabezado */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#E30613]">
              Gestión de estudiantes
            </p>

            <h2
              id="estudiante-modal-title"
              className="mt-1 text-xl font-bold text-[#003770]"
            >
              {modoEdicion
                ? 'Editar estudiante'
                : 'Registrar estudiante'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            aria-label="Cerrar formulario"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5 px-5 py-5 sm:px-6">
            {/* Nombre */}
            <div>
              <label
                htmlFor="estudiante-nombre"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Nombre <span className="text-[#E30613]">*</span>
              </label>

              <input
                id="estudiante-nombre"
                type="text"
                value={formData.nombre}
                onChange={(event) =>
                  actualizarCampo('nombre', event.target.value)
                }
                className={inputClass('nombre')}
                placeholder="Ej. Juan"
                autoComplete="given-name"
              />

              {errors.nombre && (
                <p className="mt-1 text-sm text-[#E30613]">
                  {errors.nombre}
                </p>
              )}
            </div>

            {/* Apellidos */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="estudiante-apellido-paterno"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Apellido paterno{' '}
                  <span className="text-[#E30613]">*</span>
                </label>

                <input
                  id="estudiante-apellido-paterno"
                  type="text"
                  value={formData.apellidoPaterno}
                  onChange={(event) =>
                    actualizarCampo(
                      'apellidoPaterno',
                      event.target.value,
                    )
                  }
                  className={inputClass('apellidoPaterno')}
                  placeholder="Ej. Pérez"
                  autoComplete="family-name"
                />

                {errors.apellidoPaterno && (
                  <p className="mt-1 text-sm text-[#E30613]">
                    {errors.apellidoPaterno}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="estudiante-apellido-materno"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Apellido materno
                </label>

                <input
                  id="estudiante-apellido-materno"
                  type="text"
                  value={formData.apellidoMaterno}
                  onChange={(event) =>
                    actualizarCampo(
                      'apellidoMaterno',
                      event.target.value,
                    )
                  }
                  className={inputClass('apellidoMaterno')}
                  placeholder="Ej. Mamani"
                />
              </div>
            </div>

            {/* Código SIS y CI */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="estudiante-codigo-sis"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Código SIS <span className="text-[#E30613]">*</span>
                </label>

                <input
                  id="estudiante-codigo-sis"
                  type="text"
                  value={formData.codigoSis}
                  onChange={(event) =>
                    actualizarCampo(
                      'codigoSis',
                      event.target.value,
                    )
                  }
                  className={inputClass('codigoSis')}
                  placeholder="Ej. 202312345"
                  inputMode="numeric"
                />

                {errors.codigoSis && (
                  <p className="mt-1 text-sm text-[#E30613]">
                    {errors.codigoSis}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="estudiante-ci"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Carnet de identidad{' '}
                  <span className="text-[#E30613]">*</span>
                </label>

                <input
                  id="estudiante-ci"
                  type="text"
                  value={formData.ci}
                  onChange={(event) =>
                    actualizarCampo('ci', event.target.value)
                  }
                  className={inputClass('ci')}
                  placeholder="Ej. 8234567 o 8234567A"
                  autoCapitalize="characters"
                />

                {errors.ci ? (
                  <p className="mt-1 text-sm text-[#E30613]">
                    {errors.ci}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    Puede contener números y una sola letra al final.
                  </p>
                )}
              </div>
            </div>

            {/* Correo */}
            <div>
              <label
                htmlFor="estudiante-correo"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Correo electrónico{' '}
                <span className="font-normal text-slate-400">
                  (opcional)
                </span>
              </label>

              <input
                id="estudiante-correo"
                type="email"
                value={formData.correo}
                onChange={(event) =>
                  actualizarCampo('correo', event.target.value)
                }
                className={inputClass('correo')}
                placeholder="Ej. estudiante@correo.com"
                autoComplete="email"
              />

              {errors.correo && (
                <p className="mt-1 text-sm text-[#E30613]">
                  {errors.correo}
                </p>
              )}
            </div>

            {/* Nota */}
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-[#003770]">
                  Nota:
                </span>{' '}
                Los campos marcados con <span className="text-[#E30613]">*</span>{' '}
                son obligatorios.
              </p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition sm:w-auto"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="min-h-[44px] w-full rounded-lg bg-[#003770] px-5 py-3 text-sm font-semibold text-white hover:bg-[#002b5b] transition sm:w-auto"
            >
              {modoEdicion
                ? 'Guardar cambios'
                : 'Registrar estudiante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
