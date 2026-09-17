import React from 'react'

interface MiniCalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  examDates?: string[]
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  selectedDate,
  onSelectDate,
  examDates = [],
}) => {
  // Helper de fecha local (evita desfase UTC de Bolivia)
  const formatLocalYMD = (d: Date): string => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    )
  }

  // Obtener el Lunes de la semana activa
  const getWeekDays = (baseDate: Date) => {
    const d = new Date(baseDate)
    const day = d.getDay() // 0: Dom, 1: Lun...
    const diffToMonday = day === 0 ? -6 : 1 - day

    const monday = new Date(d)
    monday.setDate(d.getDate() + diffToMonday)

    return Array.from({ length: 7 }, (_, i) => {
      const nextDay = new Date(monday)
      nextDay.setDate(monday.getDate() + i)
      return nextDay
    })
  }

  const weekDays = getWeekDays(selectedDate)

  // Mes y Año dinámico capitalizado (ej. "Septiembre De 2026")
  const rawLabel = selectedDate.toLocaleDateString('es-BO', {
    month: 'long',
    year: 'numeric',
  })
  const monthYearLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
      <h3 className="text-base font-bold text-[#0a2e5c] text-left">
        {monthYearLabel}
      </h3>

      {/* Cabecera Lun - Dom */}
      <div className="grid grid-cols-7 text-center gap-1">
        {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((day) => (
          <span
            key={day}
            className="text-[11px] font-bold text-slate-400 tracking-wider"
          >
            {day}
          </span>
        ))}
      </div>

      {/* Fila única de la semana actual */}
      <div className="grid grid-cols-7 text-center gap-1.5 items-center">
        {weekDays.map((dayDate) => {
          const isSelected = isSameDay(dayDate, selectedDate)
          const dateStr = formatLocalYMD(dayDate)
          const hasExam = examDates.includes(dateStr)

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dayDate)}
              className={`h-11 w-full rounded-xl flex flex-col items-center justify-center relative font-bold text-sm transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#0a2e5c] text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{dayDate.getDate()}</span>
              {hasExam && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    isSelected ? 'bg-white' : 'bg-sky-500'
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MiniCalendar