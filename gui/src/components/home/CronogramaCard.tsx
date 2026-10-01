import React from 'react';

export const CronogramaCard: React.FC = () => {
  return (
    <div className="flex justify-center lg:col-span-4 lg:justify-end">
      <div className="relative h-[280px] w-[360px] sm:h-[310px] sm:w-[400px]">

        <div className="absolute left-5 top-8 h-[235px] w-[315px] rotate-[-4deg] rounded-xl bg-black/20 blur-md" />

        <div className="absolute left-4 top-2 h-[250px] w-[330px] rotate-[-5deg] rounded-xl bg-card p-5 shadow-2xl sm:h-[275px] sm:w-[365px] border border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-sci-navy text-sci-navy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-sci-navy sm:text-2xl">
              CRONOGRAMA
            </h2>
          </div>

          <div className="mt-6 space-y-3">
            {/* Barras de materias con la paleta oficial */}
            <div className="flex items-center gap-3">
              <div className="h-3.5 w-8 rounded-md bg-muted" />
              <div className="h-3.5 w-[90px] rounded-md bg-muted/60" />
              <div className="ml-auto h-3.5 w-[100px] rounded-full bg-sci-blue" />
            </div>

            <div className="flex items-center gap-3">
              <div className="h-3.5 w-8 rounded-md bg-muted" />
              <div className="h-3.5 w-[70px] rounded-md bg-muted/60" />
              <div className="ml-auto h-3.5 w-[90px] rounded-full bg-sci-red" />
            </div>

            <div className="flex items-center gap-3">
              <div className="h-3.5 w-8 rounded-md bg-muted" />
              <div className="h-3.5 w-[100px] rounded-md bg-muted/60" />
              <div className="ml-auto h-3.5 w-[105px] rounded-full bg-sci-cyan" />
            </div>

            <div className="flex items-center gap-3">
              <div className="h-3.5 w-8 rounded-md bg-muted" />
              <div className="h-3.5 w-[80px] rounded-md bg-muted/60" />
              <div className="ml-auto h-3.5 w-[85px] rounded-full bg-sci-amber" />
            </div>
          </div>

          <div className="absolute bottom-5 left-5 right-5 flex gap-2">
            <div className="h-2 flex-1 rounded-full bg-muted/60" />
            <div className="h-2 w-16 rounded-full bg-muted" />
          </div>
        </div>

      </div>
    </div>
  );
};