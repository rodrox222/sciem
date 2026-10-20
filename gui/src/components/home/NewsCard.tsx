import React from 'react';
import type { Noticia } from '@/services/noticias.service';

interface NewsCardProps {
  noticia: Noticia;
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

export const NewsCard: React.FC<NewsCardProps> = ({ noticia }) => {
  
  // Configuración visual según prioridad
  const isUrgent = noticia.prioridad === 'Urgente';
  const isHigh = noticia.prioridad === 'Alta';

  const badgeColor = isUrgent 
    ? 'bg-sci-red/10 text-sci-red border-sci-red/20' 
    : isHigh 
      ? 'bg-amber-50 text-amber-600 border-amber-200' 
      : 'bg-sci-cyan/10 text-sci-cyan border-sci-cyan/20';
      
  const headerTextColor = isUrgent ? 'text-sci-red' : isHigh ? 'text-amber-600' : 'text-sci-navy';

  return (
    <div className={`h-full rounded-2xl border ${isUrgent ? 'border-sci-red/40 bg-red-50/30' : 'border-slate-200 bg-white'} p-6 shadow-sm transition-all hover:shadow-md`}>

      {/* Encabezado */}
      <div className="mb-5 flex items-center justify-between">
        <span className={`text-xs font-bold uppercase tracking-[0.12em] ${headerTextColor}`}>
          {noticia.publico_objetivo === 'Todos' ? 'Aviso General' : `Aviso para ${noticia.publico_objetivo}`}
        </span>

        <span className={`rounded-full border px-3 py-1 text-[10px] font-bold ${badgeColor}`}>
          {noticia.prioridad.toUpperCase()}
        </span>
      </div>

      {/* Título */}
      <h3 className={`text-xl font-extrabold leading-snug ${isUrgent ? 'text-sci-red' : 'text-[#092f63]'}`}>
        {noticia.titulo}
      </h3>

      {/* Descripción */}
      <p className="mt-4 text-sm leading-6 text-slate-600 whitespace-pre-wrap">
        {noticia.contenido}
      </p>

      {/* Footer (Fecha y Autor) */}
      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between">
          <span className="rounded-lg bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
            {noticia.autor.nombre} {noticia.autor.apellido_paterno}
          </span>

          <span className="text-[11px] font-semibold text-slate-400">
            {formatDate(noticia.created_at)}
          </span>
        </div>
      </div>

    </div>
  );
};