import React from 'react';

interface ExamCardProps {
  materia: string;
  aula: string;
  horario: string;
  tipoBorde?: 'sky' | 'amber';
}

export const ExamCard: React.FC<ExamCardProps> = ({
  materia,
  aula,
  horario,
  tipoBorde = 'sky',
}) => {
  const borderClasses = tipoBorde === 'sky' ? 'border-t-sky-500' : 'border-t-amber-500';
  const tagClasses = tipoBorde === 'sky' 
    ? 'border-sky-200 text-sky-700 bg-sky-50' 
    : 'border-amber-200 text-amber-700 bg-amber-50';

  return (
    <div className={`bg-white rounded-xl p-5 border-t-4 ${borderClasses} border-x border-b border-slate-200 shadow-sm flex flex-col justify-between`}>
      <div>
        <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${tagClasses} mb-3`}>
          Programado
        </span>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-base font-bold text-slate-900">{materia}</h3>
            <p className="text-xs text-slate-500 mt-1">{aula} • {horario}</p>
          </div>
          <button className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            Ver detalle
          </button>
        </div>
      </div>
    </div>
  );
};