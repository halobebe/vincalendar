import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  Plus,
  ExternalLink,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Course, TimeSlot, DayOfWeek, Deadline, CalendarViewMode } from '../types';

interface CalendarWeekTimeGridProps {
  courses: Course[];
  deadlines: Deadline[];
  onSelectCourse: (course: Course) => void;
  onOpenAddCourse: () => void;
  onOpenAddCourseWithSlot?: (day: DayOfWeek, startTime: string) => void;
  onViewChange?: (view: CalendarViewMode) => void;
}

// 7 days from Sunday to Saturday matching VinUni timetable (Image 1)
const DAYS: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAY_FULL_NAMES: Record<DayOfWeek, string> = {
  Sun: 'Sunday',
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
};

// Hours from 6:00 AM to 6:00 PM (Image 1)
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

const formatHourLabel = (hour: number) => {
  if (hour === 12) return '12:00 PM';
  if (hour > 12) return `${hour - 12}:00 PM`;
  return `${hour}:00 AM`;
};

export const CalendarWeekTimeGrid: React.FC<CalendarWeekTimeGridProps> = ({
  courses,
  deadlines,
  onSelectCourse,
  onOpenAddCourse,
  onOpenAddCourseWithSlot,
  onViewChange,
}) => {
  // Week navigation offset (0 = current semester week Sept 20 - Sept 26, matching image)
  const [weekOffset, setWeekOffset] = useState(0);

  // Base dates matching the user's provided schedule image (Sept 20 - Sept 26)
  // Sunday Sept 20, 2026 to Saturday Sept 26, 2026
  const getDayDateInfo = (dayIndex: number) => {
    // dayIndex: 0 = Sun, 1 = Mon, ..., 6 = Sat
    const baseSunday = new Date(2026, 8, 20); // Sept 20, 2026
    const targetDate = new Date(baseSunday);
    targetDate.setDate(baseSunday.getDate() + dayIndex + weekOffset * 7);

    const dayNum = targetDate.getDate().toString().padStart(2, '0');
    const monthNum = (targetDate.getMonth() + 1).toString().padStart(2, '0');
    return { dayNum, monthNum, dateStr: `${dayNum}/${monthNum}` };
  };

  const currentWeekStart = getDayDateInfo(0).dateStr;
  const currentWeekEnd = getDayDateInfo(6).dateStr;

  // Helper to calculate top and height in pixels based on 6:00 AM start (64px per hour)
  const HOUR_ROW_HEIGHT = 64;
  const getSlotStyle = (startTime: string, endTime: string) => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const startMinutesFrom6 = (startH - 6) * 60 + startM;
    const durationMinutes = (endH - startH) * 60 + (endM - startM);

    const topPx = (startMinutesFrom6 / 60) * HOUR_ROW_HEIGHT;
    const heightPx = Math.max((durationMinutes / 60) * HOUR_ROW_HEIGHT - 3, 30);

    return { top: `${topPx}px`, height: `${heightPx}px` };
  };

  const getCanvasDirectUrl = (dl: Deadline, course?: Course): string => {
    if (dl.submissionUrl && (dl.submissionUrl.startsWith('http://') || dl.submissionUrl.startsWith('https://'))) {
      return dl.submissionUrl;
    }
    const cleanCode = course?.code ? course.code.replace(/\s+/g, '').toLowerCase() : 'courses';
    const idNum = dl.id.replace(/[^0-9]/g, '') || '1';
    return `https://vinuni.instructure.com/courses/${cleanCode}/assignments/${idNum}`;
  };

  const upcomingDeadlines = deadlines.filter((d) => d.status !== 'completed');
  const totalCredits = courses.reduce((acc, c) => acc + c.credits, 0);

  return (
    <div className="space-y-4">
      {/* Top Banner: VinUniversity Academic Navy Header */}
      <div className="bg-[#0B2545] rounded-3xl p-5 sm:p-6 text-white border border-[#134074] shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#D4AF37] text-[#0B2545]">
                VinUni Academic Timetable
              </span>
              <span className="text-xs text-slate-300">
                Fall Semester 2026 • {courses.length} Registered Courses ({totalCredits} Credits)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Weekly Class Timetable
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              VinUniversity Fall Semester 2026 Academic Timetable. Search and add from 360+ official VinUni courses (from Zenon catalog) or create custom courses, with Canvas deadline tracking.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
            <div className="bg-white/10 border border-white/15 px-3.5 py-2 rounded-2xl text-center">
              <span className="block text-lg font-extrabold text-[#D4AF37] font-mono">
                {upcomingDeadlines.length}
              </span>
              <span className="text-[10px] text-slate-300 uppercase tracking-wider font-bold">
                Due Items
              </span>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenAddCourse}
              className="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#C5A880] text-[#0B2545] font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Course</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Canvas Deadlines & Direct Submission Links Panel */}
      {upcomingDeadlines.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Canvas Deadlines & Direct Assignment Links
              </h3>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                {upcomingDeadlines.length} Pending
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Click "Submit on Canvas" to open the direct submission page on VinUni Canvas LMS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {upcomingDeadlines.map((dl) => {
              const course = courses.find((c) => c.id === dl.courseId);
              const isExam = dl.type === 'Exam';
              const canvasUrl = getCanvasDirectUrl(dl, course);

              return (
                <div
                  key={dl.id}
                  className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                    isExam
                      ? 'bg-red-50/40 border-red-200 hover:border-red-300'
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        {course && (
                          <span
                            className="font-mono font-bold text-[10px] px-2 py-0.5 rounded text-white"
                            style={{ backgroundColor: course.color }}
                          >
                            {course.code}
                          </span>
                        )}
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                          {dl.type}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold font-mono text-red-600">
                        {dl.dueDate.slice(5)} • {dl.dueTime}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 truncate" title={dl.title}>
                      {dl.title}
                    </h4>
                    {dl.weightPercentage ? (
                      <span className="text-[10px] font-medium text-slate-500 block mt-0.5">
                        Weight: {dl.weightPercentage}% of course grade
                      </span>
                    ) : null}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                      {dl.location || 'Canvas Online'}
                    </span>

                    <a
                      href={canvasUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] rounded-lg border border-red-200 transition-colors whitespace-nowrap shadow-xs"
                      title={`Open ${dl.title} directly in VinUni Canvas`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                      <span>Submit on Canvas</span>
                      <ExternalLink className="w-3 h-3 text-red-600" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Timetable Card: Matches VinUni Portal Header and 7-day grid */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Authentic Schedule Toolbar: Today, Back, Next | 20/09 - 26/09 | Month, Week */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50/90 flex flex-wrap items-center justify-between gap-3">
          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg shadow-xs transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg shadow-xs transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Central Date Range matching Image 1 (20/09 - 26/09) */}
          <div className="text-center font-bold text-sm sm:text-base text-slate-900 font-mono tracking-tight">
            {currentWeekStart} - {currentWeekEnd}
          </div>

          {/* Month / Week View Toggle */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/80">
            <button
              onClick={() => onViewChange && onViewChange('month')}
              className="px-3 py-1 text-xs font-bold rounded-md transition-colors text-slate-600 hover:text-slate-900"
            >
              Month
            </button>
            <button
              onClick={() => onViewChange && onViewChange('week')}
              className="px-3 py-1 text-xs font-bold rounded-md bg-white text-[#0B2545] shadow-xs"
            >
              Week
            </button>
          </div>
        </div>

        {/* 7 Days Column Header: 20 Sun, 21 Mon, 22 Tue, 23 Wed, 24 Thu, 25 Fri, 26 Sat */}
        <div className="grid grid-cols-[70px_repeat(7,1fr)] border-b border-slate-200 bg-white sticky top-0 z-20 overflow-hidden">
          <div className="p-2 sm:p-2.5 text-center border-r border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center">
            Time
          </div>
          {DAYS.map((day, idx) => {
            const dateInfo = getDayDateInfo(idx);
            const isToday = day === 'Mon' && weekOffset === 0;

            return (
              <div
                key={day}
                className={`p-2 text-center border-r border-slate-200 last:border-r-0 ${
                  isToday ? 'bg-sky-50/70 text-[#0B2545]' : 'text-slate-700'
                }`}
              >
                <div className="text-xs sm:text-sm font-bold tracking-tight">
                  <span className="font-mono mr-1">{dateInfo.dayNum}</span>
                  <span>{day}</span>
                </div>
                <span className="hidden md:block text-[10px] text-slate-400 font-medium">
                  {DAY_FULL_NAMES[day]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Timetable Body Grid: 6:00 AM to 6:00 PM */}
        <div className="relative overflow-x-auto">
          <div className="min-w-[840px] grid grid-cols-[70px_repeat(7,1fr)] relative">
            {/* Time Axis Column */}
            <div className="border-r border-slate-200 bg-slate-50/70 select-none">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-[64px] border-b border-slate-200/80 pr-2 pt-1.5 text-right text-[11px] font-medium text-slate-500 whitespace-nowrap"
                >
                  {formatHourLabel(hour)}
                </div>
              ))}
            </div>

            {/* 7 Day Columns */}
            {DAYS.map((day, dayIndex) => {
              const daySlots: { slot: TimeSlot; course: Course }[] = [];
              courses.forEach((course) => {
                course.timeSlots.forEach((slot) => {
                  if (slot.day === day) {
                    daySlots.push({ slot, course });
                  }
                });
              });

              const isToday = day === 'Mon' && weekOffset === 0;

              return (
                <div
                  key={day}
                  className={`relative border-r border-slate-200 last:border-r-0 h-[832px] ${
                    isToday ? 'bg-sky-50/15' : 'bg-white'
                  }`}
                >
                  {/* Hour horizontal dividing lines with click to add manual slot */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      onClick={() =>
                        onOpenAddCourseWithSlot?.(
                          day,
                          `${hour.toString().padStart(2, '0')}:00`
                        )
                      }
                      className="h-[64px] border-b border-slate-100 hover:bg-sky-50/40 transition-colors cursor-pointer group relative"
                      title={`Click to manually add a course on ${DAY_FULL_NAMES[day]} at ${formatHourLabel(hour)}`}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center transition-opacity pointer-events-none">
                        <span className="text-[10px] font-bold text-[#0B2545] bg-white/95 px-2 py-0.5 rounded-md shadow-xs border border-slate-200 flex items-center gap-1">
                          <Plus className="w-2.5 h-2.5 text-[#D4AF37]" /> Add Course
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Course Slot Cards: Authentic Cyan/Teal VinUni styling with white text as in Image 1 */}
                  {daySlots.map(({ slot, course }) => {
                    const pos = getSlotStyle(slot.startTime, slot.endTime);
                    return (
                      <motion.div
                        key={slot.id}
                        id={`slot-${slot.id}`}
                        whileHover={{ y: -1, scale: 1.01 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                        onClick={() => onSelectCourse(course)}
                        className="absolute left-1 right-1 rounded-xl p-2 cursor-pointer shadow-xs z-10 flex flex-col justify-between overflow-hidden border border-[#3BA2A7]/30 hover:shadow-md transition-all text-white"
                        style={{
                          top: pos.top,
                          height: pos.height,
                          backgroundColor: '#43B3C7', // Signature VinUni turquoise / cyan schedule card
                        }}
                      >
                        <div className="overflow-hidden">
                          {/* Course Name & Section Code (as in Image 1) */}
                          <div className="font-bold text-[11px] leading-tight text-white drop-shadow-xs line-clamp-2">
                            {course.name} - {slot.room ? slot.room.split(' ')[0] : course.code}
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-sky-100 mt-1 font-medium truncate">
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            <span>
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </div>

                          {slot.room && (
                            <div className="flex items-center gap-1 text-[10px] text-sky-100 mt-0.5 truncate">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{slot.room}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-white/90 pt-1 border-t border-white/20 mt-1">
                          <span className="font-extrabold uppercase tracking-wider bg-white/20 px-1 py-0.2 rounded">
                            {slot.type}
                          </span>
                          <span className="truncate max-w-[90px]">
                            {course.instructor.name.split(' ').slice(-1)[0]}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Enrolled Courses Pill List */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-bold text-slate-900">Enrolled Courses:</span>
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCourse(c)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors font-medium whitespace-nowrap"
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              <span className="font-bold text-slate-800">{c.code}</span>
              <span className="text-slate-400">({c.credits} cr)</span>
            </button>
          ))}
        </div>
        <div className="text-slate-500 text-[11px]">
          Click any class to review Syllabus, Instructor Office Hours, or direct Canvas links.
        </div>
      </div>
    </div>
  );
};
