import React from 'react';

export const MetricsBar: React.FC = () => {
  return (
    <section className="bg-white border-b border-slate-200 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

          {/* Exámenes programados */}
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-blue-700" />

            <div>
              <span className="text-2xl font-black text-slate-900">
                18
              </span>

              <p className="text-xs text-slate-500">
                Exámenes programados
              </p>
            </div>
          </div>

          {/* Ambientes habilitados */}
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-sky-500" />

            <div>
              <span className="text-2xl font-black text-slate-900">
                12
              </span>

              <p className="text-xs text-slate-500">
                Ambientes habilitados
              </p>
            </div>
          </div>

          {/* Trazabilidad */}
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-600" />

            <div>
              <span className="text-2xl font-black text-slate-900">
                24/7
              </span>

              <p className="text-xs text-slate-500">
                Trazabilidad
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};