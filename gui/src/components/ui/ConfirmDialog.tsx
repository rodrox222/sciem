import React from 'react';
import { Trash2, LoaderCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  itemName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  itemName,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-3xl border-border shadow-2xl">
        
        <DialogHeader className="p-6 pb-2 text-left">
          {/* Contenedor Superior: Ícono + Títulos (Alineados al centro verticalmente) */}
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sci-red/10 text-sci-red">
              <Trash2 className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-sci-red">
                ATENCIÓN / ADVERTENCIA
              </span>
              <DialogTitle className="text-xl font-black text-sci-navy">
                {title}
              </DialogTitle>
            </div>
          </div>
          
          {/* Contenedor Inferior: Descripción abarcando el 100% del ancho */}
          <DialogDescription className="text-sm text-slate-500 mt-4 leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Recuadro de detalles */}
        {itemName && (
          <div className="px-6 py-4">
            <div className="rounded-xl border border-border bg-slate-50 p-4">
              <p className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                Registro seleccionado
              </p>
              <p className="text-sm font-semibold text-sci-navy line-clamp-2">
                {itemName}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-border bg-slate-50/50 px-6 py-4 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl px-6 font-semibold shadow-sm cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-[#e11d48] px-6 text-white hover:bg-[#be123c] font-bold shadow-sm cursor-pointer"
          >
            {loading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar noticia
          </Button>
        </div>
        
      </DialogContent>
    </Dialog>
  );
};