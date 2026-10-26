import React from 'react';
import { Edit3, Trash2, Megaphone, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Noticia } from '@/services/noticias.service';

interface NewsCardProps {
  noticia: Noticia;
  canManage?: boolean;
  onEdit?: (noticia: Noticia) => void;
  onDelete?: (noticia: Noticia) => void;
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

export const NewsCard: React.FC<NewsCardProps> = ({ noticia, canManage, onEdit, onDelete }) => {
  
  // Verificamos si la noticia pertenece a un examen
  const isExamNotice = !!noticia.id_examen;

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-all hover:shadow-md border-border/60">
      <CardHeader className={`pb-4 ${isExamNotice ? 'bg-sci-cyan/5' : 'bg-slate-50/50'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            {isExamNotice ? (
              <CalendarClock className="h-4 w-4 text-sci-blue" />
            ) : (
              <Megaphone className="h-4 w-4 text-sci-cyan" />
            )}
            <span className={`text-xs font-bold uppercase tracking-wider ${isExamNotice ? 'text-sci-blue' : 'text-sci-navy'}`}>
              {isExamNotice 
                ? 'Noticia de Examen' 
                : noticia.publico_objetivo === 'Todos' ? 'Noticia General' : `Noticia: ${noticia.publico_objetivo}`}
            </span>
          </div>

          {canManage && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-sci-blue"
                onClick={() => onEdit?.(noticia)}
                title="Editar noticia"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-sci-red hover:bg-sci-red/10"
                onClick={() => onDelete?.(noticia)}
                title="Eliminar noticia"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <h3 className="mt-2 text-lg font-bold leading-tight text-sci-navy line-clamp-2">
          {noticia.titulo}
        </h3>
      </CardHeader>

      <CardContent className="flex-grow pt-4">
        <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap break-words">
          {noticia.contenido}
        </p>
      </CardContent>

      <CardFooter className="border-t border-slate-100 bg-slate-50/30 py-3 mt-auto">
        <div className="flex w-full items-center justify-end">
          <span className="text-[11px] font-medium text-slate-500">
            {formatDate(noticia.created_at)}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
};