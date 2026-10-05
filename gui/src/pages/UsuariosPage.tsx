import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ConfirmModal'

import { UsuarioFilters } from '@/components/usuarios/UsuarioFilters'
import { UsuarioCard } from '@/components/usuarios/UsuarioCard'
import { UsuarioFormModal } from '@/components/usuarios/UsuarioFormModal'
import { UsuariosPagination } from '@/components/usuarios/UsuariosPagination'

import {
  usuariosService,
  type Usuario,
  type Rol,
  type UsuarioPayload,
} from '@/services/usuarios.service'

import type { PaginatedResponse } from '@/types/api'

export default function UsuariosPage() {
  // ============================================================
  // ESTADO DE USUARIOS
  // ============================================================

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [roles, setRoles] = useState<Rol[]>([])

  // ============================================================
  // FILTROS
  // ============================================================

  const [busqueda, setBusqueda] = useState('')
  const [rol, setRol] = useState('')
  const [estado, setEstado] = useState('')

  // ============================================================
  // PAGINACIÓN
  // ============================================================

  const [paginaActual, setPaginaActual] = useState(1)

  const [paginacion, setPaginacion] =
    useState<PaginatedResponse<Usuario>>({
      current_page: 1,
      last_page: 1,
      total: 0,
      per_page: 10,
      from: null,
      to: null,
      data: [],
    })

  // ============================================================
  // CARGA Y ERRORES
  // ============================================================

  const [cargando, setCargando] = useState(true)
  const [cargandoRoles, setCargandoRoles] = useState(true)

  const [error, setError] = useState('')
  const [errorRoles, setErrorRoles] = useState('')

  // ============================================================
  // FORMULARIO CREAR / EDITAR
  // ============================================================

  const [mostrarModal, setMostrarModal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [usuarioEditando, setUsuarioEditando] =
    useState<Usuario | null>(null)

  const [guardando, setGuardando] = useState(false)
  const [resultadoFormulario, setResultadoFormulario] = useState('')

  // ============================================================
  // CAMBIO DE ESTADO
  // ============================================================

  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const [usuarioEstado, setUsuarioEstado] = useState<Usuario | null>(null)

  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [resultadoEstado, setResultadoEstado] = useState('')

  // ============================================================
  // CARGAR USUARIOS
  // ============================================================

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
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los usuarios.',
      )
    } finally {
      setCargando(false)
    }
  }

  // ============================================================
  // CARGAR ROLES
  // ============================================================

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

  // ============================================================
  // EFECTO PARA CARGAR USUARIOS
  // ============================================================

  useEffect(() => {
    cargarUsuarios()
  }, [busqueda, rol, estado, paginaActual])

  // ============================================================
  // REINICIAR PAGINACIÓN AL CAMBIAR FILTROS
  // ============================================================

  useEffect(() => {
    if (paginaActual !== 1) {
      setPaginaActual(1)
    }
  }, [busqueda, rol, estado])

  // ============================================================
  // UTILIDADES
  // ============================================================

  const obtenerNombreRol = (codigoRol: string) => {
    const rolEncontrado = roles.find(
      (item) => item.codigo === codigoRol,
    )

    return rolEncontrado?.nombre || codigoRol
  }

  // ============================================================
  // FILTROS
  // ============================================================

  const manejarBusqueda = (valor: string) => {
    setBusqueda(valor)
  }

  const manejarRol = (valor: string) => {
    setRol(valor === 'todos' ? '' : valor)
  }

  const manejarEstado = (valor: string) => {
    setEstado(valor === 'todos' ? '' : valor)
  }

  // ============================================================
  // CREAR USUARIO
  // ============================================================

  const abrirModalNuevoUsuario = () => {
    setModoEdicion(false)
    setUsuarioEditando(null)
    setResultadoFormulario('')
    setMostrarModal(true)
  }

  // ============================================================
  // EDITAR USUARIO
  // ============================================================

  const abrirModalEditarUsuario = (usuario: Usuario) => {
    setModoEdicion(true)
    setUsuarioEditando(usuario)
    setResultadoFormulario('')
    setMostrarModal(true)
  }

  // ============================================================
  // CERRAR FORMULARIO
  // ============================================================

  const cerrarModal = () => {
    if (guardando) return

    setMostrarModal(false)
    setModoEdicion(false)
    setUsuarioEditando(null)
    setResultadoFormulario('')
  }

  // ============================================================
  // GUARDAR USUARIO
  // ============================================================

  const manejarGuardarUsuario = async (
    payload: UsuarioPayload,
  ) => {
    try {
      setGuardando(true)

      if (modoEdicion && usuarioEditando) {
        await usuariosService.update(
          usuarioEditando.id,
          payload,
        )

        setResultadoFormulario(
          'Usuario actualizado correctamente.',
        )
      } else {
        await usuariosService.create(payload)

        setResultadoFormulario(
          'Usuario creado correctamente.',
        )
      }

      await cargarUsuarios()
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el usuario.',
      )
    } finally {
      setGuardando(false)
    }
  }

  // ============================================================
  // CONFIRMACIÓN DE CAMBIO DE ESTADO
  // ============================================================

  const abrirConfirmacionEstado = (usuario: Usuario) => {
    setUsuarioEstado(usuario)
    setResultadoEstado('')
    setMostrarConfirmacion(true)
  }

  // ============================================================
  // CERRAR CONFIRMACIÓN
  // ============================================================

  const cerrarConfirmacionEstado = () => {
    if (cambiandoEstado) return

    setMostrarConfirmacion(false)
    setUsuarioEstado(null)
    setResultadoEstado('')
  }

  // ============================================================
  // CAMBIAR ESTADO DEL USUARIO
  // ============================================================

  const cambiarEstadoUsuario = async () => {
    if (!usuarioEstado) return

    try {
      setCambiandoEstado(true)

      if (usuarioEstado.activo) {
        await usuariosService.desactivar(usuarioEstado.id)

        setResultadoEstado(
          'Usuario desactivado correctamente.',
        )
      } else {
        await usuariosService.activar(usuarioEstado.id)

        setResultadoEstado(
          'Usuario activado correctamente.',
        )
      }

      await cargarUsuarios()
    } catch (err) {
      setResultadoEstado(
        err instanceof Error
          ? err.message
          : 'Error al cambiar estado.',
      )
    } finally {
      setCambiandoEstado(false)
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6">
      {/* ========================================================
          ENCABEZADO
      ======================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
            Administración del Sistema
          </span>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-sci-navy sm:text-3xl">
            Gestión de usuarios
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Administra las cuentas, roles y accesos oficiales al
            sistema SCI.
          </p>
        </div>

        <Button
          type="button"
          onClick={abrirModalNuevoUsuario}
          className="cursor-pointer gap-2 bg-sci-blue font-semibold text-white shadow-xs hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      {/* ========================================================
          FILTROS
      ======================================================== */}

      <UsuarioFilters
        busqueda={busqueda}
        rol={rol || 'todos'}
        estado={estado || 'todos'}
        roles={roles}
        cargandoRoles={cargandoRoles}
        errorRoles={errorRoles}
        onBusquedaChange={manejarBusqueda}
        onRolChange={manejarRol}
        onEstadoChange={manejarEstado}
      />

      {/* ========================================================
          LISTA DE USUARIOS
      ======================================================== */}

      {cargando ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          Cargando registros de usuarios...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-sci-red/20 bg-sci-red/10 p-8 text-center text-sm font-medium text-sci-red">
          {error}
        </div>
      ) : usuarios.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          No se encontraron usuarios registrados con los
          filtros seleccionados.
        </div>
      ) : (
        <div className="space-y-3">
          {usuarios.map((usuario) => (
            <UsuarioCard
              key={usuario.id}
              usuario={usuario}
              nombreRol={obtenerNombreRol(usuario.tipo_usuario)}
              onEditar={abrirModalEditarUsuario}
              onCambiarEstado={abrirConfirmacionEstado}
              cambiandoEstado={cambiandoEstado}
            />
          ))}
        </div>
      )}

      {/* ========================================================
          PAGINACIÓN
      ======================================================== */}

      <UsuariosPagination
        paginacion={paginacion}
        paginaActual={paginaActual}
        onPaginaChange={setPaginaActual}
      />

      {/* ========================================================
          MODAL CREAR / EDITAR
      ======================================================== */}

      <UsuarioFormModal
        open={mostrarModal}
        modoEdicion={modoEdicion}
        usuario={usuarioEditando}
        roles={roles}
        cargandoRoles={cargandoRoles}
        guardando={guardando}
        error=""
        resultado={resultadoFormulario}
        onOpenChange={(abierto) => {
          if (!abierto) {
            cerrarModal()
          } else {
            setMostrarModal(true)
          }
        }}
        onSubmit={manejarGuardarUsuario}
      />

      {/* ========================================================
          CONFIRMACIÓN DE ESTADO
      ======================================================== */}

      {usuarioEstado && (
        <ConfirmModal
          open={mostrarConfirmacion}
          onOpenChange={(abierto) => {
            if (!abierto && !cambiandoEstado) {
              cerrarConfirmacionEstado()
            }
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
                ? `¿Está seguro de desactivar la cuenta de ${[usuarioEstado.nombre, usuarioEstado.apellido_paterno, usuarioEstado.apellido_materno]
                    .filter(Boolean)
                    .join(
                      ' ',
                    )}? No podrá ingresar al sistema.`
                : `¿Desea habilitar nuevamente el acceso para ${[usuarioEstado.nombre, usuarioEstado.apellido_paterno, usuarioEstado.apellido_materno]
                    .filter(Boolean)
                    .join(' ')}?`
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
          onConfirm={
            resultadoEstado
              ? cerrarConfirmacionEstado
              : cambiarEstadoUsuario
          }
          onCancel={cerrarConfirmacionEstado}
          variant={
            usuarioEstado.activo
              ? 'destructive'
              : 'default'
          }
          showCancel={
            !cambiandoEstado && !resultadoEstado
          }
        />
      )}
    </div>
  )
}