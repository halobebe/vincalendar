import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertCircle, MapPin } from 'lucide-react';
import { Course, Deadline, DayOfWeek } from '../types';

interface CalendarMonthViewProps {
  courses: Course[];
  deadlines: Deadline[];
  onSelectCourse: (course: Course) => void;
  onSelectDeadline?: (deadline: Deadline) => void;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  courses,
  deadlines,
  onSelectCourse,
  onSelectDeadline,
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
      {/* Month Header Navigation: Prestigious, clean neutrals */}
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
        <div className="grid grid-cols-7 border-collapse">
          {Array.from({ length: totalCells }).map((_, index) => {
            const dayNumber = index - startingCol + 1;
            const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
            const dayOfWeekIndex = index % 7;
            const dayOfWeek = colToDayOfWeek[dayOfWeekIndex];

            const dateStr = isCurrentMonth
              ? `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${dayNumber.toString().padStart(2, '0')}`
              : '';

            const dayDeadlines = isCurrentMonth
              ? deadlines.filter((d) => d.dueDate === dateStr)
              : [];

            const dayCourses: { course: Course; type: string; room: string }[] = [];
            if (isCurrentMonth) {
              courses.forEach((c) => {
                c.timeSlots.forEach((slot) => {
                  if (slot.day === dayOfWeek) {
                    dayCourses.push({
                      course: c,
                      type: slot.type,
                      room: slot.room,
                    });
                  }
                });
              });
            }

            const isToday = isCurrentMonth && dayNumber === 21 && currentMonth === 8;

            return (
              <div
                key={index}
                className={`min-h-[110px] p-2 border-r border-b border-slate-200 last:border-r-0 transition-colors ${
                  !isCurrentMonth ? 'bg-slate-50/40 opacity-40' : 'bg-white hover:bg-slate-50/50'
                } ${isToday ? 'bg-blue-50/25' : ''}`}
              >
                {isCurrentMonth && (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded-md ${
                          isToday
                            ? 'bg-[#0B2545] text-white'
                            : 'text-slate-800'
                        }`}
                      >
                        {dayNumber}
                      </span>
                      {dayDeadlines.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                      )}
                    </div>

                    <div className="space-y-1">
                      {/* Deadlines Pills */}
                      {dayDeadlines.map((dl) => (
                        <div
                          key={dl.id}
                          onClick={() => onSelectDeadline?.(dl)}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded truncate cursor-pointer transition-all flex items-center gap-1 ${
                            dl.type === 'Exam'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-900 border border-amber-200'
                          }`}
                          title={`${dl.title} - Due ${dl.dueTime}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                          <span className="truncate">{dl.title}</span>
                        </div>
                      ))}

                      {/* Course Indicators */}
                      {dayCourses.slice(0, 2).map((dc, i) => (
                        <div
                          key={i}
                          onClick={() => onSelectCourse(dc.course)}
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded truncate cursor-pointer transition-opacity hover:opacity-80 flex items-center gap-1 border border-slate-200 bg-white"
                          title={`${dc.course.code} (${dc.type}) - ${dc.room}`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: dc.course.color }}
                          />
                          <span className="truncate text-slate-800 font-mono">
                            {dc.course.code}
                          </span>
                        </div>
                      ))}

                      {dayCourses.length > 2 && (
                        <span className="block text-[9px] text-slate-400 font-medium px-1">
                          +{dayCourses.length - 2} more classes
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
