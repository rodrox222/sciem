import React, { useEffect, useState } from 'react';
import { apiUrl } from '@/services/apiUrl';

interface PublicMetrics {
  examenes_programados: number;
  ambientes_habilitados: number;
}

export const MetricsBar: React.FC = () => {
  const [metrics, setMetrics] = useState<PublicMetrics | null>(null);

  useEffect(() => {
    let active = true;

    fetch(apiUrl('/publico/metricas'))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Error'))))
      .then((data: PublicMetrics) => {
        if (!active) return;
        setMetrics({
          examenes_programados: Number(data?.examenes_programados ?? 0),
          ambientes_habilitados: Number(data?.ambientes_habilitados ?? 0),
        });
      })
      .catch(() => {
        // Mantiene estado null si falla la carga
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="bg-card py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

          {/* Exámenes programados -> Azul oficial */}
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-sci-blue" />
            <div>
              <span className="text-2xl font-bold text-foreground">
                {metrics ? metrics.examenes_programados : '—'}
              </span>
              <p className="text-xs text-muted-foreground">Exámenes programados</p>
            </div>
          </div>

          {/* Ambientes habilitados -> Cian oficial */}
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-sci-cyan" />
            <div>
              <span className="text-2xl font-bold text-foreground">
                {metrics ? metrics.ambientes_habilitados : '—'}
              </span>
              <p className="text-xs text-muted-foreground">Ambientes habilitados</p>
            </div>
          </div>

          {/* Trazabilidad -> Rojo oficial */}
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-sci-red" />
            <div>
              <span className="text-2xl font-bold text-foreground">24/7</span>
              <p className="text-xs text-muted-foreground">Trazabilidad</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
