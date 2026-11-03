import { Edit3, QrCode, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { EstudianteInscritoExamen } from '@/services/estudiantes.service'

interface EstudiantesTableProps {
  students: EstudianteInscritoExamen[]
  canManage: boolean
  isOffline: boolean
  onVerQr: (student: EstudianteInscritoExamen) => void
  onPrerrequisitos: (student: EstudianteInscritoExamen) => void
  onEditar: (student: EstudianteInscritoExamen) => void
  onInhabilitar: (student: EstudianteInscritoExamen) => void
}

export function EstudiantesTable({
  students,
  canManage,
  isOffline,
  onVerQr,
  onPrerrequisitos,
  onEditar,
  onInhabilitar,
}: EstudiantesTableProps) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <Table className="text-xs">
        <TableHeader className="bg-muted/40 font-semibold text-muted-foreground">
          <TableRow className="border-b border-border hover:bg-transparent">
            <TableHead className="px-5 py-3.5">Estudiante</TableHead>
            <TableHead className="px-5 py-3.5">Código SIS</TableHead>
            <TableHead className="px-5 py-3.5">C.I.</TableHead>
            <TableHead className="px-5 py-3.5">Correo</TableHead>
            <TableHead className="px-5 py-3.5">Estado</TableHead>
            <TableHead className="px-5 py-3.5 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className="divide-y divide-border">
          {students.map((st) => (
            <TableRow key={st.id} className="hover:bg-muted/20">
              <TableCell className="px-5 py-3.5 font-bold text-sci-navy">
                {st.nombre_completo}
              </TableCell>

              <TableCell className="px-5 py-3.5 text-muted-foreground">
                {st.codigo_sis}
              </TableCell>

              <TableCell className="px-5 py-3.5 text-muted-foreground">
                {st.ci} {st.ci_extension ?? ''}
              </TableCell>

              <TableCell className="px-5 py-3.5 text-muted-foreground">
                {st.email_institucional}
              </TableCell>

              <TableCell className="px-5 py-3.5">
                <div className="flex flex-col gap-0.5">
                  <Badge
                    variant={st.estado === 'Habilitado' ? 'secondary' : 'destructive'}
                    className={`w-fit text-[11px] font-semibold ${
                      st.estado === 'Habilitado'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                        : 'border-red-500/30 bg-red-500/10 text-red-600'
                    }`}
                  >
                    {st.estado}
                  </Badge>
                  {st.estado === 'Inhabilitado' && st.motivo_estado && (
                    <span
                      title={st.motivo_estado}
                      className="max-w-44 truncate text-[10px] text-muted-foreground"
                    >
                      {st.motivo_estado}
                    </span>
                  )}
                </div>
              </TableCell>

              <TableCell className="px-5 py-3.5 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title="Ver Credencial QR"
                    onClick={() => onVerQr(st)}
                    className="h-8 w-8 p-0 cursor-pointer"
                  >
                    <QrCode className="h-3.5 w-3.5 text-sci-cyan" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isOffline}
                    title={isOffline ? 'No disponible offline' : 'Gestionar prerrequisitos'}
                    onClick={() => onPrerrequisitos(st)}
                    className="h-8 text-xs cursor-pointer gap-1 disabled:opacity-50"
                  >
                    Prerrequisitos
                  </Button>

                  {canManage && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isOffline}
                        title={isOffline ? 'No disponible offline' : 'Editar'}
                        onClick={() => onEditar(st)}
                        className="h-8 text-xs gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Edit3 className="h-3 w-3" /> Editar
                      </Button>

                      {st.estado !== 'Inhabilitado' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isOffline}
                          title={isOffline ? 'No disponible offline' : 'Inhabilitar'}
                          onClick={() => onInhabilitar(st)}
                          className="h-8 text-xs text-sci-red hover:text-sci-red gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <UserX className="h-3 w-3" /> Inhabilitar
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}

          {students.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                No hay estudiantes registrados para este examen.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}