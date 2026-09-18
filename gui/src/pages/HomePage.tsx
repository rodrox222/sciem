import React, { useEffect, useState } from 'react';
import { HomeNavbar } from '../components/home/HomeNavbar';
import { MetricsBar } from '../components/home/MetricsBar';
import { ExamCard } from '../components/home/ExamCard';
import { MiniCalendar } from '../components/home/MiniCalendar';
import { CronogramaCard } from '../components/home/CronogramaCard';
import { NewsCard } from '../components/home/NewsCard';
import { MobileNav } from '../components/home/MobileNav';
import { Footer } from '../components/Footer';

// ======================================================
// DATOS DE LOS EXÁMENES
// ======================================================

const EXAMENES_DATA = [
  {
    id: '1',
    fecha: '2026-09-15',
    materia: 'Examen Álgebra II',
    carrera: 'Ingeniería Industrial',
    aula: 'Aula 623',
    horario: '14:15 – 15:45',
    tipo: 'sky' as const,
  },
  {
    id: '2',
    fecha: '2026-09-15',
    materia: 'Examen Programación I',
    carrera: 'Ingeniería de Sistemas',
    aula: 'Auditorio Edif. Nuevo',
    horario: '14:15 – 17:15',
    tipo: 'amber' as const,
  },
  {
    id: '3',
    fecha: '2026-09-16',
    materia: 'Examen Cálculo I',
    carrera: 'Plan Común',
    aula: 'Aula 691',
    horario: '08:15 – 09:45',
    tipo: 'sky' as const,
  },
];

// ======================================================
// FECHAS
// ======================================================

const getLocalYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${y}-${m}-${day}`;
};

// ======================================================
// HOME PAGE
// ======================================================

export const HomePage: React.FC = () => {
  useEffect(() => {
    document.title = 'Home | SCI';
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(
    () => new Date(2026, 8, 17)
  );

  const [activeTab, setActiveTab] = useState<
    'inicio' | 'modulos' | 'agenda' | 'perfil'
  >('inicio');

  const formattedSelected = getLocalYMD(selectedDate);

  const datesWithExams = Array.from(
    new Set(EXAMENES_DATA.map((e) => e.fecha))
  );

  const examenesDelDia = EXAMENES_DATA.filter(
    (e) => e.fecha === formattedSelected
  );

  // ======================================================
  // DÍAS PARA MÓVIL
  // ======================================================

  const mobileDays = [
    {
      num: 14,
      date: new Date(2026, 8, 14),
      hasDot: false,
    },
    {
      num: 15,
      date: new Date(2026, 8, 15),
      hasDot: true,
    },
    {
      num: 16,
      date: new Date(2026, 8, 16),
      hasDot: true,
    },
    {
      num: 17,
      date: new Date(2026, 8, 17),
      hasDot: true,
    },
    {
      num: 18,
      date: new Date(2026, 8, 18),
      hasDot: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f8fc] flex flex-col font-sans text-slate-800 pb-20 sm:pb-0">

      {/* ==================================================
          NAVBAR
      ================================================== */}

      <HomeNavbar />

      {/* ==================================================
          HERO
      ================================================== */}

      <section className="relative overflow-hidden bg-gradient-to-r from-[#092f63] via-[#0a4d91] to-[#087db8]">

        {/* Decoraciones */}
        <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-[#062650] opacity-70" />

        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#ed1c2e] opacity-90" />

        <div className="absolute right-32 bottom-[-100px] h-64 w-64 rounded-full bg-[#0877c7] opacity-70" />

        <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-11">

          <div className="grid items-center gap-8 lg:grid-cols-12">

            {/* ==================================================
                CALENDARIO
            ================================================== */}

            <div className="lg:col-span-4">

              <div className="rounded-2xl bg-white p-4 shadow-xl">

                <MiniCalendar
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  examDates={datesWithExams}
                />

              </div>

            </div>

            {/* ==================================================
                TEXTO CENTRAL
            ================================================== */}

            <div className="lg:col-span-4">

              <span className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">
                Plataforma institucional FCyT
              </span>

              <h1 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-[42px]">
                Tu información
                <br />
                académica,
                <span className="block text-[#12c4e8]">
                  en un solo lugar.
                </span>
              </h1>

              <p className="mt-4 max-w-md text-sm leading-6 text-blue-100 sm:text-base">
                Consulta cronogramas, ambientes y comunicados oficiales.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">

                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById('proximos-examenes')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="rounded-xl bg-[#0878ed] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#066bd4] active:scale-95"
                >
                  Consultar cronograma
                </button>

                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById('proximos-examenes')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#092f63] shadow-lg transition hover:bg-slate-100 active:scale-95"
                >
                  Ver próximos exámenes
                </button>

              </div>

            </div>

            {/* ==================================================
                CRONOGRAMA
            ================================================== */}

            <CronogramaCard />

          </div>

        </div>

      </section>

      {/* ==================================================
          AGENDA ACADÉMICA
      ================================================== */}

      <main
        id="proximos-examenes"
        className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-6 sm:py-10 lg:px-8"
      >

        {/* Encabezado */}

        <div className="mb-7 flex items-end justify-between">

          <div>

            <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-sky-700">
              Agenda académica
            </span>

            <h2 className="mt-1 text-2xl font-extrabold text-[#092f63] sm:text-3xl">
              Próximos exámenes
            </h2>

          </div>

          <button
            type="button"
            className="hidden text-sm font-semibold text-blue-600 transition hover:text-blue-800 sm:block"
          >
            Ver todos →
          </button>

        </div>

        {/* ==================================================
            MÓVIL - SELECTOR DE DÍAS
        ================================================== */}

        <div className="mb-5 flex gap-2.5 overflow-x-auto pb-2 sm:hidden">

          {mobileDays.map((d) => {

            const isSelected =
              selectedDate.getDate() === d.num;

            return (
              <button
                key={d.num}
                type="button"
                onClick={() => setSelectedDate(d.date)}
                className={`
                  flex
                  h-16
                  w-14
                  shrink-0
                  flex-col
                  items-center
                  justify-center
                  rounded-2xl
                  font-bold
                  transition-all
                  ${
                    isSelected
                      ? 'bg-[#092f63] text-white shadow-md'
                      : 'border border-slate-200 bg-white text-slate-700'
                  }
                `}
              >

                <span className="text-lg">
                  {d.num}
                </span>

                {d.hasDot && (
                  <span
                    className={`
                      mt-1 h-1.5 w-1.5 rounded-full
                      ${
                        isSelected
                          ? 'bg-white'
                          : 'bg-sky-500'
                      }
                    `}
                  />
                )}

              </button>
            );
          })}

        </div>

        {/* ==================================================
            CONTENIDO PRINCIPAL
        ================================================== */}

        <div className="grid gap-7 lg:grid-cols-12">

          {/* ==================================================
              EXÁMENES
          ================================================== */}

          <section className="lg:col-span-8">

            <div className="space-y-4">

              {examenesDelDia.length > 0 ? (

                examenesDelDia.map((exam) => (

                  <ExamCard
                    key={exam.id}
                    materia={exam.materia}
                    aula={exam.aula}
                    horario={exam.horario}
                    tipoBorde={exam.tipo}
                  />

                ))

              ) : (

                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">

                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                    📅
                  </div>

                  <h3 className="font-bold text-slate-800">
                    No hay evaluaciones programadas
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    No existen exámenes registrados para esta fecha.
                  </p>

                </div>

              )}

            </div>

          </section>

          {/* ==================================================
              NOTICIAS
          ================================================== */}

          <aside className="lg:col-span-4">
            <NewsCard />
          </aside>

        </div>

      </main>

      {/* ==================================================
          MÉTRICAS
      ================================================== */}

      <section className="mx-auto w-full max-w-7xl px-5 pb-8 sm:px-6 lg:px-8">

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <MetricsBar />

        </div>

      </section>

      {/* ==================================================
          FOOTER
      ================================================== */}

      <Footer />

      {/* ==================================================
          NAVEGACIÓN MÓVIL
      ================================================== */}

      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

    </div>
  );
};

export default HomePage;