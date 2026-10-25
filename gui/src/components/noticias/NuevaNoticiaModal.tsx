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
import { api } from '@/services/api';

interface NuevaNoticiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  noticiaEditando?: Noticia | null;
}

// Ampliamos la interfaz para recibir la fecha y hora del examen
interface ExamenOption {
  id: string;
  fecha?: string;
  hora_ini?: string;
  materia?: {
    nombre?: string;
  };
}

export const NuevaNoticiaModal: React.FC<NuevaNoticiaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  noticiaEditando,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [examenes, setExamenes] = useState<ExamenOption[]>([]); 
  const [loadingExamenes, setLoadingExamenes] = useState(false);

  const [formData, setFormData] = useState<StoreNoticiaPayload>({
    titulo: '',
    contenido: '',
    publico_objetivo: 'Todos',
    es_publica: true,
    id_examen: null,
  });

  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      setTimeout(() => {
        if (isMounted) setLoadingExamenes(true);
        
        api.get('/examenes?per_page=50')
          .then((res: unknown) => {
            if (!isMounted) return;
            const typedRes = res as { data?: { data?: ExamenOption[] } | ExamenOption[] };
            const payloadData = typedRes.data;
            const finalData = (payloadData as { data?: ExamenOption[] })?.data || payloadData || [];
            
            setExamenes(Array.isArray(finalData) ? finalData : []);
          })
          .catch((err) => {
            if (isMounted) console.error(err);
          })
          .finally(() => {
            if (isMounted) setLoadingExamenes(false);
          });
      }, 0);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (noticiaEditando) {
          setFormData({
            titulo: noticiaEditando.titulo,
            contenido: noticiaEditando.contenido,
            publico_objetivo: noticiaEditando.publico_objetivo,
            es_publica: noticiaEditando.es_publica,
            id_examen: noticiaEditando.id_examen || null,
          });
        } else {
          setFormData({
            titulo: '',
            contenido: '',
            publico_objetivo: 'Todos',
            es_publica: true,
            id_examen: null,
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
            {noticiaEditando ? 'Editar Noticia' : 'Publicar Noticia'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {noticiaEditando 
              ? 'Modifica los datos de la noticia existente.' 
              : 'Si asocias un examen, la noticia desaparecerá al finalizar el mismo.'}
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
              placeholder="Ej: Cambio de aula, Retraso..."
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              className="text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-sci-navy">Descripción detallada</label>
            {/* CORRECCIÓN: Agregada la clase resize-none para evitar que el usuario deforme el diseño */}
            <textarea
              required
              rows={3}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={formData.contenido}
              onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-sci-navy">
              Vincular a Examen <span className="text-muted-foreground font-normal">(Opcional)</span>
            </label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              value={formData.id_examen || ''}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ 
                  ...formData, 
                  id_examen: val || null,
                  publico_objetivo: val ? 'Estudiantes' : formData.publico_objetivo 
                });
              }}
              disabled={loadingExamenes}
            >
              <option value="">Ninguno (Noticia General)</option>
              {examenes.map((ex) => {
                // CORRECCIÓN: Formateo limpio mostrando Materia primero, luego fecha y hora
                const materia = ex.materia?.nombre || 'Examen sin materia';
                const fecha = ex.fecha ? ex.fecha.substring(0, 10) : '';
                const hora = ex.hora_ini ? ex.hora_ini.substring(0, 5) : '';
                return (
                  <option key={ex.id} value={ex.id}>
                    {materia} {fecha && hora ? ` - ${fecha} (${hora})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-sci-navy">Público Objetivo</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                value={formData.publico_objetivo}
                onChange={(e) => setFormData({ ...formData, publico_objetivo: e.target.value as StoreNoticiaPayload['publico_objetivo'] })}
                disabled={!!formData.id_examen}
              >
                <option value="Todos">Todos</option>
                <option value="Docentes">Solo Docentes</option>
                <option value="Estudiantes">Solo Estudiantes</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="es_publica"
                checked={formData.es_publica}
                onChange={(e) => setFormData({ ...formData, es_publica: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-sci-cyan"
              />
              <label htmlFor="es_publica" className="text-sm font-medium text-sci-navy">
                Hacer Pública
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-sci-blue text-white hover:opacity-90">
              {loading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {noticiaEditando ? 'Guardar Cambios' : 'Publicar Noticia'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};