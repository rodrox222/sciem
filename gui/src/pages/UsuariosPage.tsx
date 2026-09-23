import { useEffect, useState, type FormEvent } from 'react'
import {
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Check,
} from 'lucide-react'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { ConfirmModal } from '../components/ConfirmModal'
import { Button } from '@/components/ui/button'
import {
  usuariosService,
  type Usuario,
  type Rol,
  type UsuarioPayload,
} from '@/services/usuarios.service'
import type { PaginatedResponse } from '@/types/api'

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

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [roles, setRoles] = useState<Rol[]>([])

  const [busqueda, setBusqueda] = useState('')
  const [rol, setRol] = useState('')
  const [estado, setEstado] = useState('')

  const [paginaActual, setPaginaActual] = useState(1)
  const [paginacion, setPaginacion] = useState<PaginatedResponse<Usuario>>({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
    from: null,
    to: null,
    data: [],
  })

  const [cargando, setCargando] = useState(true)
  const [cargandoRoles, setCargandoRoles] = useState(true)
  const [error, setError] = useState('')
  const [errorRoles, setErrorRoles] = useState('')

  const [mostrarModal, setMostrarModal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null)
  const [formulario, setFormulario] = useState<FormularioUsuario>(formularioInicial)
  const [erroresFormulario, setErroresFormulario] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [resultadoFormulario, setResultadoFormulario] = useState('')

  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const [usuarioEstado, setUsuarioEstado] = useState<Usuario | null>(null)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [resultadoEstado, setResultadoEstado] = useState('')

  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null)

  const cargarUsuarios = async () => {
    try {
      setCargando(true)
      setError('')
      const datos = await usuariosService.list({
        page: paginaActual,
        search: busqueda,
        tipo_usuario: rol,
        activo: estado,
      })
      setUsuarios(datos.data || [])
      setPaginacion(datos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarUsuarios()
  }, [busqueda, rol, estado, paginaActual])

  useEffect(() => {
    if (paginaActual !== 1) {
      setPaginaActual(1)
    }
  }, [busqueda, rol, estado])

  useEffect(() => {
    const cargarRoles = async () => {
      try {
        setCargandoRoles(true)
        setErrorRoles('')
        const listaRoles = await usuariosService.listRoles()
        setRoles(listaRoles)
      } catch {
        setErrorRoles('No se pudieron cargar los roles.')
      } finally {
        setCargandoRoles(false)
      }
    }
    cargarRoles()
  }, [])

  const obtenerNombreCompleto = (usuario: Usuario) => {
    return [usuario.nombre, usuario.apellido_paterno, usuario.apellido_materno]
      .filter(Boolean)
      .join(' ')
  }

  const obtenerNombreRol = (codigoRol: string) => {
    const rolEncontrado = roles.find((item) => item.codigo === codigoRol)
    return rolEncontrado?.nombre || codigoRol
  }

  const abrirModalNuevoUsuario = () => {
    setModoEdicion(false)
    setUsuarioEditando(null)
    setFormulario(formularioInicial)
    setErroresFormulario({})
    setResultadoFormulario('')
    setMostrarModal(true)
  }

  const abrirModalEditarUsuario = (usuario: Usuario) => {
    setMenuAbiertoId(null)
    setModoEdicion(true)
    setUsuarioEditando(usuario)
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
    setErroresFormulario({})
    setResultadoFormulario('')
    setMostrarModal(true)
  }

  const cerrarModal = () => {
    if (guardando) return
    setMostrarModal(false)
    setModoEdicion(false)
    setUsuarioEditando(null)
    setFormulario(formularioInicial)
    setErroresFormulario({})
    setResultadoFormulario('')
  }

  const actualizarCampo = (campo: keyof FormularioUsuario, valor: string) => {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
      ...(campo === 'tipo_usuario' && valor === 'admin' ? { email: '' } : {}),
    }))

    if (erroresFormulario[campo] || erroresFormulario.general) {
      setErroresFormulario((anterior) => {
        const nuevos = { ...anterior }
        delete nuevos[campo]
        delete nuevos.general
        return nuevos
      })
    }
  }

  const validarFormulario = () => {
    const nuevosErrores: Record<string, string> = {}

    if (!formulario.nombre.trim()) nuevosErrores.nombre = 'El nombre es obligatorio.'
    if (!formulario.apellido_paterno.trim()) nuevosErrores.apellido_paterno = 'El apellido paterno es obligatorio.'
    if (!formulario.ci.trim()) nuevosErrores.ci = 'El CI es obligatorio.'

    if (formulario.tipo_usuario !== 'admin') {
      if (!formulario.email.trim()) {
        nuevosErrores.email = 'El correo es obligatorio.'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulario.email)) {
        nuevosErrores.email = 'Ingrese un correo válido.'
      }
    }

    if (!modoEdicion) {
      if (!formulario.password) {
        nuevosErrores.password = 'La contraseña es obligatoria.'
      } else if (formulario.password.length < 8) {
        nuevosErrores.password = 'La contraseña debe tener al menos 8 caracteres.'
      }
    } else if (formulario.password && formulario.password.length < 8) {
      nuevosErrores.password = 'La contraseña debe tener al menos 8 caracteres.'
    }

    if (!formulario.tipo_usuario) nuevosErrores.tipo_usuario = 'Seleccione un rol.'

    setErroresFormulario(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const manejarGuardarUsuario = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validarFormulario()) return

    try {
      setGuardando(true)
      setErroresFormulario({})

      const payload: UsuarioPayload = {
        nombre: formulario.nombre.trim(),
        apellido_paterno: formulario.apellido_paterno.trim(),
        apellido_materno: formulario.apellido_materno.trim() || null,
        ci: formulario.ci.trim(),
        ci_extension: formulario.ci_extension.trim() || null,
        tipo_usuario: formulario.tipo_usuario,
        ...(formulario.tipo_usuario !== 'admin' ? { email: formulario.email.trim() } : {}),
        ...(formulario.password ? { password: formulario.password } : {}),
      }

      if (modoEdicion && usuarioEditando) {
        await usuariosService.update(usuarioEditando.id, payload)
        setResultadoFormulario('Usuario actualizado correctamente.')
      } else {
        await usuariosService.create(payload)
        setResultadoFormulario('Usuario creado correctamente.')
      }

      await cargarUsuarios()
    } catch (err) {
      setErroresFormulario({
        general: err instanceof Error ? err.message : 'No se pudo guardar el usuario.',
      })
    } finally {
      setGuardando(false)
    }
  }

  const abrirConfirmacionEstado = (usuario: Usuario) => {
    setMenuAbiertoId(null)
    setUsuarioEstado(usuario)
    setResultadoEstado('')
    setMostrarConfirmacion(true)
  }

  const cerrarConfirmacionEstado = () => {
    if (cambiandoEstado) return
    setMostrarConfirmacion(false)
    setUsuarioEstado(null)
    setResultadoEstado('')
  }

  const cambiarEstadoUsuario = async () => {
    if (!usuarioEstado) return

    try {
      setCambiandoEstado(true)
      if (usuarioEstado.activo) {
        await usuariosService.desactivar(usuarioEstado.id)
        setResultadoEstado('Usuario desactivado correctamente.')
      } else {
        await usuariosService.activar(usuarioEstado.id)
        setResultadoEstado('Usuario activado correctamente.')
      }
      await cargarUsuarios()
    } catch (err) {
      setResultadoEstado(err instanceof Error ? err.message : 'Error al cambiar estado.')
    } finally {
      setCambiandoEstado(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
            Administración del Sistema
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-sci-navy tracking-tight">
            Gestión de usuarios
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra las cuentas, roles y accesos oficiales al sistema SCI.
          </p>
        </div>

        <Button
          type="button"
          onClick={abrirModalNuevoUsuario}
          className="bg-sci-blue hover:opacity-90 text-white font-semibold cursor-pointer shadow-xs gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-foreground">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre, apellido o CI..."
                className="h-10 pl-9 bg-background"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-foreground">Rol</Label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              disabled={cargandoRoles}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
            >
              <option value="">{cargandoRoles ? 'Cargando roles...' : 'Todos los roles'}</option>
              {roles.map((item) => (
                <option key={item.codigo} value={item.codigo}>
                  {item.nombre}
                </option>
              ))}
            </select>
            {errorRoles && <p className="mt-1 text-xs text-sci-red">{errorRoles}</p>}
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-foreground">Estado</Label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
            >
              <option value="">Todos los estados</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Usuarios */}
      {cargando ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          Cargando registros de usuarios...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-sci-red/20 bg-sci-red/10 p-8 text-center text-sm text-sci-red font-medium">
          {error}
        </div>
      ) : usuarios.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          No se encontraron usuarios registrados con los filtros seleccionados.
        </div>
      ) : (
        <div className="space-y-3">
          {usuarios.map((usuario) => (
            <div
              key={usuario.id}
              className="rounded-2xl border border-border bg-card shadow-xs transition hover:shadow-md overflow-hidden"
            >
              <div className={`h-1.5 ${usuario.activo ? 'bg-sci-blue' : 'bg-sci-red'}`} />

              <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex w-full min-w-0 items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sci-navy/10 font-bold text-sci-navy text-base">
                    {usuario.nombre.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-bold text-sci-navy">
                      {obtenerNombreCompleto(usuario)}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      CI: {usuario.ci}
                      {usuario.ci_extension ? `-${usuario.ci_extension}` : ''}
                      {usuario.email ? ` · ${usuario.email}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex w-full flex-row flex-wrap items-center justify-between gap-2 md:w-auto md:justify-end md:flex-nowrap">
                  <span className="inline-flex items-center justify-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                    {obtenerNombreRol(usuario.tipo_usuario)}
                  </span>

                  <span
                    className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                      usuario.activo
                        ? 'border border-sci-cyan/30 bg-sci-cyan/10 text-sci-navy'
                        : 'border border-sci-red/30 bg-sci-red/10 text-sci-red'
                    }`}
                  >
                    {usuario.activo ? 'Activo' : 'Inactivo'}
                  </span>

                  <div className="hidden items-center gap-2 md:flex">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => abrirModalEditarUsuario(usuario)}
                      className="cursor-pointer"
                    >
                      Editar
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => abrirConfirmacionEstado(usuario)}
                      disabled={cambiandoEstado}
                      className={`cursor-pointer ${
                        usuario.activo
                          ? 'text-sci-red hover:bg-sci-red/10'
                          : 'text-sci-blue hover:bg-sci-blue/10'
                      }`}
                    >
                      {usuario.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>

                  <div className="relative md:hidden">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setMenuAbiertoId(menuAbiertoId === usuario.id ? null : usuario.id)
                      }
                      aria-label="Más acciones"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>

                    {menuAbiertoId === usuario.id && (
                      <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-xl border border-border bg-card p-1.5 shadow-lg">
                        <button
                          type="button"
                          onClick={() => abrirModalEditarUsuario(usuario)}
                          className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-muted"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirConfirmacionEstado(usuario)}
                          className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-muted ${
                            usuario.activo ? 'text-sci-red' : 'text-sci-blue'
                          }`}
                        >
                          {usuario.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {paginacion.last_page > 1 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
          <p>
            Mostrando{' '}
            <span className="font-semibold text-foreground">{paginacion.from}</span> -{' '}
            <span className="font-semibold text-foreground">{paginacion.to}</span> de{' '}
            <span className="font-semibold text-foreground">{paginacion.total}</span> usuarios
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaActual <= 1}
              className="cursor-pointer gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <span className="font-semibold text-foreground">
              Página {paginacion.current_page} de {paginacion.last_page}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPaginaActual((p) => Math.min(paginacion.last_page, p + 1))}
              disabled={paginaActual >= paginacion.last_page}
              className="cursor-pointer gap-1"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-card border border-border text-card-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-sci-navy">
                  {modoEdicion ? 'Editar usuario' : 'Nuevo usuario'}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {modoEdicion
                    ? 'Modifica los datos y el rol del usuario.'
                    : 'Registra una nueva cuenta institucional en el sistema.'}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={cerrarModal}
                disabled={guardando}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {resultadoFormulario ? (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Check className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-sci-navy">Operación completada</h3>
                <p className="mt-1 text-xs text-muted-foreground">{resultadoFormulario}</p>
                <div className="mt-6 flex justify-center">
                  <Button
                    type="button"
                    onClick={cerrarModal}
                    className="bg-sci-blue hover:opacity-90 text-white font-semibold cursor-pointer"
                  >
                    Aceptar
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={manejarGuardarUsuario} className="space-y-4 px-6 py-6">
                {erroresFormulario.general && (
                  <div className="rounded-xl border border-sci-red/20 bg-sci-red/10 px-4 py-3 text-xs text-sci-red font-semibold">
                    {erroresFormulario.general}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold">Nombre *</Label>
                    <Input
                      type="text"
                      value={formulario.nombre}
                      onChange={(e) => actualizarCampo('nombre', e.target.value)}
                      placeholder="Ej. Juan"
                      className={erroresFormulario.nombre ? 'border-sci-red' : ''}
                    />
                    {erroresFormulario.nombre && (
                      <p className="mt-1 text-xs text-sci-red">{erroresFormulario.nombre}</p>
                    )}
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold">Apellido paterno *</Label>
                    <Input
                      type="text"
                      value={formulario.apellido_paterno}
                      onChange={(e) => actualizarCampo('apellido_paterno', e.target.value)}
                      placeholder="Ej. Pérez"
                      className={erroresFormulario.apellido_paterno ? 'border-sci-red' : ''}
                    />
                    {erroresFormulario.apellido_paterno && (
                      <p className="mt-1 text-xs text-sci-red">{erroresFormulario.apellido_paterno}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="mb-1.5 block text-xs font-semibold">Apellido materno</Label>
                  <Input
                    type="text"
                    value={formulario.apellido_materno}
                    onChange={(e) => actualizarCampo('apellido_materno', e.target.value)}
                    placeholder="Ej. García"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold">CI *</Label>
                    <Input
                      type="text"
                      value={formulario.ci}
                      onChange={(e) => actualizarCampo('ci', e.target.value)}
                      placeholder="Ej. 1234567"
                      className={erroresFormulario.ci ? 'border-sci-red' : ''}
                    />
                    {erroresFormulario.ci && (
                      <p className="mt-1 text-xs text-sci-red">{erroresFormulario.ci}</p>
                    )}
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold">Extensión</Label>
                    <Input
                      type="text"
                      value={formulario.ci_extension}
                      onChange={(e) => actualizarCampo('ci_extension', e.target.value)}
                      placeholder="Ej. CB"
                    />
                  </div>
                </div>

                {formulario.tipo_usuario !== 'admin' && (
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold">Correo institucional *</Label>
                    <Input
                      type="email"
                      value={formulario.email}
                      onChange={(e) => actualizarCampo('email', e.target.value)}
                      placeholder="correo@fcyt.umss.edu.bo"
                      className={erroresFormulario.email ? 'border-sci-red' : ''}
                    />
                    {erroresFormulario.email && (
                      <p className="mt-1 text-xs text-sci-red">{erroresFormulario.email}</p>
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
                    onChange={(e) => actualizarCampo('password', e.target.value)}
                    placeholder={
                      modoEdicion ? 'Dejar vacío para conservar actual' : 'Mínimo 8 caracteres'
                    }
                    className={erroresFormulario.password ? 'border-sci-red' : ''}
                  />
                  {erroresFormulario.password && (
                    <p className="mt-1 text-xs text-sci-red">{erroresFormulario.password}</p>
                  )}
                </div>

                <div>
                  <Label className="mb-1.5 block text-xs font-semibold">Rol *</Label>
                  <select
                    value={formulario.tipo_usuario}
                    onChange={(e) => actualizarCampo('tipo_usuario', e.target.value)}
                    disabled={cargandoRoles}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
                  >
                    <option value="">Seleccione un rol</option>
                    {roles.map((item) => (
                      <option key={item.codigo} value={item.codigo}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                  {erroresFormulario.tipo_usuario && (
                    <p className="mt-1 text-xs text-sci-red">{erroresFormulario.tipo_usuario}</p>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cerrarModal}
                    disabled={guardando}
                    className="cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={guardando}
                    className="bg-sci-blue hover:opacity-90 text-white font-semibold cursor-pointer"
                  >
                    {guardando
                      ? 'Guardando...'
                      : modoEdicion
                      ? 'Guardar cambios'
                      : 'Crear usuario'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Estado */}
      {usuarioEstado && (
        <ConfirmModal
          open={mostrarConfirmacion}
          onOpenChange={(abierto) => {
            if (!abierto && !cambiandoEstado) cerrarConfirmacionEstado()
          }}
          title={
            resultadoEstado
              ? 'Operación completada'
              : usuarioEstado.activo
              ? 'Desactivar usuario'
              : 'Activar usuario'
          }
          description={
            resultadoEstado
              ? resultadoEstado
              : usuarioEstado.activo
              ? `¿Está seguro de desactivar la cuenta de ${obtenerNombreCompleto(usuarioEstado)}? No podrá ingresar al sistema.`
              : `¿Desea habilitar nuevamente el acceso para ${obtenerNombreCompleto(usuarioEstado)}?`
          }
          confirmText={
            resultadoEstado
              ? 'Aceptar'
              : cambiandoEstado
              ? 'Procesando...'
              : usuarioEstado.activo
              ? 'Desactivar'
              : 'Activar'
          }
          cancelText="Cancelar"
          onConfirm={resultadoEstado ? cerrarConfirmacionEstado : cambiarEstadoUsuario}
          onCancel={cerrarConfirmacionEstado}
          variant={usuarioEstado.activo ? 'destructive' : 'default'}
          showCancel={!cambiandoEstado && !resultadoEstado}
        />
      )}
    </div>
  )
}