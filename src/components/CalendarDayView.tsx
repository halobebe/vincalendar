import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  MapPin,
  User,
  BookOpen,
  FileText,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ExternalLink,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { Course, Deadline, DayOfWeek } from '../types';
import { soundEffects } from '../utils/sound';
import confetti from 'canvas-confetti';

interface CalendarDayViewProps {
  courses: Course[];
  deadlines: Deadline[];
  onSelectCourse: (course: Course) => void;
  onToggleDeadlineStatus: (deadlineId: string) => void;
}

export const CalendarDayView: React.FC<CalendarDayViewProps> = ({
  courses,
  deadlines,
  onSelectCourse,
  onToggleDeadlineStatus,
}) => {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Mon');
  const [checkedInSlots, setCheckedInSlots] = useState<string[]>(['slot-1']);

  const days: { key: DayOfWeek; label: string; dateStr: string }[] = [
    { key: 'Mon', label: 'Monday', dateStr: 'Sep 21' },
    { key: 'Tue', label: 'Tuesday', dateStr: 'Sep 22' },
    { key: 'Wed', label: 'Wednesday', dateStr: 'Sep 23' },
    { key: 'Thu', label: 'Thursday', dateStr: 'Sep 24' },
    { key: 'Fri', label: 'Friday', dateStr: 'Sep 25' },
    { key: 'Sat', label: 'Saturday', dateStr: 'Sep 26' },
  ];

  const daySlots: { slot: any; course: Course }[] = [];
  courses.forEach((c) => {
    c.timeSlots.forEach((slot) => {
      if (slot.day === selectedDay) {
        daySlots.push({ slot, course: c });
      }
    });
  });

  daySlots.sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
  const activeDeadlines = deadlines.filter((d) => d.status !== 'completed');

  const handleQRCheckIn = (slotId: string) => {
    if (!checkedInSlots.includes(slotId)) {
      setCheckedInSlots((prev) => [...prev, slotId]);
      soundEffects.playSuccessPop();
      try {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.6 },
        });
      } catch {}
    }
  };

  return (
    <div className="space-y-4">
      {/* Day Selector Bar with Framer Motion layoutId */}
      <div className="bg-white rounded-3xl border border-slate-200 p-2 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
        {days.map((d) => {
          const isSelected = d.key === selectedDay;
          return (
            <button
              key={d.key}
              onClick={() => setSelectedDay(d.key)}
              className={`relative flex-1 min-w-[96px] py-3 px-3 rounded-2xl text-center transition-colors ${
                isSelected ? 'text-white' : 'text-slate-700 hover:text-slate-900 bg-slate-50/50 hover:bg-slate-100'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="dayview-active-pill"
                  className="absolute inset-0 bg-[#0B2545] rounded-2xl z-0"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <div className="relative z-10">
                <span className="block text-[11px] font-mono opacity-80">{d.dateStr}</span>
                <span className="block text-xs sm:text-sm font-bold tracking-tight">{d.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Schedule & Agenda Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Timeline Sessions (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedDay === 'Mon' ? "Today's Academic Schedule" : `${selectedDay} Classes`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {daySlots.length} lecture and lab sessions scheduled at VinUni Campus
                </p>
              </div>
              <span className="px-3 py-1 text-xs font-bold bg-slate-100 text-[#0B2545] rounded-full border border-slate-200 whitespace-nowrap">
                {daySlots.length} Sessions
              </span>
            </div>

            {daySlots.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700">No classes scheduled for {selectedDay}</p>
                <p className="text-slate-400 mt-1">Use this time for group project work or VinUni library study.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {daySlots.map(({ slot, course }, idx) => {
                  const isCheckedIn = checkedInSlots.includes(slot.id);
                  return (
                    <div
                      key={slot.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="px-2.5 py-1 rounded-md text-xs font-bold text-white font-mono"
                            style={{ backgroundColor: course.color }}
                          >
                            {course.code}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                            {slot.type}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            {course.credits} Credits
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#0B2545] bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                            {slot.startTime} - {slot.endTime}
                          </span>

                          <button
                            onClick={() => handleQRCheckIn(slot.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                              isCheckedIn
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-[#0B2545] hover:bg-[#134074] text-white shadow-xs'
                            }`}
                          >
                            {isCheckedIn ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Checked-in (QR)</span>
                              </>
                            ) : (
                              <>
                                <QrCode className="w-3.5 h-3.5 text-[#D4AF37]" />
                                <span>Check-In</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 text-base">
                          {course.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-2">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{slot.building} — <strong>{slot.room}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{course.instructor.name} ({course.instructor.office})</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                        <button
                          onClick={() => onSelectCourse(course)}
                          className="font-bold text-[#0B2545] hover:underline flex items-center gap-1"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>View Syllabus & Textbooks</span>
                        </button>

                        <span className="text-slate-400 text-[11px]">
                          {course.timeSlots.length} weekly sessions total
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Active Deadlines & Today's Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">
                Canvas & Portal Deadlines
              </h4>
              <span className="text-xs font-mono font-bold text-slate-500">
                {activeDeadlines.length} pending
              </span>
            </div>

            {activeDeadlines.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No pending deadlines!</p>
            ) : (
              <div className="space-y-2.5">
                {activeDeadlines.slice(0, 4).map((dl) => (
                  <div
                    key={dl.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-mono">
                        {dl.type}
                      </span>
                      <span className="text-[11px] font-bold text-red-600 font-mono">
                        Due {dl.dueDate.slice(5)} at {dl.dueTime}
                      </span>
                    </div>

                    <h5 className="font-bold text-slate-900 text-xs truncate">
                      {dl.title}
                    </h5>

                    <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 truncate max-w-[120px]">
                        Weight: {dl.weightPercentage}%
                      </span>
                      <div className="flex items-center gap-2.5">
                        <a
                          href={dl.submissionUrl || `https://vinuni.instructure.com/courses/1000/assignments/${dl.id.replace(/[^0-9]/g, '') || '1'}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-red-700 hover:text-red-800 flex items-center gap-0.5 text-[11px]"
                          title="Open directly on Canvas"
                        >
                          <span>Canvas</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          onClick={() => onToggleDeadlineStatus(dl.id)}
                          className="font-bold text-emerald-700 hover:text-emerald-900"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
