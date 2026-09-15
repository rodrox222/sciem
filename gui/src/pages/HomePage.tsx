import React, { useState } from 'react';
import { HomeNavbar } from '../components/home/HomeNavbar';
import { MetricsBar } from '../components/home/MetricsBar';
import { ExamCard } from '../components/home/ExamCard';
import { MiniCalendar } from '../components/home/MiniCalendar';
import { Footer } from '../components/Footer';
import heroImg from '../assets/home.jpg';

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

export const HomePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 8, 15)); // 15 de Sep de 2026
  const [activeTab, setActiveTab] = useState<'inicio' | 'modulos' | 'agenda' | 'perfil'>('inicio');

  const formattedSelected = selectedDate.toISOString().split('T')[0];
  const datesWithExams = Array.from(new Set(EXAMENES_DATA.map((e) => e.fecha)));
  const examenesDelDia = EXAMENES_DATA.filter((e) => e.fecha === formattedSelected);

  // Array de días para el scroll horizontal móvil
  const mobileDays = [
    { num: 14, date: new Date(2026, 8, 14), hasDot: false },
    { num: 15, date: new Date(2026, 8, 15), hasDot: true },
    { num: 16, date: new Date(2026, 8, 16), hasDot: true },
    { num: 17, date: new Date(2026, 8, 17), hasDot: true },
    { num: 18, date: new Date(2026, 8, 18), hasDot: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 pb-20 sm:pb-0">
      <HomeNavbar />

      {/* --- HERO SECTION --- */}
      {/* Móvil: Fondo blanco y texto oscuro. Desktop: Gradiente azul con foto */}
      <section className="bg-white sm:bg-gradient-to-r sm:from-blue-950 sm:via-blue-900 sm:to-sky-900 py-6 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            <div className="inline-block px-4 py-1.5 rounded-full text-xs font-medium border border-sky-200 sm:border-blue-700 bg-sky-50 sm:bg-blue-800/80 text-sky-700 sm:text-blue-200">
              Plataforma institucional FCyT
            </div>

            <h1 className="text-2xl sm:text-5xl font-black tracking-tight leading-tight text-[#0a2e5c] sm:text-white">
              Información clara para tus evaluaciones académicas.
            </h1>

            <p className="text-slate-500 sm:text-blue-100 text-sm sm:text-base max-w-xl leading-relaxed">
              Consulta cronogramas, ambientes y comunicados oficiales.
            </p>

            <div className="grid grid-cols-2 sm:flex gap-3 sm:gap-4 pt-1">
              <button className="w-full sm:w-auto px-4 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-[#0a58ca] sm:bg-sky-600 hover:bg-blue-700 text-white shadow-md active:scale-95 transition-all text-center">
                Consultar cronograma
              </button>
              <button className="w-full sm:w-auto px-4 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-white text-blue-950 border border-slate-200 hover:bg-slate-50 shadow-sm active:scale-95 transition-all text-center">
                Mapa
              </button>
            </div>
          </div>

          {/* Desktop: Muestra la foto de estudiantes / Móvil: Oculto */}
          <div className="hidden lg:flex lg:col-span-5 justify-end">
            <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900/40">
              <img
                src={heroImg}
                alt="Estudiantes"
                className="w-full h-72 sm:h-80 object-cover hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-950/60 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

        </div>
      </section>

      {/* Card "PRÓXIMA EVALUACIÓN" (Destacado solo en móvil según diseño de la imagen) */}
      <section className="px-5 pt-2 sm:hidden">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 border-t-4 border-t-amber-500">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Próxima evaluación
            </span>
            <span className="text-[11px] px-3 py-0.5 rounded-full font-medium border border-sky-300 text-sky-600 bg-white">
              Programado
            </span>
          </div>

          <div className="flex items-start gap-4 mb-4">
            <div className="text-4xl font-extrabold text-[#0a2e5c] leading-none">15</div>
            <div>
              <div className="text-xs font-bold text-slate-800 tracking-wide uppercase">SEP</div>
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <h3 className="font-bold text-[#0a2e5c] text-base">Examen Álgebra II</h3>
              <p className="text-xs text-slate-500 mt-1">Aula 623 · 14:15 – 15:45</p>
            </div>
          </div>
        </div>
      </section>

      {/* Métricas rápidas (Solo Desktop/Tablet) */}
      <div className="hidden sm:block">
        <MetricsBar />
      </div>

      {/* --- AGENDA ACADÉMICA --- */}
      <main className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-6 sm:py-10 flex-1 w-full space-y-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 block">
            Agenda académica
          </span>
          <h2 className="hidden sm:block text-2xl sm:text-3xl font-extrabold text-blue-950">
            Próximos exámenes
          </h2>
        </div>

        {/* Selector de días tipo píldora para móvil */}
        <div className="flex sm:hidden gap-2.5 overflow-x-auto pb-2 -mx-5 px-5 no-scrollbar">
          {mobileDays.map((d) => {
            const isSelected = selectedDate.getDate() === d.num;
            return (
              <button
                key={d.num}
                onClick={() => setSelectedDate(d.date)}
                className={`flex-shrink-0 w-14 h-16 rounded-2xl flex flex-col items-center justify-center font-bold transition-all ${
                  isSelected
                    ? 'bg-[#0a2e5c] text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                <span className="text-lg leading-tight">{d.num}</span>
                {d.hasDot && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      isSelected ? 'bg-white' : 'bg-sky-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Vista Desktop con Mini Calendario + Lista de Exámenes */}
        <div className="hidden sm:grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <MiniCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              examDates={datesWithExams}
            />
          </div>

          <div className="lg:col-span-5 space-y-4">
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
              <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-500 text-sm">
                No hay evaluaciones programadas para este día.
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl p-5 border-t-4 border-t-red-600 border-x border-b border-slate-200 shadow-sm space-y-4">
              <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider block">Noticias</span>
              <h3 className="text-base font-bold text-slate-900 leading-snug">Nuevo cronograma de evaluaciones</h3>
              <p className="text-xs text-slate-500 leading-relaxed">La Facultad comunica las fechas oficiales del segundo semestre.</p>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-600">SCI</span>
                <span>10 SEP 2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tarjeta de Noticias Compacta (Móvil) */}
        <div className="sm:hidden">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 border-t-4 border-t-red-600 flex items-center gap-4">
            <span className="px-3.5 py-1 rounded-full border border-sky-300 text-sky-700 text-xs font-bold">
              SCI
            </span>
            <div>
              <h4 className="font-bold text-xs text-[#0a2e5c] leading-snug">
                Nuevo cronograma de evaluaciones
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Comunicado oficial - 10 SEP</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer solo para Desktop */}
      <div className="hidden sm:block">
        <Footer />
      </div>

      {/* --- BOTTOM NAVIGATION BAR (Fijo en Móvil) --- */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center py-2.5 px-3 z-50 shadow-lg">
        <button
          onClick={() => setActiveTab('inicio')}
          className="flex flex-col items-center gap-1 text-slate-500 cursor-pointer"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'inicio' ? 'bg-[#0a58ca]' : 'bg-transparent'}`} />
          <span className={`text-[11px] font-bold ${activeTab === 'inicio' ? 'text-[#0a58ca]' : 'text-slate-400'}`}>
            Inicio
          </span>
        </button>

        <button
          onClick={() => setActiveTab('modulos')}
          className="flex flex-col items-center gap-1 text-slate-500 cursor-pointer"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'modulos' ? 'bg-[#0a58ca]' : 'bg-transparent'}`} />
          <span className={`text-[11px] font-medium ${activeTab === 'modulos' ? 'text-[#0a58ca]' : 'text-slate-400'}`}>
            Módulos
          </span>
        </button>

        <button
          onClick={() => setActiveTab('agenda')}
          className="flex flex-col items-center gap-1 text-slate-500 cursor-pointer"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'agenda' ? 'bg-[#0a58ca]' : 'bg-transparent'}`} />
          <span className={`text-[11px] font-medium ${activeTab === 'agenda' ? 'text-[#0a58ca]' : 'text-slate-400'}`}>
            Agenda
          </span>
        </button>

        <button
          onClick={() => setActiveTab('perfil')}
          className="flex flex-col items-center gap-1 text-slate-500 cursor-pointer"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'perfil' ? 'bg-[#0a58ca]' : 'bg-transparent'}`} />
          <span className={`text-[11px] font-medium ${activeTab === 'perfil' ? 'text-[#0a58ca]' : 'text-slate-400'}`}>
            Perfil
          </span>
        </button>
      </nav>
    </div>
  );
};

export default HomePage;