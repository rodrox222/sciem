import React from 'react';

export const NewsCard: React.FC = () => {
  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      {/* Encabezado */}
      <div className="mb-5 flex items-center justify-between">

        <span className="text-xs font-bold uppercase tracking-[0.12em] text-red-600">
          Noticias
        </span>

        <span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-bold text-red-600">
          COMUNICADO
        </span>

      </div>

      {/* Título */}
      <h3 className="text-xl font-extrabold leading-snug text-[#092f63]">
        Nuevo cronograma de evaluaciones
      </h3>

      {/* Descripción */}
      <p className="mt-4 text-sm leading-6 text-slate-500">
        La Facultad comunica las fechas oficiales del segundo semestre.
      </p>

      {/* Fecha */}
      <div className="mt-6 border-t border-slate-100 pt-4">

        <div className="flex items-center justify-between">

          <span className="rounded-lg bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
            SCI
          </span>

          <span className="text-xs font-semibold text-slate-400">
            10 SEP 2026
          </span>

        </div>

      </div>

    </div>
  );
};