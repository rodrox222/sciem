import React, { useState, useEffect, type FormEvent } from 'react';
import { Megaphone, AlertCircle, LoaderCircle, Link2, BookOpen } from 'lucide-react';
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
import { materiasService, type Materia } from '@/services/materias.service';
import { api } from '@/services/api';

interface NuevaNoticiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  noticiaEditando?: Noticia | null;
}

interface ExamenOption {
  id: string;
  nombre?: string; 
  fecha?: string;
  hora_ini?: string;
  id_materia?: string;
  materia?: {
    id?: string;
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
  
  const userRole = (localStorage.getItem('user_role') ?? '').toLowerCase();
  const isDocente = userRole === 'docente';

  const [examenes, setExamenes] = useState<ExamenOption[]>([]); 
  const [loadingExamenes, setLoadingExamenes] = useState(false);
  const [misMaterias, setMisMaterias] = useState<Materia[]>([]);
  const [loadingMaterias, setLoadingMaterias] = useState(false);
  
  // Estados para controlar la UI de vinculación
  const [isVincularExamen, setIsVincularExamen] = useState(false);
  const [selectedMateriaName, setSelectedMateriaName] = useState<string>('');

  const [formData, setFormData] = useState<StoreNoticiaPayload>({
    titulo: '',
    contenido: '',
    publico_objetivo: isDocente ? 'Estudiantes' : 'Todos',
    es_publica: true,
    id_examen: null,
    id_materia: null,
  });

  // 1. Cargar exámenes y materias del docente al abrir el modal
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

        if (isDocente) {
          if (isMounted) setLoadingMaterias(true);
          materiasService.listMisMaterias()
            .then((res) => {
              if (isMounted) setMisMaterias(Array.isArray(res) ? res : []);
            })
            .catch((err) => {
              if (isMounted) console.error('Error al cargar materias:', err);
            })
            .finally(() => {
              if (isMounted) setLoadingMaterias(false);
            });
        }
      }, 0);
    }
    return () => { isMounted = false; };
  }, [isOpen, isDocente]);

  // 2. Inicializar los datos del formulario (Modo Crear vs Editar)
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (noticiaEditando) {
          const rawPub = noticiaEditando.publico_objetivo;
          const targetPub = (isDocente && rawPub === 'Todos') ? 'Estudiantes' : rawPub;

          setFormData({
            titulo: noticiaEditando.titulo,
            contenido: noticiaEditando.contenido,
            publico_objetivo: targetPub,
            es_publica: noticiaEditando.es_publica,
            id_examen: noticiaEditando.id_examen || null,
            id_materia: noticiaEditando.id_materia || null,
          });
          
          if (noticiaEditando.id_examen) {
            setIsVincularExamen(true);
          } else {
            setIsVincularExamen(false);
            setSelectedMateriaName('');
          }
        } else {
          setFormData({
            titulo: '',
            contenido: '',
            publico_objetivo: isDocente ? 'Estudiantes' : 'Todos',
            es_publica: true,
            id_examen: null,
            id_materia: null,
          });
          setIsVincularExamen(false);
          setSelectedMateriaName('');
        }
        setError('');
      }, 0);
    }
  }, [isOpen, noticiaEditando, isDocente]);

  // 3. Sincronizar la materia si estamos editando y los exámenes ya cargaron
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen && noticiaEditando?.id_examen && examenes.length > 0) {
        const exam = examenes.find(e => e.id === noticiaEditando.id_examen);
        if (exam?.materia?.nombre && selectedMateriaName !== exam.materia.nombre) {
          setSelectedMateriaName(exam.materia.nombre);
        }
      }
    }, 0);
    
    return () => clearTimeout(timer);
  }, [isOpen, noticiaEditando, examenes, selectedMateriaName]);

  // Manejador del Toggle "Vincular a Examen"
  const handleToggleVincular = (checked: boolean) => {
    setIsVincularExamen(checked);
    if (error) setError('');
    if (!checked) {
      if (!isDocente) {
        setSelectedMateriaName('');
      }
      setFormData(prev => ({ ...prev, id_examen: null }));
    } else {
      setFormData(prev => ({ ...prev, publico_objetivo: 'Estudiantes' }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo.trim()) {
      setError('Por favor, ingresa un título para el aviso.');
      return;
    }

    if (!formData.contenido.trim()) {
      setError('Por favor, proporciona una descripción detallada.');
      return;
    }

    if (isDocente) {
      if (formData.publico_objetivo === 'Todos') {
        setError('La opción "Todos" está restringida al administrador. Seleccione "Estudiantes" o "Docentes".');
        return;
      }
      if (!formData.id_materia) {
        setError('Debe seleccionar obligatoriamente una materia asignada para publicar la noticia.');
        return;
      }
    }

    if (isVincularExamen && !formData.id_examen) {
      setError('Si deseas vincular un examen, debes seleccionar el examen específico.');
      return;
    }

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

  // Filtrado de datos para los selectores de exámenes
  const materiasDisponibles = Array.from(
    new Set(examenes.map(ex => ex.materia?.nombre).filter(Boolean))
  ).sort() as string[];

  const examenesFiltrados = isDocente && formData.id_materia
    ? examenes.filter(ex => ex.id_materia === formData.id_materia || ex.materia?.id === formData.id_materia)
    : (selectedMateriaName
        ? examenes.filter(ex => ex.materia?.nombre === selectedMateriaName)
        : examenes);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-0 shadow-xl border-slate-200 max-h-[90vh] overflow-y-auto flex flex-col">
        
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-sci-navy">
              <Megaphone className="h-5 w-5 text-sci-cyan" />
              {noticiaEditando ? 'Editar Noticia' : 'Publicar Noticia'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              {noticiaEditando 
                ? 'Modifica los datos de la noticia. Asegúrate de revisar a quién va dirigida.' 
                : 'Crea un aviso para los usuarios o vincúlalo a una materia/examen.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-6 pb-6 pt-2 space-y-5">
          {/* AVISO DE ERROR */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-sci-red/20 bg-sci-red/5 p-3.5 text-sm text-sci-red font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-sci-navy uppercase tracking-wider">Título del Aviso</label>
              <Input
                maxLength={255}
                placeholder="Ej: Cambio de aula, Retraso..."
                value={formData.titulo}
                onChange={(e) => {
                  setFormData({ ...formData, titulo: e.target.value });
                  if (error) setError('');
                }}
                className="text-sm font-medium transition-all duration-200 focus-visible:ring-sci-cyan"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-sci-navy uppercase tracking-wider">Descripción detallada</label>
              <textarea
                rows={3}
                placeholder="Proporciona más detalles..."
                className="w-full min-h-[100px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sci-cyan transition-all duration-200"
                value={formData.contenido}
                onChange={(e) => {
                  setFormData({ ...formData, contenido: e.target.value });
                  if (error) setError('');
                }}
              />
            </div>

            {/* SELECCIÓN OBLIGATORIA DE MATERIA PARA DOCENTES */}
            {isDocente && (
              <div className="space-y-1.5 rounded-xl border border-sci-navy/15 bg-slate-50/70 p-3.5">
                <label className="text-xs font-semibold text-sci-navy uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-sci-navy" />
                    Materia <span className="text-sci-red">*</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">Requerida para docentes</span>
                </label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-sci-cyan focus:ring-2 focus:outline-none transition-all duration-200 disabled:opacity-50"
                  value={formData.id_materia || ''}
                  onChange={(e) => {
                    const matId = e.target.value;
                    const selected = misMaterias.find(m => m.id === matId);
                    setFormData(prev => ({
                      ...prev,
                      id_materia: matId || null,
                      id_examen: null,
                    }));
                    setSelectedMateriaName(selected?.nombre || '');
                    if (error) setError('');
                  }}
                  disabled={loadingMaterias || misMaterias.length === 0}
                >
                  <option value="" disabled>Seleccione una de sus materias asignadas...</option>
                  {misMaterias.map((mat) => (
                    <option key={mat.id} value={mat.id}>
                      {mat.codigo ? `[${mat.codigo}] ` : ''}{mat.nombre}
                    </option>
                  ))}
                </select>
                {misMaterias.length === 0 && !loadingMaterias && (
                  <p className="text-xs text-amber-600">No tienes materias asignadas actualmente.</p>
                )}
              </div>
            )}
          </div>

          <div className={`rounded-xl border transition-all duration-300 ${isVincularExamen ? 'border-sci-cyan/40 bg-sci-cyan/5' : 'border-border bg-slate-50/50'}`}>
            <div className="p-4 flex items-center gap-3">
              <input
                type="checkbox"
                id="toggle-vincular"
                checked={isVincularExamen}
                onChange={(e) => handleToggleVincular(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-sci-cyan focus:ring-sci-cyan transition-all cursor-pointer"
              />
              <label htmlFor="toggle-vincular" className="text-sm font-semibold text-sci-navy cursor-pointer flex items-center gap-2 select-none">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                Vincular a un examen específico (opcional)
              </label>
            </div>

            {isVincularExamen && (
              <div className="px-4 pb-5 pt-2 flex flex-col gap-4 border-t border-sci-cyan/10">
                {!isDocente && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      1. Materia
                    </label>
                    <select
                      className="w-full truncate rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-sci-cyan focus:ring-2 focus:outline-none transition-all duration-200 disabled:opacity-50"
                      value={selectedMateriaName}
                      onChange={(e) => {
                        setSelectedMateriaName(e.target.value);
                        setFormData(prev => ({ ...prev, id_examen: null }));
                        if (error) setError('');
                      }}
                      disabled={loadingExamenes || materiasDisponibles.length === 0}
                    >
                      <option value="" disabled>Seleccione una materia...</option>
                      {materiasDisponibles.map((mat) => (
                        <option key={mat} value={mat}>{mat}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {isDocente ? 'Examen asignado' : '2. Examen / Horario'}
                  </label>
                  <select
                    className="w-full truncate rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-sci-cyan focus:ring-2 focus:outline-none transition-all duration-200 disabled:opacity-50"
                    value={formData.id_examen || ''}
                    onChange={(e) => {
                      const exId = e.target.value || null;
                      const exObj = examenes.find(x => x.id === exId);
                      setFormData(prev => ({
                        ...prev,
                        id_examen: exId,
                        id_materia: exObj?.id_materia || exObj?.materia?.id || prev.id_materia,
                      }));
                      if (error) setError('');
                    }}
                    disabled={(isDocente ? !formData.id_materia : !selectedMateriaName) || loadingExamenes}
                  >
                    <option value="" disabled>Seleccione un examen...</option>
                    {examenesFiltrados.map((ex) => {
                      const nombreExamen = ex.nombre || 'Examen';
                      const fecha = ex.fecha ? ex.fecha.substring(0, 10) : '';
                      const hora = ex.hora_ini ? ex.hora_ini.substring(0, 5) : '';
                      return (
                        <option key={ex.id} value={ex.id}>
                          {nombreExamen} {fecha && hora ? ` - ${fecha} (${hora})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  {examenesFiltrados.length === 0 && (
                    <p className="text-xs text-muted-foreground">No hay exámenes registrados para esta materia.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-border">
            <div className="space-y-1.5 w-full sm:w-3/5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-sci-navy">Público Objetivo</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-sci-cyan focus:outline-none transition-all duration-200 disabled:opacity-50"
                value={formData.publico_objetivo}
                onChange={(e) => setFormData({ ...formData, publico_objetivo: e.target.value as StoreNoticiaPayload['publico_objetivo'] })}
                disabled={isVincularExamen} 
              >
                {!isDocente && <option value="Todos">Todos</option>}
                <option value="Estudiantes">Solo Estudiantes</option>
                <option value="Docentes">Solo Docentes</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pb-2 w-full sm:w-auto">
              <input
                type="checkbox"
                id="es_publica"
                checked={formData.es_publica}
                onChange={(e) => setFormData({ ...formData, es_publica: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-sci-cyan focus:ring-sci-cyan cursor-pointer transition-all"
              />
              <label htmlFor="es_publica" className="text-sm font-semibold text-sci-navy cursor-pointer select-none">
                Hacer Pública
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="rounded-lg transition-all duration-200 hover:bg-slate-100">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-sci-blue text-white hover:opacity-90 transition-all duration-200 rounded-lg shadow-sm">
              {loading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {noticiaEditando ? 'Guardar Cambios' : 'Publicar Noticia'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
