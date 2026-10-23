import React, { useState, useEffect, type FormEvent } from 'react';
import { Megaphone, AlertCircle, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { noticiasService, type StoreNoticiaPayload, type Noticia } from '@/services/noticias.service';

interface NuevaNoticiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  noticiaEditando?: Noticia | null;
}

export const NuevaNoticiaModal: React.FC<NuevaNoticiaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  noticiaEditando,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<StoreNoticiaPayload>({
    titulo: '',
    contenido: '',
    prioridad: 'Normal',
    publico_objetivo: 'Todos',
    es_publica: true,
  });

  useEffect(() => {
    if (isOpen) {
      // CORRECCIÓN: Se utiliza setTimeout para diferir la asignación de estado y evitar la advertencia de cascading renders
      setTimeout(() => {
        if (noticiaEditando) {
          setFormData({
            titulo: noticiaEditando.titulo,
            contenido: noticiaEditando.contenido,
            prioridad: noticiaEditando.prioridad,
            publico_objetivo: noticiaEditando.publico_objetivo,
            es_publica: noticiaEditando.es_publica,
          });
        } else {
          setFormData({
            titulo: '',
            contenido: '',
            prioridad: 'Normal',
            publico_objetivo: 'Todos',
            es_publica: true,
          });
        }
        setError('');
      }, 0);
    }
  }, [isOpen, noticiaEditando]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (noticiaEditando) {
        await noticiasService.update(noticiaEditando.id, formData);
      } else {
        await noticiasService.store(formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      // CORRECCIÓN: Se elimina 'any' y se comprueba la instancia de Error
      setError(err instanceof Error ? err.message : 'Error al guardar la noticia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-sci-navy">
            <Megaphone className="h-5 w-5 text-sci-cyan" />
            {noticiaEditando ? 'Editar Aviso Operativo' : 'Publicar Aviso Operativo'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {noticiaEditando 
              ? 'Modifica los datos del comunicado existente.' 
              : 'Crea un comunicado general. Si marcas "Es Pública", se verá en la pantalla de inicio.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-sci-red/20 bg-sci-red/10 p-3 text-xs text-sci-red">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-sci-navy">Título</label>
            <Input
              required
              maxLength={255}
              placeholder="Ej: Cambio de aula, Asueto, Inundación..."
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              className="text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-sci-navy">Descripción detallada</label>
            <textarea
              required
              rows={4}
              placeholder="Escribe el contenido del comunicado..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={formData.contenido}
              onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-sci-navy">Prioridad</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.prioridad}
                onChange={(e) => setFormData({ ...formData, prioridad: e.target.value as StoreNoticiaPayload['prioridad'] })}
              >
                <option value="Normal">Normal</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente (Rojo)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-sci-navy">Público</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.publico_objetivo}
                onChange={(e) => setFormData({ ...formData, publico_objetivo: e.target.value as StoreNoticiaPayload['publico_objetivo'] })}
              >
                <option value="Todos">Todos</option>
                <option value="Docentes">Solo Docentes</option>
                <option value="Estudiantes">Solo Estudiantes</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="es_publica"
              checked={formData.es_publica}
              onChange={(e) => setFormData({ ...formData, es_publica: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-sci-cyan focus:ring-sci-cyan"
            />
            <label htmlFor="es_publica" className="text-sm font-medium text-sci-navy">
              Hacer visible en la página de inicio (Pública)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-sci-blue text-white hover:opacity-90">
              {loading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {noticiaEditando ? 'Guardar Cambios' : 'Publicar Aviso'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};