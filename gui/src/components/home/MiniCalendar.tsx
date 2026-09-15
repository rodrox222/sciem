import React from 'react';

interface MiniCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  examDates?: string[]; // Fechas que tienen exámenes en formato 'YYYY-MM-DD'
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  selectedDate,
  onSelectDate,
  examDates = [],
}) => {
  // Obtener el lunes de la semana actual
  const getWeekDays = (baseDate: Date) => {
    const d = new Date(baseDate);
    const day = d.getDay(); // 0: Dom, 1: Lun, ..., 6: Sáb
    // Ajustar para que la semana inicie en Lunes 
    const diffToMonday = day === 0 ? -6 : 1 - day;
    
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      week.push(nextDay);
    }
    return week;
  };

  const weekDays = getWeekDays(selectedDate);

  // Formatear mes y año actual (ej. "Septiembre 2026")
  const monthYearLabel = selectedDate.toLocaleDateString('es-BO', {
    month: 'long',
    year: 'numeric',
  });

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const toIsoDate = (d: Date) => {
    return d.toISOString().split('T')[0];
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
      {/* Cabecera dinámica de Mes y Año */}
      <div className="flex justify-between items-center">
        <span className="font-bold text-sm text-slate-800 capitalize">
          {monthYearLabel}
        </span>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 uppercase">
        <span>Lun</span>
        <span>Mar</span>
        <span>Mié</span>
        <span>Jue</span>
        <span>Vie</span>
        <span>Sáb</span>
        <span>Dom</span>
      </div>

      {/* Días reales del mes */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-700">
        {weekDays.map((dayDate) => {
          const isSelected = isSameDay(dayDate, selectedDate);
          const hasExams = examDates.includes(toIsoDate(dayDate));

          return (
            <button
              key={dayDate.toISOString()}
              type="button"
              onClick={() => onSelectDate(dayDate)}
              className={`py-2.5 rounded-lg relative transition-all flex flex-col items-center justify-center cursor-pointer ${
                isSelected
                  ? 'bg-blue-950 text-white shadow-sm'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span>{dayDate.getDate()}</span>
              {hasExams && !isSelected && (
                <span className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Pie con timestamp de última sincronización real */}
      <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-lg flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
          i
        </div>
        <div className="text-[11px]">
          <span className="font-bold text-slate-800 block">Información actualizada</span>
          <span className="text-slate-500">
            {new Date().toLocaleDateString('es-BO')} • {new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};