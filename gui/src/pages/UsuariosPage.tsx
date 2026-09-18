import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import {
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from 'lucide-react'
import { AdminNavbar } from '../components/AdminNavbar'
import { ConfirmModal } from '../components/ConfirmModal'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:8200/api'

interface Usuario {
  id: string
  ci: string
  ci_extension?: string | null
  nombre: string
  apellido_paterno: string
  apellido_materno?: string | null
  email?: string | null
  activo: boolean
  tipo_usuario: string
  ultimo_acceso?: string | null
  created_at: string
  updated_at: string
}

interface Rol {
  codigo: string
  nombre: string
}

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

interface DatosPaginacion {
  current_page: number
  last_page: number
  total: number
  per_page: number
  from: number | null
  to: number | null
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

  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  const [paginaActual, setPaginaActual] = useState(1)

  const [paginacion, setPaginacion] =
    useState<DatosPaginacion>({
      current_page: 1,
      last_page: 1,
      total: 0,
      per_page: 10,
      from: null,
      to: null,
    })

  const [cargando, setCargando] = useState(true)
  const [cargandoRoles, setCargandoRoles] = useState(true)

  const [error, setError] = useState('')
  const [errorRoles, setErrorRoles] = useState('')

  // ==========================================================
  // MODAL CREAR / EDITAR
  // ==========================================================

  const [mostrarModal, setMostrarModal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)

  const [usuarioEditando, setUsuarioEditando] =
    useState<Usuario | null>(null)

  const [formulario, setFormulario] =
    useState<FormularioUsuario>(formularioInicial)

  const [erroresFormulario, setErroresFormulario] =
    useState<Record<string, string>>({})

  const [guardando, setGuardando] = useState(false)

  // ==========================================================
  // MODAL ACTIVAR / DESACTIVAR
  // ==========================================================

  const [mostrarConfirmacion, setMostrarConfirmacion] =
    useState(false)

  const [usuarioEstado, setUsuarioEstado] =
    useState<Usuario | null>(null)

  const [cambiandoEstado, setCambiandoEstado] =
    useState(false)

  // ==========================================================
  // MENÚ DE ACCIONES EN MÓVIL
  // ==========================================================

  const [menuAbiertoId, setMenuAbiertoId] =
    useState<string | null>(null)

  // ==========================================================
  // CARGAR USUARIOS
  // ==========================================================

  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        setCargando(true)
        setError('')

        const token = localStorage.getItem('auth_token')

        const parametros = new URLSearchParams()

        parametros.append(
          'page',
          String(paginaActual)
        )

        if (busqueda.trim()) {
          parametros.append(
            'search',
            busqueda.trim()
          )
        }

        if (rol) {
          parametros.append(
            'tipo_usuario',
            rol
          )
        }

        if (estado) {
          parametros.append(
            'activo',
            estado
          )
        }

        const respuesta = await fetch(
          `${API_BASE_URL}/users?${parametros.toString()}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (respuesta.status === 401) {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user_role')
          localStorage.removeItem('user_data')
          window.location.href = '/login'
          return
        }

        if (!respuesta.ok) {
          throw new Error(
            'No se pudieron cargar los usuarios.'
          )
        }

        const datos = await respuesta.json()

        setUsuarios(datos.data || [])

        setPaginacion({
          current_page:
            datos.current_page || 1,
          last_page:
            datos.last_page || 1,
          total:
            datos.total || 0,
          per_page:
            datos.per_page || 10,
          from:
            datos.from ?? null,
          to:
            datos.to ?? null,
        })
      } catch (error) {
        console.error(
          'Error al cargar usuarios:',
          error
        )

        setError(
          'No se pudieron cargar los usuarios.'
        )
      } finally {
        setCargando(false)
      }
    }

    cargarUsuarios()
  }, [
    busqueda,
    rol,
    estado,
    paginaActual,
  ])

  // ==========================================================
  // VOLVER A PAGINA 1 AL CAMBIAR FILTROS
  // ==========================================================

  useEffect(() => {
    if (paginaActual !== 1) {
      setPaginaActual(1)
    }
  }, [busqueda, rol, estado])

  // ==========================================================
  // CARGAR ROLES
  // ==========================================================

  useEffect(() => {
    const cargarRoles = async () => {
      try {
        setCargandoRoles(true)
        setErrorRoles('')

        const token = localStorage.getItem('auth_token')

        const respuesta = await fetch(
          `${API_BASE_URL}/roles`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (respuesta.status === 401) {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user_role')
          localStorage.removeItem('user_data')
          window.location.href = '/login'
          return
        }

        if (!respuesta.ok) {
          throw new Error(
            'No se pudieron cargar los roles.'
          )
        }

        const datos = await respuesta.json()

        const listaRoles = Array.isArray(datos)
          ? datos
          : datos.data || []

        const rolesNormalizados: Rol[] =
          listaRoles.map((item: any) => ({
            codigo:
              item.codigo ??
              item.value ??
              item.valor ??
              item.id ??
              item.tipo_usuario,

            nombre:
              item.nombre ??
              item.label ??
              item.descripcion ??
              item.nombre_rol,
          }))

        setRoles(rolesNormalizados)
      } catch (error) {
        console.error(
          'Error al cargar roles:',
          error
        )

        setErrorRoles(
          'No se pudieron cargar los roles.'
        )
      } finally {
        setCargandoRoles(false)
      }
    }

    cargarRoles()
  }, [])

  // ==========================================================
  // FUNCIONES AUXILIARES
  // ==========================================================

  const obtenerNombreCompleto = (
    usuario: Usuario
  ) => {
    return [
      usuario.nombre,
      usuario.apellido_paterno,
      usuario.apellido_materno,
    ]
      .filter(Boolean)
      .join(' ')
  }

  const obtenerNombreRol = (
    codigoRol: string
  ) => {
    const rolEncontrado = roles.find(
      (item) => item.codigo === codigoRol
    )

    return rolEncontrado?.nombre || codigoRol
  }

  // ==========================================================
  // NUEVO USUARIO
  // ==========================================================

  const abrirModalNuevoUsuario = () => {
    setModoEdicion(false)
    setUsuarioEditando(null)
    setFormulario(formularioInicial)
    setErroresFormulario({})
    setMostrarModal(true)
  }

  // ==========================================================
  // EDITAR USUARIO
  // ==========================================================

  const abrirModalEditarUsuario = (
    usuario: Usuario
  ) => {
    setMenuAbiertoId(null)
    setModoEdicion(true)
    setUsuarioEditando(usuario)

    setFormulario({
      nombre: usuario.nombre || '',
      apellido_paterno:
        usuario.apellido_paterno || '',
      apellido_materno:
        usuario.apellido_materno || '',
      ci: usuario.ci || '',
      ci_extension:
        usuario.ci_extension || '',
      email: usuario.email || '',
      password: '',
      tipo_usuario:
        usuario.tipo_usuario || '',
    })

    setErroresFormulario({})
    setMostrarModal(true)
  }

  // ==========================================================
  // CERRAR MODAL
  // ==========================================================

  const cerrarModal = () => {
    if (guardando) {
      return
    }

    setMostrarModal(false)
    setModoEdicion(false)
    setUsuarioEditando(null)
    setFormulario(formularioInicial)
    setErroresFormulario({})
  }

  // ==========================================================
  // ACTUALIZAR CAMPO
  // ==========================================================

  const actualizarCampo = (
    campo: keyof FormularioUsuario,
    valor: string
  ) => {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,

      ...(campo === 'tipo_usuario' &&
      valor === 'admin'
        ? { email: '' }
        : {}),
    }))

    if (erroresFormulario[campo]) {
      setErroresFormulario((anterior) => {
        const nuevosErrores = {
          ...anterior,
        }

        delete nuevosErrores[campo]

        return nuevosErrores
      })
    }

    if (
      campo === 'tipo_usuario' &&
      valor === 'admin'
    ) {
      setErroresFormulario((anterior) => {
        const nuevosErrores = {
          ...anterior,
        }

        delete nuevosErrores.email

        return nuevosErrores
      })
    }

    if (erroresFormulario.general) {
      setErroresFormulario((anterior) => {
        const nuevosErrores = {
          ...anterior,
        }

        delete nuevosErrores.general

        return nuevosErrores
      })
    }
  }

  // ==========================================================
  // VALIDACIONES
  // ==========================================================

  const validarFormulario = () => {
    const nuevosErrores: Record<
      string,
      string
    > = {}

    if (!formulario.nombre.trim()) {
      nuevosErrores.nombre =
        'El nombre es obligatorio.'
    }

    if (!formulario.apellido_paterno.trim()) {
      nuevosErrores.apellido_paterno =
        'El apellido paterno es obligatorio.'
    }

    if (!formulario.ci.trim()) {
      nuevosErrores.ci =
        'El CI es obligatorio.'
    }

    if (
      formulario.tipo_usuario !== 'admin'
    ) {
      if (!formulario.email.trim()) {
        nuevosErrores.email =
          'El correo es obligatorio.'
      } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          formulario.email
        )
      ) {
        nuevosErrores.email =
          'Ingrese un correo válido.'
      }
    }

    if (!modoEdicion) {
      if (!formulario.password) {
        nuevosErrores.password =
          'La contraseña es obligatoria.'
      } else if (
        formulario.password.length < 8
      ) {
        nuevosErrores.password =
          'La contraseña debe tener al menos 8 caracteres.'
      }
    } else {
      if (
        formulario.password &&
        formulario.password.length < 8
      ) {
        nuevosErrores.password =
          'La contraseña debe tener al menos 8 caracteres.'
      }
    }

    if (!formulario.tipo_usuario) {
      nuevosErrores.tipo_usuario =
        'Seleccione un rol.'
    }

    setErroresFormulario(
      nuevosErrores
    )

    return (
      Object.keys(nuevosErrores).length === 0
    )
  }

  // ==========================================================
  // RECARGAR USUARIOS
  // ==========================================================

  const recargarUsuarios = async (
    token: string | null,
    pagina = paginaActual
  ) => {
    const parametros = new URLSearchParams()

    parametros.append(
      'page',
      String(pagina)
    )

    if (busqueda.trim()) {
      parametros.append(
        'search',
        busqueda.trim()
      )
    }

    if (rol) {
      parametros.append(
        'tipo_usuario',
        rol
      )
    }

    if (estado) {
      parametros.append(
        'activo',
        estado
      )
    }

    const respuesta =
      await fetch(
        `${API_BASE_URL}/users?${parametros.toString()}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      )

    if (respuesta.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_role')
      localStorage.removeItem('user_data')
      window.location.href = '/login'
      return
    }

    if (respuesta.ok) {
      const datos =
        await respuesta.json()

      setUsuarios(datos.data || [])

      setPaginacion({
        current_page:
          datos.current_page || 1,
        last_page:
          datos.last_page || 1,
        total:
          datos.total || 0,
        per_page:
          datos.per_page || 10,
        from:
          datos.from ?? null,
        to:
          datos.to ?? null,
      })
    }
  }

  // ==========================================================
  // CREAR USUARIO
  // ==========================================================

  const crearUsuario = async (
    token: string | null
  ) => {
    return fetch(
      `${API_BASE_URL}/users`,
      {
        method: 'POST',

        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          nombre:
            formulario.nombre.trim(),

          apellido_paterno:
            formulario.apellido_paterno.trim(),

          apellido_materno:
            formulario.apellido_materno.trim() ||
            null,

          ci:
            formulario.ci.trim(),

          ci_extension:
            formulario.ci_extension.trim() ||
            null,

          ...(formulario.tipo_usuario !==
          'admin'
            ? {
                email:
                  formulario.email.trim(),
              }
            : {}),

          password:
            formulario.password,

          tipo_usuario:
            formulario.tipo_usuario,
        }),
      }
    )
  }

  // ==========================================================
  // EDITAR USUARIO
  // ==========================================================

  const editarUsuario = async (
    token: string | null
  ) => {
    if (!usuarioEditando) {
      throw new Error(
        'No se seleccionó ningún usuario.'
      )
    }

    const datosActualizar: Record<
      string,
      string | null
    > = {
      nombre:
        formulario.nombre.trim(),

      apellido_paterno:
        formulario.apellido_paterno.trim(),

      apellido_materno:
        formulario.apellido_materno.trim() ||
        null,

      ci:
        formulario.ci.trim(),

      ci_extension:
        formulario.ci_extension.trim() ||
        null,

      tipo_usuario:
        formulario.tipo_usuario,
    }

    if (
      formulario.tipo_usuario !==
      'admin'
    ) {
      datosActualizar.email =
        formulario.email.trim()
    }

    if (
      formulario.password.trim()
    ) {
      datosActualizar.password =
        formulario.password
    }

    return fetch(
      `${API_BASE_URL}/users/${usuarioEditando.id}`,
      {
        method: 'PUT',

        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify(
          datosActualizar
        ),
      }
    )
  }

  // ==========================================================
  // GUARDAR USUARIO
  // ==========================================================

  const manejarGuardarUsuario = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault()

    if (!validarFormulario()) {
      return
    }

    try {
      setGuardando(true)
      setErroresFormulario({})

      const token =
        localStorage.getItem(
          'auth_token'
        )

      const respuesta =
        modoEdicion
          ? await editarUsuario(token)
          : await crearUsuario(token)

      const datos =
        await respuesta.json()

      if (respuesta.status === 401) {
        localStorage.removeItem(
          'auth_token'
        )
        localStorage.removeItem(
          'user_role'
        )
        localStorage.removeItem(
          'user_data'
        )

        window.location.href =
          '/login'

        return
      }

      if (respuesta.status === 422) {
        const erroresBackend: Record<
          string,
          string
        > = {}

        if (datos.errors) {
          Object.entries(
            datos.errors
          ).forEach(
            ([campo, mensajes]) => {
              if (
                Array.isArray(mensajes)
              ) {
                erroresBackend[campo] =
                  mensajes[0] as string
              }
            }
          )
        }

        if (
          Object.keys(
            erroresBackend
          ).length === 0
        ) {
          erroresBackend.general =
            datos.message ||
            'Los datos enviados no son válidos.'
        }

        setErroresFormulario(
          erroresBackend
        )

        return
      }

      if (!respuesta.ok) {
        throw new Error(
          datos.message ||
          (
            modoEdicion
              ? 'No se pudo actualizar el usuario.'
              : 'No se pudo crear el usuario.'
          )
        )
      }

      alert(
        modoEdicion
          ? 'Usuario actualizado correctamente.'
          : 'Usuario creado correctamente.'
      )

      cerrarModal()

      await recargarUsuarios(
        token
      )
    } catch (error) {
      console.error(
        'Error al guardar usuario:',
        error
      )

      setErroresFormulario({
        general:
          modoEdicion
            ? 'No se pudo actualizar el usuario. Verifique la conexión con el servidor.'
            : 'No se pudo crear el usuario. Verifique la conexión con el servidor.',
      })
    } finally {
      setGuardando(false)
    }
  }

  // ==========================================================
  // CONFIRMACIÓN DE ESTADO
  // ==========================================================

  const abrirConfirmacionEstado = (
    usuario: Usuario
  ) => {
    setMenuAbiertoId(null)
    setUsuarioEstado(usuario)
    setMostrarConfirmacion(true)
  }

  const cerrarConfirmacionEstado = () => {
    if (cambiandoEstado) {
      return
    }

    setMostrarConfirmacion(false)
    setUsuarioEstado(null)
  }

  // ==========================================================
  // ACTIVAR / DESACTIVAR
  // ==========================================================

  const cambiarEstadoUsuario =
    async () => {
      if (!usuarioEstado) {
        return
      }

      try {
        setCambiandoEstado(true)

        const token =
          localStorage.getItem(
            'auth_token'
          )

        /*
         * El backend maneja:
         * - DELETE /users/{id} -> desactivar
         * - PUT /users/{id} -> activar enviando activo: true
         */
        const respuesta =
          await fetch(
            `${API_BASE_URL}/users/${usuarioEstado.id}`,
            {
              method:
                usuarioEstado.activo
                  ? 'DELETE'
                  : 'PUT',

              headers: {
                Accept:
                  'application/json',

                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              ...(usuarioEstado.activo
                ? {}
                : {
                    body: JSON.stringify({
                      activo: true,
                    }),
                  }),
            }
          )

        if (
          respuesta.status === 401
        ) {
          localStorage.removeItem(
            'auth_token'
          )
          localStorage.removeItem(
            'user_role'
          )
          localStorage.removeItem(
            'user_data'
          )

          window.location.href =
            '/login'

          return
        }

        const datos =
          await respuesta.json()

        if (!respuesta.ok) {
          throw new Error(
            datos.message ||
              'No se pudo cambiar el estado del usuario.'
          )
        }

        alert(
          usuarioEstado.activo
            ? 'Usuario desactivado correctamente.'
            : 'Usuario activado correctamente.'
        )

        setMostrarConfirmacion(
          false
        )

        setUsuarioEstado(null)

        await recargarUsuarios(
          token
        )
      } catch (error) {
        console.error(
          'Error al cambiar estado:',
          error
        )

        alert(
          error instanceof Error
            ? error.message
            : 'No se pudo cambiar el estado del usuario.'
        )
      } finally {
        setCambiandoEstado(false)
      }
    }

  // ==========================================================
  // INTERFAZ
  // ==========================================================

  return (
    <div className="min-h-screen bg-[#F7F7F7]">

      <AdminNavbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ================================================== */}
        {/* ENCABEZADO */}
        {/* ================================================== */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h1 className="font-['Poppins'] text-3xl font-bold text-[#1E293B]">
              Gestión de usuarios
            </h1>

            <p className="mt-1 text-sm text-[#64748B]">
              Administra las cuentas, roles y estados de los usuarios.
            </p>

          </div>

          <button
            type="button"
            onClick={
              abrirModalNuevoUsuario
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0056B3] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#003770]"
          >
            <Plus className="h-5 w-5" />
            Nuevo usuario
          </button>

        </div>

        {/* ================================================== */}
        {/* FILTROS */}
        {/* ================================================== */}

        <div className="mb-6 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            {/* BUSCAR */}

            <div>

              <label className="mb-1.5 block text-sm font-semibold text-[#1E293B]">
                Buscar
              </label>

              <div className="relative">

                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />

                <input
                  type="text"
                  value={
                    busqueda
                  }
                  onChange={(e) =>
                    setBusqueda(
                      e.target.value
                    )
                  }
                  placeholder="Nombre, apellido o CI..."
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/20"
                />

              </div>

            </div>

            {/* ROL */}

            <div>

              <label className="mb-1.5 block text-sm font-semibold text-[#1E293B]">
                Rol
              </label>

              <select
                value={rol}
                onChange={(e) =>
                  setRol(
                    e.target.value
                  )
                }
                disabled={
                  cargandoRoles
                }
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/20 disabled:cursor-not-allowed disabled:bg-gray-100"
              >

                <option value="">
                  {cargandoRoles
                    ? 'Cargando roles...'
                    : 'Todos los roles'}
                </option>

                {roles.map(
                  (item) => (
                    <option
                      key={
                        item.codigo
                      }
                      value={
                        item.codigo
                      }
                    >
                      {
                        item.nombre
                      }
                    </option>
                  )
                )}

              </select>

              {errorRoles && (
                <p className="mt-1 text-xs text-[#E30613]">
                  {
                    errorRoles
                  }
                </p>
              )}

            </div>

            {/* ESTADO */}

            <div>

              <label className="mb-1.5 block text-sm font-semibold text-[#1E293B]">
                Estado
              </label>

              <select
                value={
                  estado
                }
                onChange={(e) =>
                  setEstado(
                    e.target.value
                  )
                }
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/20"
              >

                <option value="">
                  Todos los estados
                </option>

                <option value="true">
                  Activo
                </option>

                <option value="false">
                  Inactivo
                </option>

              </select>

            </div>

          </div>

        </div>

        {/* ================================================== */}
        {/* LISTA */}
        {/* ================================================== */}

        {cargando ? (

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-10 text-center">

            <p className="text-sm text-[#64748B]">
              Cargando usuarios...
            </p>

          </div>

        ) : error ? (

          <div className="rounded-xl border border-red-200 bg-white p-10 text-center">

            <p className="text-sm text-[#E30613]">
              {error}
            </p>

          </div>

        ) : usuarios.length === 0 ? (

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-10 text-center">

            <p className="text-sm text-[#64748B]">
              No se encontraron usuarios.
            </p>

          </div>

        ) : (

          <>

            <div className="space-y-4">

              {usuarios.map(
                (usuario) => (

                  <div
                    key={
                      usuario.id
                    }
                    className="overflow-visible rounded-xl border border-[#E2E8F0] bg-white shadow-sm transition hover:shadow-md"
                  >

                    {/* BARRA SUPERIOR */}

                    <div
                      className={`h-1.5 ${
                        usuario.activo
                          ? 'bg-[#0056B3]'
                          : 'bg-[#E30613]'
                      }`}
                    />

                    <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between">

                      {/* INFORMACIÓN */}

                      <div className="flex w-full min-w-0 items-center gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#E8F4F8] font-['Poppins'] text-lg font-bold text-[#003770]">
                          {usuario.nombre
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">

                          <h2 className="truncate font-['Poppins'] text-lg font-semibold text-[#1E293B]">
                            {
                              obtenerNombreCompleto(
                                usuario
                              )
                            }
                          </h2>

                          <p className="mt-1 truncate text-sm text-[#64748B]">
                            CI:{' '}
                            {
                              usuario.ci
                            }

                            {usuario.ci_extension
                              ? `-${usuario.ci_extension}`
                              : ''}
                          </p>

                          {usuario.email && (
                            <p className="truncate text-sm text-[#64748B]">
                              {
                                usuario.email
                              }
                            </p>
                          )}

                        </div>

                      </div>

                      {/* DATOS Y ACCIONES */}

                      <div className="flex w-full flex-row flex-wrap items-center justify-between gap-2 md:w-auto md:justify-end md:flex-nowrap">

                        {/* ROL */}

                        <span className="inline-flex items-center justify-center rounded-full border border-[#E2E8F0] bg-[#F7F7F7] px-3 py-1 text-xs font-semibold text-[#1E293B]">
                          {
                            obtenerNombreRol(
                              usuario.tipo_usuario
                            )
                          }
                        </span>

                        {/* ESTADO */}

                        <span
                          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                            usuario.activo
                              ? 'border border-blue-200 bg-blue-50 text-[#0056B3]'
                              : 'border border-red-200 bg-red-50 text-[#E30613]'
                          }`}
                        >
                          {
                            usuario.activo
                              ? 'Activo'
                              : 'Inactivo'
                          }
                        </span>

                        {/* ACCIONES EN ESCRITORIO */}

                        <div className="hidden items-center gap-2 md:flex">

                          {/* EDITAR */}

                          <button
                            type="button"
                            onClick={() =>
                              abrirModalEditarUsuario(
                                usuario
                              )
                            }
                            className="min-h-11 rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-[#64748B] transition hover:bg-[#F7F7F7] hover:text-[#0056B3]"
                          >
                            Editar
                          </button>

                          {/* ACTIVAR / DESACTIVAR */}

                          <button
                            type="button"
                            onClick={() =>
                              abrirConfirmacionEstado(
                                usuario
                              )
                            }
                            disabled={
                              cambiandoEstado
                            }
                            className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              usuario.activo
                                ? 'border border-red-200 text-[#E30613] hover:bg-red-50'
                                : 'border border-blue-200 text-[#0056B3] hover:bg-blue-50'
                            }`}
                          >
                            {
                              usuario.activo
                                ? 'Desactivar'
                                : 'Activar'
                            }
                          </button>

                        </div>

                        {/* MENÚ DE ACCIONES EN MÓVIL */}

                        <div className="relative md:hidden">

                          <button
                            type="button"
                            onClick={() =>
                              setMenuAbiertoId(
                                menuAbiertoId === usuario.id
                                  ? null
                                  : usuario.id
                              )
                            }
                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] transition hover:bg-[#F7F7F7] hover:text-[#0056B3]"
                            aria-label={`Más acciones para ${obtenerNombreCompleto(usuario)}`}
                            aria-expanded={
                              menuAbiertoId === usuario.id
                            }
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>

                          {menuAbiertoId === usuario.id && (
                            <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white p-1.5 shadow-lg">

                              <button
                                type="button"
                                onClick={() =>
                                  abrirModalEditarUsuario(
                                    usuario
                                  )
                                }
                                className="flex min-h-11 w-full items-center rounded-md px-3 py-2 text-left text-sm font-semibold text-[#1E293B] transition hover:bg-[#F7F7F7] hover:text-[#0056B3]"
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  abrirConfirmacionEstado(
                                    usuario
                                  )
                                }
                                disabled={
                                  cambiandoEstado
                                }
                                className={`flex min-h-11 w-full items-center rounded-md px-3 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                  usuario.activo
                                    ? 'text-[#E30613] hover:bg-red-50'
                                    : 'text-[#0056B3] hover:bg-blue-50'
                                }`}
                              >
                                {
                                  usuario.activo
                                    ? 'Desactivar'
                                    : 'Activar'
                                }
                              </button>

                            </div>
                          )}

                        </div>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

            {/* ================================================== */}
            {/* PAGINACIÓN */}
            {/* ================================================== */}

            <div className="mt-6 flex flex-col gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">

              {/* INFORMACIÓN */}

              <p className="text-sm text-[#64748B]">

                {paginacion.total > 0 ? (
                  <>
                    Mostrando{' '}

                    <span className="font-semibold text-[#1E293B]">
                      {
                        paginacion.from
                      }
                    </span>

                    {' - '}

                    <span className="font-semibold text-[#1E293B]">
                      {
                        paginacion.to
                      }
                    </span>

                    {' de '}

                    <span className="font-semibold text-[#1E293B]">
                      {
                        paginacion.total
                      }
                    </span>

                    {' usuarios'}
                  </>
                ) : (
                  'Sin usuarios'
                )}

              </p>

              {/* BOTONES */}

              <div className="flex items-center justify-center gap-2">

                {/* ANTERIOR */}

                <button
                  type="button"
                  onClick={() =>
                    setPaginaActual(
                      (pagina) =>
                        Math.max(
                          1,
                          pagina - 1
                        )
                    )
                  }
                  disabled={
                    paginaActual <= 1
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-[#64748B] transition hover:bg-[#F7F7F7] hover:text-[#0056B3] disabled:cursor-not-allowed disabled:opacity-40"
                >

                  <ChevronLeft className="h-4 w-4" />

                  Anterior

                </button>

                {/* PAGINA ACTUAL */}

                <span className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0056B3] px-4 py-2 text-sm font-semibold text-white">
                  Página{' '}
                  {
                    paginacion.current_page
                  }{' '}
                  de{' '}
                  {
                    paginacion.last_page
                  }
                </span>

                {/* SIGUIENTE */}

                <button
                  type="button"
                  onClick={() =>
                    setPaginaActual(
                      (pagina) =>
                        Math.min(
                          paginacion.last_page,
                          pagina + 1
                        )
                    )
                  }
                  disabled={
                    paginaActual >=
                    paginacion.last_page
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-[#64748B] transition hover:bg-[#F7F7F7] hover:text-[#0056B3] disabled:cursor-not-allowed disabled:opacity-40"
                >

                  Siguiente

                  <ChevronRight className="h-4 w-4" />

                </button>

              </div>

            </div>

          </>

        )}

      </main>

      {/* ====================================================== */}
      {/* MODAL NUEVO / EDITAR */}
      {/* ====================================================== */}

      {mostrarModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* CABECERA */}

            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-5">

              <div>

                <h2 className="font-['Poppins'] text-xl font-bold text-[#1E293B]">
                  {
                    modoEdicion
                      ? 'Editar usuario'
                      : 'Nuevo usuario'
                  }
                </h2>

                <p className="mt-1 text-sm text-[#64748B]">
                  {
                    modoEdicion
                      ? 'Modifica los datos y el rol del usuario.'
                      : 'Registra una nueva cuenta en el sistema.'
                  }
                </p>

              </div>

              <button
                type="button"
                onClick={
                  cerrarModal
                }
                disabled={
                  guardando
                }
                className="rounded-lg p-2 text-[#64748B] transition hover:bg-[#F7F7F7] hover:text-[#1E293B] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            {/* FORMULARIO */}

            <form
              onSubmit={
                manejarGuardarUsuario
              }
              className="space-y-5 px-6 py-6"
            >

              {/* ERROR GENERAL */}

              {erroresFormulario.general && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">

                  <p className="text-sm text-[#E30613]">
                    {
                      erroresFormulario.general
                    }
                  </p>

                </div>
              )}

              {/* NOMBRE Y APELLIDO */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* NOMBRE */}

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-[#1E293B]">
                    Nombre *
                  </label>

                  <input
                    type="text"
                    value={
                      formulario.nombre
                    }
                    onChange={(e) =>
                      actualizarCampo(
                        'nombre',
                        e.target.value
                      )
                    }
                    placeholder="Ej. Juan"
                    className={`h-11 w-full rounded-lg border px-3 text-sm outline-none ${
                      erroresFormulario.nombre
                        ? 'border-[#E30613]'
                        : 'border-[#E2E8F0]'
                    } focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/20`}
                  />

                  {erroresFormulario.nombre && (
                    <p className="mt-1 text-xs text-[#E30613]">
                      {
                        erroresFormulario.nombre
                      }
                    </p>
                  )}

                </div>

                {/* APELLIDO PATERNO */}

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-[#1E293B]">
                    Apellido paterno *
                  </label>

                  <input
                    type="text"
                    value={
                      formulario.apellido_paterno
                    }
                    onChange={(e) =>
                      actualizarCampo(
                        'apellido_paterno',
                        e.target.value
                      )
                    }
                    placeholder="Ej. Pérez"
                    className={`h-11 w-full rounded-lg border px-3 text-sm outline-none ${
                      erroresFormulario.apellido_paterno
                        ? 'border-[#E30613]'
                        : 'border-[#E2E8F0]'
                    } focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/20`}
                  />

                  {erroresFormulario.apellido_paterno && (
                    <p className="mt-1 text-xs text-[#E30613]">
                      {
                        erroresFormulario.apellido_paterno
                      }
                    </p>
                  )}

                </div>

              </div>

              {/* APELLIDO MATERNO */}

              <div>

                <label className="mb-1.5 block text-sm font-semibold text-[#1E293B]">
                  Apellido materno
                </label>

                <input
                  type="text"
                  value={
                    formulario.apellido_materno
                  }
                  onChange={(e) =>
                    actualizarCampo(
                      'apellido_materno',
                      e.target.value
                    )
                  }
                  placeholder="Ej. García"
                  className="h-11 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/20"
                />

              </div>

              {/* CI */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-[#1E293B]">
                    CI *
                  </label>

                  <input
                    type="text"
                    value={
                      formulario.ci
                    }
                    onChange={(e) =>
                      actualizarCampo(
                        'ci',
                        e.target.value
                      )
                    }
                    placeholder="Ej. 1234567"
                    className={`h-11 w-full rounded-lg border px-3 text-sm outline-none ${
                      erroresFormulario.ci
                        ? 'border-[#E30613]'
                        : 'border-[#E2E8F0]'
                    } focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/20`}
                  />

                  {erroresFormulario.ci && (
                    <p className="mt-1 text-xs text-[#E30613]">
                      {
                        erroresFormulario.ci
                      }
                    </p>
                  )}

                </div>

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-[#1E293B]">
                    Extensión
                  </label>

                  <input
                    type="text"
                    value={
                      formulario.ci_extension
                    }
                    onChange={(e) =>
                      actualizarCampo(
                        'ci_extension',
                        e.target.value
                      )
                    }
                    placeholder="Ej. LP"
                    className="h-11 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/20"
                  />

                </div>

              </div>

              {/* CORREO */}

              {formulario.tipo_usuario !==
                'admin' && (

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-[#1E293B]">
                    Correo electrónico *
                  </label>

                  <input
                    type="email"
                    value={
                      formulario.email
                    }
                    onChange={(e) =>
                      actualizarCampo(
                        'email',
                        e.target.value
                      )
                    }
                    placeholder="correo@ejemplo.com"
                    className={`h-11 w-full rounded-lg border px-3 text-sm outline-none ${
                      erroresFormulario.email
                        ? 'border-[#E30613]'
                        : 'border-[#E2E8F0]'
                    } focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/20`}
                  />

                  {erroresFormulario.email && (
                    <p className="mt-1 text-xs text-[#E30613]">
                      {
                        erroresFormulario.email
                      }
                    </p>
                  )}

                </div>

              )}

              {/* CONTRASEÑA */}

              <div>

                <label className="mb-1.5 block text-sm font-semibold text-[#1E293B]">
                  Contraseña{' '}
                  {modoEdicion
                    ? ''
                    : '*'}
                </label>

                <input
                  type="password"
                  value={
                    formulario.password
                  }
                  onChange={(e) =>
                    actualizarCampo(
                      'password',
                      e.target.value
                    )
                  }
                  placeholder={
                    modoEdicion
                      ? 'Dejar vacío para conservar la actual'
                      : 'Mínimo 8 caracteres'
                  }
                  className={`h-11 w-full rounded-lg border px-3 text-sm outline-none ${
                    erroresFormulario.password
                      ? 'border-[#E30613]'
                      : 'border-[#E2E8F0]'
                  } focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/20`}
                />

                {erroresFormulario.password && (
                  <p className="mt-1 text-xs text-[#E30613]">
                    {
                      erroresFormulario.password
                    }
                  </p>
                )}

                {modoEdicion && (
                  <p className="mt-1 text-xs text-[#64748B]">
                    Si no desea cambiar la contraseña, deje este campo vacío.
                  </p>
                )}

              </div>

              {/* ROL */}

              <div>

                <label className="mb-1.5 block text-sm font-semibold text-[#1E293B]">
                  Rol *
                </label>

                <select
                  value={
                    formulario.tipo_usuario
                  }
                  onChange={(e) =>
                    actualizarCampo(
                      'tipo_usuario',
                      e.target.value
                    )
                  }
                  disabled={
                    cargandoRoles
                  }
                  className={`h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none ${
                    erroresFormulario.tipo_usuario
                      ? 'border-[#E30613]'
                      : 'border-[#E2E8F0]'
                  } focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/20 disabled:cursor-not-allowed disabled:bg-gray-100`}
                >

                  <option value="">
                    {cargandoRoles
                      ? 'Cargando roles...'
                      : 'Seleccione un rol'}
                  </option>

                  {roles.map(
                    (item) => (
                      <option
                        key={
                          item.codigo
                        }
                        value={
                          item.codigo
                        }
                      >
                        {
                          item.nombre
                        }
                      </option>
                    )
                  )}

                </select>

                {erroresFormulario.tipo_usuario && (
                  <p className="mt-1 text-xs text-[#E30613]">
                    {
                      erroresFormulario.tipo_usuario
                    }
                  </p>
                )}

              </div>

              {/* BOTONES */}

              <div className="flex flex-col-reverse gap-3 border-t border-[#E2E8F0] pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    cerrarModal
                  }
                  disabled={
                    guardando
                  }
                  className="min-h-11 rounded-lg border border-[#E2E8F0] px-5 py-3 text-sm font-semibold text-[#64748B] transition hover:bg-[#F7F7F7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    guardando
                  }
                  className="min-h-11 rounded-lg bg-[#0056B3] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#003770] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardando
                    ? modoEdicion
                      ? 'Guardando...'
                      : 'Creando...'
                    : modoEdicion
                      ? 'Guardar cambios'
                      : 'Crear usuario'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ====================================================== */}
      {/* MODAL CONFIRMAR ACTIVAR / DESACTIVAR */}
      {/* ====================================================== */}

      {usuarioEstado && (

        <ConfirmModal
          open={
            mostrarConfirmacion
          }

          onOpenChange={(
            abierto
          ) => {
            if (
              !abierto &&
              !cambiandoEstado
            ) {
              cerrarConfirmacionEstado()
            }
          }}

          title={
            usuarioEstado.activo
              ? 'Desactivar usuario'
              : 'Activar usuario'
          }

          description={
            usuarioEstado.activo
              ? `¿Está seguro de que desea desactivar la cuenta de ${obtenerNombreCompleto(usuarioEstado)}? El usuario no podrá iniciar sesión mientras su cuenta esté inactiva.`
              : `¿Está seguro de que desea activar nuevamente la cuenta de ${obtenerNombreCompleto(usuarioEstado)}? El usuario podrá iniciar sesión nuevamente.`
          }

          confirmText={
            cambiandoEstado
              ? 'Procesando...'
              : usuarioEstado.activo
                ? 'Desactivar'
                : 'Activar'
          }

          cancelText="Cancelar"

          onConfirm={
            cambiarEstadoUsuario
          }

          onCancel={
            cerrarConfirmacionEstado
          }

          variant={
            usuarioEstado.activo
              ? 'destructive'
              : 'default'
          }

          showCancel={
            !cambiandoEstado
          }
        />

      )}

    </div>
  )
}