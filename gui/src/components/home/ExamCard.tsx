import React from 'react';
import { Button } from '@/components/ui/button';

interface ExamCardProps {
  materia: string;
  aula: string;
  horario: string;
  tipoBorde?: 'cyan' | 'amber';
  onDetails: () => void;
  estado?: string;
}

export const ExamCard: React.FC<ExamCardProps> = ({
  materia,
  aula,
  horario,
  tipoBorde = 'cyan',
  onDetails,
  estado = 'Programado',
}) => {
  const borderClasses = tipoBorde === 'cyan' ? 'border-t-sci-cyan' : 'border-t-sci-amber';
  const tagClasses = tipoBorde === 'cyan' 
    ? 'border-sci-cyan/30 text-sci-cyan bg-sci-cyan/10' 
    : 'border-sci-amber/30 text-sci-amber bg-sci-amber/10';

  return (
    <div className={`bg-card rounded-xl p-5 border-t-4 ${borderClasses} border-x border-b border-border shadow-xs flex flex-col justify-between`}>
      <div>
        <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${tagClasses} mb-3`}>
          {estado}
        </span>
        <div className="flex justify-between items-start gap-3">
          <div>
            <h3 className="text-base font-bold text-foreground">{materia}</h3>
            <p className="text-xs text-muted-foreground mt-1">{aula} • {horario}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onDetails}
            className="text-xs font-semibold shrink-0"
          >
            Ver detalle
          </Button>
        </div>
      </div>
    </div>
  );
};