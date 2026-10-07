import { useEffect, useState, type FormEvent } from 'react'
import { Check, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type {
  Rol,
  Usuario,
  UsuarioPayload,
} from '@/services/usuarios.service'

interface FormularioUsuario {
  nombre: string
  apellido_paterno: string
  apellido_materno: string
  ci: string
  ci_extension: string
  email: string
  password: string
  tipo_usuario: string
}

interface UsuarioFormModalProps {
  open: boolean
  modoEdicion: boolean
  usuario: Usuario | null
  roles: Rol[]
  cargandoRoles: boolean
  guardando: boolean
  error: string
  resultado: string
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: UsuarioPayload) => Promise<void>
}

const formularioInicial: FormularioUsuario = {
  nombre: '',
  apellido_paterno: '',
  apellido_materno: '',
  ci: '',
  ci_extension: '',
  email: '',
  password: '',
  tipo_usuario: '',
}

export function UsuarioFormModal({
  open,
  modoEdicion,
  usuario,
  roles,
  cargandoRoles,
  guardando,
  error,
  resultado,
  onOpenChange,
  onSubmit,
}: UsuarioFormModalProps) {
  const [formulario, setFormulario] =
    useState<FormularioUsuario>(formularioInicial)

  const [errores, setErrores] =
    useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return

    if (modoEdicion && usuario) {
      setFormulario({
        nombre: usuario.nombre || '',
        apellido_paterno: usuario.apellido_paterno || '',
        apellido_materno: usuario.apellido_materno || '',
        ci: usuario.ci || '',
        ci_extension: usuario.ci_extension || '',
        email: usuario.email || '',
        password: '',
        tipo_usuario: usuario.tipo_usuario || '',
      })
    } else {
      setFormulario(formularioInicial)
    }

    setErrores({})
  }, [open, modoEdicion, usuario])

  const actualizarCampo = (
    campo: keyof FormularioUsuario,
    valor: string,
  ) => {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
      ...(campo === 'tipo_usuario' && valor === 'admin'
        ? { email: '' }
        : {}),
    }))

    if (errores[campo] || errores.general) {
      setErrores((anterior) => {
        const nuevos = { ...anterior }
        delete nuevos[campo]
        delete nuevos.general
        return nuevos
      })
    }
  }

  const validarFormulario = () => {
    const nuevosErrores: Record<string, string> = {}

    if (!formulario.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio.'
    }

    if (!formulario.apellido_paterno.trim()) {
      nuevosErrores.apellido_paterno =
        'El apellido paterno es obligatorio.'
    }

    if (!formulario.ci.trim()) {
      nuevosErrores.ci = 'El CI es obligatorio.'
    }

    if (formulario.tipo_usuario !== 'admin') {
      if (!formulario.email.trim()) {
        nuevosErrores.email = 'El correo es obligatorio.'
      } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulario.email)
      ) {
        nuevosErrores.email = 'Ingrese un correo válido.'
      }
    }

    if (!modoEdicion) {
      if (!formulario.password) {
        nuevosErrores.password =
          'La contraseña es obligatoria.'
      } else if (formulario.password.length < 8) {
        nuevosErrores.password =
          'La contraseña debe tener al menos 8 caracteres.'
      }
    } else if (
      formulario.password &&
      formulario.password.length < 8
    ) {
      nuevosErrores.password =
        'La contraseña debe tener al menos 8 caracteres.'
    }

    if (!formulario.tipo_usuario) {
      nuevosErrores.tipo_usuario = 'Seleccione un rol.'
    }

    setErrores(nuevosErrores)

    return Object.keys(nuevosErrores).length === 0
  }

  const manejarSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault()

    if (!validarFormulario()) return

    const payload: UsuarioPayload = {
      nombre: formulario.nombre.trim(),
      apellido_paterno: formulario.apellido_paterno.trim(),
      apellido_materno:
        formulario.apellido_materno.trim() || null,
      ci: formulario.ci.trim(),
      ci_extension:
        formulario.ci_extension.trim() || null,
      tipo_usuario: formulario.tipo_usuario,
      ...(formulario.tipo_usuario !== 'admin'
        ? { email: formulario.email.trim() }
        : {}),
      ...(formulario.password
        ? { password: formulario.password }
        : {}),
    }

    try {
      await onSubmit(payload)
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el usuario.'

      setErrores((anterior) => ({
        ...anterior,
        general: mensaje,
      }))
    }
  }

  const manejarCierre = (abierto: boolean) => {
    if (!abierto && guardando) return

    onOpenChange(abierto)
  }

  return (
    <Dialog open={open} onOpenChange={manejarCierre}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {resultado ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-sci-navy">
                Operación completada
              </DialogTitle>

              <DialogDescription className="text-center">
                {resultado}
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Check className="h-7 w-7" />
              </div>

              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="mt-6 cursor-pointer bg-sci-blue font-semibold text-white hover:opacity-90"
              >
                Aceptar
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between pr-8">
                <div>
                  <DialogTitle className="text-xl font-bold text-sci-navy">
                    {modoEdicion
                      ? 'Editar usuario'
                      : 'Nuevo usuario'}
                  </DialogTitle>

                  <DialogDescription className="mt-0.5 text-xs">
                    {modoEdicion
                      ? 'Modifica los datos y el rol del usuario.'
                      : 'Registra una nueva cuenta institucional en el sistema SCI.'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form
              onSubmit={manejarSubmit}
              className="space-y-4"
            >
              {error && (
                <div className="rounded-xl border border-sci-red/20 bg-sci-red/10 px-4 py-3 text-xs font-semibold text-sci-red">
                  {error}
                </div>
              )}

              {errores.general && (
                <div className="rounded-xl border border-sci-red/20 bg-sci-red/10 px-4 py-3 text-xs font-semibold text-sci-red">
                  {errores.general}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-xs font-semibold">
                    Nombre *
                  </Label>

                  <Input
                    type="text"
                    value={formulario.nombre}
                    onChange={(e) =>
                      actualizarCampo(
                        'nombre',
                        e.target.value,
                      )
                    }
                    placeholder="Ej. Juan"
                    className={
                      errores.nombre
                        ? 'border-sci-red'
                        : ''
                    }
                  />

                  {errores.nombre && (
                    <p className="mt-1 text-xs text-sci-red">
                      {errores.nombre}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="mb-1.5 block text-xs font-semibold">
                    Apellido paterno *
                  </Label>

                  <Input
                    type="text"
                    value={formulario.apellido_paterno}
                    onChange={(e) =>
                      actualizarCampo(
                        'apellido_paterno',
                        e.target.value,
                      )
                    }
                    placeholder="Ej. Pérez"
                    className={
                      errores.apellido_paterno
                        ? 'border-sci-red'
                        : ''
                    }
                  />

                  {errores.apellido_paterno && (
                    <p className="mt-1 text-xs text-sci-red">
                      {errores.apellido_paterno}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-semibold">
                  Apellido materno
                </Label>

                <Input
                  type="text"
                  value={formulario.apellido_materno}
                  onChange={(e) =>
                    actualizarCampo(
                      'apellido_materno',
                      e.target.value,
                    )
                  }
                  placeholder="Ej. García"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-xs font-semibold">
                    CI *
                  </Label>

                  <Input
                    type="text"
                    value={formulario.ci}
                    onChange={(e) =>
                      actualizarCampo(
                        'ci',
                        e.target.value,
                      )
                    }
                    placeholder="Ej. 1234567"
                    className={
                      errores.ci
                        ? 'border-sci-red'
                        : ''
                    }
                  />

                  {errores.ci && (
                    <p className="mt-1 text-xs text-sci-red">
                      {errores.ci}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="mb-1.5 block text-xs font-semibold">
                    Extensión
                  </Label>

                  <Input
                    type="text"
                    value={formulario.ci_extension}
                    onChange={(e) =>
                      actualizarCampo(
                        'ci_extension',
                        e.target.value,
                      )
                    }
                    placeholder="Ej. CB"
                  />
                </div>
              </div>

              {formulario.tipo_usuario !== 'admin' && (
                <div>
                  <Label className="mb-1.5 block text-xs font-semibold">
                    Correo institucional *
                  </Label>

                  <Input
                    type="email"
                    value={formulario.email}
                    onChange={(e) =>
                      actualizarCampo(
                        'email',
                        e.target.value,
                      )
                    }
                    placeholder="correo@fcyt.umss.edu.bo"
                    className={
                      errores.email
                        ? 'border-sci-red'
                        : ''
                    }
                  />

                  {errores.email && (
                    <p className="mt-1 text-xs text-sci-red">
                      {errores.email}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label className="mb-1.5 block text-xs font-semibold">
                  Contraseña {modoEdicion ? '(opcional)' : '*'}
                </Label>

                <Input
                  type="password"
                  value={formulario.password}
                  onChange={(e) =>
                    actualizarCampo(
                      'password',
                      e.target.value,
                    )
                  }
                  placeholder={
                    modoEdicion
                      ? 'Dejar vacío para conservar actual'
                      : 'Mínimo 8 caracteres'
                  }
                  className={
                    errores.password
                      ? 'border-sci-red'
                      : ''
                  }
                />

                {errores.password && (
                  <p className="mt-1 text-xs text-sci-red">
                    {errores.password}
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-semibold">
                  Rol *
                </Label>

                <Select
                  value={formulario.tipo_usuario}
                  onValueChange={(valor) =>
                    actualizarCampo(
                      'tipo_usuario',
                      valor,
                    )
                  }
                  disabled={cargandoRoles}
                >
                  <SelectTrigger
                    className={
                      errores.tipo_usuario
                        ? 'border-sci-red'
                        : ''
                    }
                  >
                    <SelectValue
                      placeholder={
                        cargandoRoles
                          ? 'Cargando roles...'
                          : 'Seleccione un rol'
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {roles.map((item) => (
                      <SelectItem
                        key={item.codigo}
                        value={item.codigo}
                      >
                        {item.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errores.tipo_usuario && (
                  <p className="mt-1 text-xs text-sci-red">
                    {errores.tipo_usuario}
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={guardando}
                  className="cursor-pointer"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={guardando}
                  className="cursor-pointer bg-sci-blue font-semibold text-white hover:opacity-90"
                >
                  {guardando
                    ? 'Guardando...'
                    : modoEdicion
                      ? 'Guardar cambios'
                      : 'Crear usuario'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}