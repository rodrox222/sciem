import React from 'react';
import { Edit3 } from 'lucide-react';
import type { Noticia } from '@/services/noticias.service';

interface NewsCardProps {
  noticia: Noticia;
  canEdit?: boolean;
  onEdit?: (noticia: Noticia) => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date).toUpperCase();
};

export const NewsCard: React.FC<NewsCardProps> = ({ noticia, canEdit, onEdit }) => {
  
  const isUrgent = noticia.prioridad === 'Urgente';
  const isHigh = noticia.prioridad === 'Alta';

  const badgeColor = isUrgent 
    ? 'bg-sci-red/10 text-sci-red border-sci-red/20' 
    : isHigh 
      ? 'bg-amber-50 text-amber-600 border-amber-200' 
      : 'bg-sci-cyan/10 text-sci-cyan border-sci-cyan/20';
      
  const headerTextColor = isUrgent ? 'text-sci-red' : isHigh ? 'text-amber-600' : 'text-sci-navy';

  return (
    <div className={`h-full flex flex-col rounded-2xl border ${isUrgent ? 'border-sci-red/40 bg-red-50/30' : 'border-slate-200 bg-white'} p-6 shadow-sm transition-all hover:shadow-md`}>

      {/* Encabezado */}
      <div className="mb-5 flex items-center justify-between">
        <span className={`text-xs font-bold uppercase tracking-[0.12em] ${headerTextColor}`}>
          {noticia.publico_objetivo === 'Todos' ? 'Aviso General' : `Aviso para ${noticia.publico_objetivo}`}
        </span>

        <div className="flex items-center gap-3">
          {/* Botón de edición condicional (Punto 4) */}
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit?.(noticia)}
              className="text-slate-400 hover:text-sci-blue transition-colors cursor-pointer"
              title="Editar aviso"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          )}
          <span className={`rounded-full border px-3 py-1 text-[10px] font-bold ${badgeColor}`}>
            {noticia.prioridad.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Titulo */}
      <h3 className={`text-xl font-extrabold leading-snug ${isUrgent ? 'text-sci-red' : 'text-[#092f63]'}`}>
        {noticia.titulo}
      </h3>

      {/* Descripcion (Punto 5: break-words evita el desbordamiento horizontal) */}
      <div className="flex-grow">
        <p className="mt-4 text-sm leading-6 text-slate-600 whitespace-pre-wrap break-words">
          {noticia.contenido}
        </p>
      </div>

      {/* Footer (Solo Fecha) */}
      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-end">
          <span className="text-[11px] font-semibold text-slate-400">
            {formatDate(noticia.created_at)}
          </span>
        </div>
      </div>

    </div>
  );
};