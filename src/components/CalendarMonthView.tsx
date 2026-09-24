import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertCircle, MapPin } from 'lucide-react';
import { Course, Deadline, DayOfWeek, CalendarViewMode } from '../types';

interface CalendarMonthViewProps {
  courses: Course[];
  deadlines: Deadline[];
  onSelectCourse: (course: Course) => void;
  onSelectDeadline?: (deadline: Deadline) => void;
  onViewChange?: (view: CalendarViewMode) => void;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  courses,
  deadlines,
  onSelectCourse,
  onSelectDeadline,
  onViewChange,
}) => {
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(8); // September 2026

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const startingCol = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const colToDayOfWeek: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const totalCells = Math.ceil((startingCol + daysInMonth) / 7) * 7;

  return (
    <div className="space-y-4">
      {/* Month Header Navigation */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-[#0B2545] rounded-xl border border-slate-200">
            <CalendarIcon className="w-5 h-5 text-[#0B2545]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <p className="text-xs text-slate-500">
              VinUniversity Fall Academic Calendar & Exam Schedule
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onViewChange && (
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/80">
              <button
                onClick={() => onViewChange('month')}
                className="px-3 py-1 text-xs font-bold rounded-md bg-white text-[#0B2545] shadow-xs"
              >
                Month
              </button>
              <button
                onClick={() => onViewChange('week')}
                className="px-3 py-1 text-xs font-bold rounded-md transition-colors text-slate-600 hover:text-slate-900"
              >
                Week
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setCurrentYear(2026);
              setCurrentMonth(8);
            }}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap"
          >
            Today
          </button>
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-200 text-slate-600 transition-colors"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-200" />
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-200 text-slate-600 transition-colors"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="py-3 border-r border-slate-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Month Day Cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
          {Array.from({ length: totalCells }).map((_, idx) => {
            const dayNumber = idx - startingCol + 1;
            const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
            const currentDayOfWeek = colToDayOfWeek[idx % 7];

            const activeDateString = isCurrentMonth
              ? `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${dayNumber
                  .toString()
                  .padStart(2, '0')}`
              : '';

            const dayDeadlines = isCurrentMonth
              ? deadlines.filter((d) => d.dueDate === activeDateString)
              : [];

            const dayCourses = isCurrentMonth
              ? courses.filter((c) => c.schedule.some((slot) => slot.day === currentDayOfWeek))
              : [];

            const isToday = isCurrentMonth && dayNumber === 21 && currentMonth === 8;

            return (
              <div
                key={idx}
                className={`min-h-[110px] p-2 flex flex-col transition-colors ${
                  !isCurrentMonth
                    ? 'bg-slate-50/50 text-slate-300'
                    : isToday
                    ? 'bg-sky-50/40 text-slate-900'
                    : 'bg-white hover:bg-slate-50/70 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-[#0B2545] text-white'
                        : isCurrentMonth
                        ? 'text-slate-700'
                        : 'text-slate-300'
                    }`}
                  >
                    {isCurrentMonth ? dayNumber : ''}
                  </span>

                  {dayDeadlines.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                      {dayDeadlines.length} due
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-1 overflow-hidden">
                  {dayDeadlines.slice(0, 2).map((dl) => {
                    const c = courses.find((course) => course.id === dl.courseId);
                    return (
                      <div
                        key={dl.id}
                        onClick={() => onSelectDeadline && onSelectDeadline(dl)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold truncate cursor-pointer transition-all ${
                          dl.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 line-through'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                        title={`${dl.title} (${dl.dueTime})`}
                      >
                        • {c?.code || ''} {dl.title}
                      </div>
                    );
                  })}

                  {dayCourses.slice(0, 2).map((course) => (
                    <div
                      key={course.id}
                      onClick={() => onSelectCourse(course)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white truncate cursor-pointer shadow-xs hover:opacity-90"
                      style={{ backgroundColor: course.color }}
                      title={`${course.code} - ${course.name}`}
                    >
                      {course.code}
                    </div>
                  ))}

                  {(dayCourses.length + dayDeadlines.length > 4) && (
                    <div className="text-[9px] text-slate-400 font-bold pl-1">
                      +{dayCourses.length + dayDeadlines.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
