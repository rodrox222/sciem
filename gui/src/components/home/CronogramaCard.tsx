import React from 'react';

export const CronogramaCard: React.FC = () => {
  return (
    <div className="flex justify-center lg:col-span-4 lg:justify-end">
      <div className="relative h-[280px] w-[360px] sm:h-[310px] sm:w-[400px]">

        {/* Sombra detrás de la hoja */}
        <div className="absolute left-5 top-8 h-[235px] w-[315px] rotate-[-4deg] rounded-xl bg-black/20 blur-md" />

        {/* Hoja */}
        <div
          className="
            absolute
            left-4
            top-2
            h-[250px]
            w-[330px]
            rotate-[-5deg]
            rounded-[8px]
            bg-white
            p-5
            shadow-2xl
            sm:h-[275px]
            sm:w-[365px]
          "
        >

          {/* Parte superior */}
          <div className="flex items-center gap-3">

            {/* Icono calendario */}
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border-[3px] border-[#092f63] text-[#092f63]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-7 w-7"
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="17"
                  rx="2"
                />

                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />

                <line x1="8" y1="14" x2="8" y2="14" />
                <line x1="12" y1="14" x2="12" y2="14" />
                <line x1="16" y1="14" x2="16" y2="14" />
              </svg>
            </div>

            <h2 className="text-2xl font-black italic tracking-tight text-[#092f63] sm:text-[27px]">
              CRONOGRAMA
            </h2>

          </div>

          {/* Líneas del cronograma */}
          <div className="mt-6 space-y-3">

            {/* Fila 1 */}
            <div className="flex items-center gap-3">
              <div className="h-4 w-8 rounded-md bg-slate-200" />
              <div className="h-4 w-[90px] rounded-md bg-slate-100" />
              <div className="ml-auto h-4 w-[100px] rounded-full bg-[#0a58ca]" />
            </div>

            {/* Fila 2 */}
            <div className="flex items-center gap-3">
              <div className="h-4 w-8 rounded-md bg-slate-200" />
              <div className="h-4 w-[70px] rounded-md bg-slate-100" />
              <div className="ml-auto h-4 w-[90px] rounded-full bg-[#ed1c2e]" />
            </div>

            {/* Fila 3 */}
            <div className="flex items-center gap-3">
              <div className="h-4 w-8 rounded-md bg-slate-200" />
              <div className="h-4 w-[100px] rounded-md bg-slate-100" />
              <div className="ml-auto h-4 w-[105px] rounded-full bg-[#09bde4]" />
            </div>

            {/* Fila 4 */}
            <div className="flex items-center gap-3">
              <div className="h-4 w-8 rounded-md bg-slate-200" />
              <div className="h-4 w-[80px] rounded-md bg-slate-100" />
              <div className="ml-auto h-4 w-[85px] rounded-full bg-[#f5b400]" />
            </div>

            {/* Fila 5 */}
            <div className="flex items-center gap-3">
              <div className="h-4 w-8 rounded-md bg-slate-200" />
              <div className="h-4 w-[115px] rounded-md bg-slate-100" />
              <div className="ml-auto h-4 w-[70px] rounded-full bg-[#0a58ca]" />
            </div>

          </div>

          {/* Línea inferior */}
          <div className="absolute bottom-5 left-5 right-5 flex gap-2">
            <div className="h-2 flex-1 rounded-full bg-slate-100" />
            <div className="h-2 w-16 rounded-full bg-slate-200" />
          </div>

        </div>
      </div>
    </div>
  );
};