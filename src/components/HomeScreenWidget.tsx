import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  LayoutGrid,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Sparkles,
  Layers,
  BookOpen,
  ArrowRight,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { Course, Deadline, WidgetSize, WidgetTheme } from '../types';
import confetti from 'canvas-confetti';
import { soundEffects } from '../utils/sound';

interface HomeScreenWidgetProps {
  courses: Course[];
  deadlines: Deadline[];
  onToggleDeadlineStatus: (deadlineId: string) => void;
  onSelectCourse: (course: Course) => void;
}

export const HomeScreenWidget: React.FC<HomeScreenWidgetProps> = ({
  courses,
  deadlines,
  onToggleDeadlineStatus,
  onSelectCourse,
}) => {
  const [widgetSize, setWidgetSize] = useState<WidgetSize>('medium');
  const [widgetTheme, setWidgetTheme] = useState<WidgetTheme>('vinuni_navy');
  const [wallpaper, setWallpaper] = useState<'vinuni' | 'night' | 'slate' | 'mesh'>('vinuni');
  const [copied, setCopied] = useState(false);

  const activeDeadlines = deadlines.filter((d) => d.status !== 'completed');
  const nextClassCourse = courses[0]; // COMP 2030
  const nextClassSlot = nextClassCourse?.timeSlots[0];

  const handleToggleTask = (id: string) => {
    soundEffects.playSuccessPop();
    try {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
    } catch {}
    onToggleDeadlineStatus(id);
  };

  const handleCopyWidgetCode = () => {
    navigator.clipboard?.writeText(
      `<!-- VinUni Course Planner Home Screen Widget Script -->\n<script src="https://one.vinuni.edu.vn/widgets/course-planner.js" data-size="${widgetSize}" data-theme="${widgetTheme}"></script>`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getThemeClasses = () => {
    switch (widgetTheme) {
      case 'vinuni_navy':
        return 'bg-[#0B2545] text-white border-[#134074] shadow-xl';
      case 'midnight_glass':
        return 'bg-slate-900 text-white border-slate-700 shadow-xl';
      case 'paper_white':
        return 'bg-white text-slate-900 border-slate-200 shadow-xl';
      case 'clean_minimal':
      default:
        return 'bg-slate-900 text-slate-100 border-slate-700 shadow-xl';
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction Banner: Solid VinUni theme, strict padding math */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-[#0B2545] border border-slate-200">
              OneVinUni Companion Widget
            </span>
            <span className="text-xs text-slate-500">
              Native Glance for iOS Lockscreen & Android Home
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Home Screen Widget Studio
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            Monitor upcoming VinUni lecture halls, proctored exams, and Canvas deadlines directly from your smartphone's desktop without launching the app.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCopyWidgetCode}
          className="px-5 py-2.5 bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 self-start md:self-auto whitespace-nowrap"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#D4AF37]" />}
          <span>{copied ? 'Widget Config Copied!' : 'Export Widget Code'}</span>
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Widget Customization Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Select Widget Size
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'small', label: 'Small (2×2)', desc: 'Next class countdown' },
                { id: 'medium', label: 'Medium (4×2)', desc: 'Recommended balance' },
                { id: 'large', label: 'Large (4×4)', desc: 'Full daily agenda' },
                { id: 'lockscreen', label: 'Lockscreen', desc: 'Minimal ambient bar' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setWidgetSize(s.id as WidgetSize)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    widgetSize === s.id
                      ? 'border-[#0B2545] bg-slate-50 font-bold text-[#0B2545]'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="block font-bold text-xs">{s.label}</span>
                  <span className="text-[11px] text-slate-500 font-normal">{s.desc}</span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                2. Theme Palette
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'vinuni_navy', label: 'VinUni Navy', bg: 'bg-[#0B2545]' },
                  { id: 'paper_white', label: 'Paper White', bg: 'bg-white border border-slate-300' },
                  { id: 'midnight_glass', label: 'Midnight Dark', bg: 'bg-slate-900' },
                  { id: 'clean_minimal', label: 'Slate Neutral', bg: 'bg-slate-800' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setWidgetTheme(t.id as WidgetTheme)}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      widgetTheme === t.id
                        ? 'border-[#0B2545] bg-slate-50 font-bold text-[#0B2545]'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${t.bg}`} />
                    <span className="whitespace-nowrap">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                3. Wallpaper Preview
              </h3>
              <div className="flex items-center gap-2">
                {[
                  { id: 'vinuni', label: 'VinUni Navy' },
                  { id: 'night', label: 'Charcoal' },
                  { id: 'slate', label: 'Deep Ocean' },
                  { id: 'mesh', label: 'Sunset' },
                ].map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setWallpaper(w.id as any)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all text-center whitespace-nowrap ${
                      wallpaper === w.id
                        ? 'border-[#0B2545] bg-slate-100 text-[#0B2545]'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs text-slate-800 space-y-2">
            <h4 className="font-bold text-[#0B2545] flex items-center gap-1.5">
              <LayoutGrid className="w-4 h-4 text-[#0B2545]" />
              <span>How to add to iOS / Android Home Screen</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
              <li>Open this web app in Safari or Chrome on mobile</li>
              <li>Tap the Share icon & select <strong>"Add to Home Screen"</strong></li>
              <li>Long-press empty space on your home screen and tap <strong>"+"</strong></li>
              <li>Select <strong>VinUni Planner</strong> widget</li>
            </ol>
          </div>
        </div>

        {/* Right Column: Phone Mockup */}
        <div className="lg:col-span-7 flex justify-center">
          <div
            id="mobile-phone-screen-container"
            className="w-full max-w-[370px] h-[670px] rounded-[48px] p-4 bg-slate-950 shadow-2xl border-[8px] border-slate-900 relative overflow-hidden flex flex-col justify-between select-none"
          >
            {/* Dynamic Island */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-30 flex items-center justify-between px-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-white/90">COMP 2030</span>
            </div>

            {/* Background Wallpaper */}
            <div
              className={`absolute inset-0 ${
                wallpaper === 'vinuni'
                  ? 'bg-[#0B2545]'
                  : wallpaper === 'night'
                  ? 'bg-slate-950'
                  : wallpaper === 'slate'
                  ? 'bg-[#091E3A]'
                  : 'bg-slate-900'
              } z-0`}
            />

            {/* Simulated Phone Status Bar */}
            <div className="relative z-20 flex items-center justify-between px-4 pt-4 text-white text-xs font-semibold">
              <span>9:41</span>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span>5G</span>
                <span className="w-5 h-2.5 rounded-xs border border-white flex items-center p-0.5">
                  <span className="w-full h-full bg-white rounded-xs" />
                </span>
              </div>
            </div>

            {/* Home Screen Content Area */}
            <div className="relative z-10 flex-1 flex flex-col justify-start pt-6 px-1 space-y-4">
              <div className="text-white px-2">
                <p className="text-xs font-medium text-white/70">Monday, September 21</p>
                <h3 className="text-2xl font-bold tracking-tight">Good morning, Thien An</h3>
              </div>

              {/* THE WIDGET COMPONENT */}
              <div
                id="interactive-home-widget"
                className={`rounded-3xl border p-4 transition-all duration-200 ${getThemeClasses()}`}
              >
                {/* WIDGET SIZE: SMALL */}
                {widgetSize === 'small' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D4AF37]">
                        Next Class
                      </span>
                      <span className="text-[10px] opacity-75 font-mono">08:30</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm leading-tight">
                        {nextClassCourse?.code}
                      </h4>
                      <p className="text-[11px] opacity-80 mt-0.5 truncate">
                        {nextClassSlot?.building}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-[#D4AF37]">
                        <MapPin className="w-3 h-3" />
                        <span>{nextClassSlot?.room}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                      <span className="opacity-80">1 Urgent Task</span>
                      <span className="font-bold text-rose-300">Exam in 3d</span>
                    </div>
                  </div>
                )}

                {/* WIDGET SIZE: MEDIUM */}
                {widgetSize === 'medium' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold tracking-tight">OneVinUni Today</span>
                      </div>
                      <span className="text-[11px] font-mono opacity-80">
                        {activeDeadlines.length} tasks remaining
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#D4AF37] uppercase">
                          Next Up (08:30)
                        </span>
                        <h4 className="text-xs font-bold leading-tight truncate">
                          {nextClassCourse?.code}: {nextClassCourse?.name}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] opacity-90">
                          <MapPin className="w-3 h-3 text-rose-300" />
                          <span className="font-bold">{nextClassSlot?.room}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 border-l border-white/10 pl-3">
                        <span className="text-[10px] font-bold uppercase opacity-80">
                          Due Tasks
                        </span>
                        <div className="space-y-1 max-h-[85px] overflow-y-auto pr-1">
                          {activeDeadlines.slice(0, 2).map((dl) => (
                            <div
                              key={dl.id}
                              onClick={() => handleToggleTask(dl.id)}
                              className="flex items-start gap-1.5 text-[11px] cursor-pointer group"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 shrink-0 mt-0.5 text-[#D4AF37]" />
                              <span className="truncate group-hover:underline leading-tight">
                                {dl.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* WIDGET SIZE: LARGE */}
                {widgetSize === 'large' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div>
                        <span className="text-[10px] font-bold text-[#D4AF37] uppercase">
                          VinUniversity Schedule
                        </span>
                        <h4 className="text-sm font-bold">Fall 2026 Timetable</h4>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-bold font-mono">
                        GPA 3.84
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold opacity-75 uppercase">
                        Today's Classes
                      </span>
                      <div className="mt-1 space-y-1.5">
                        <div className="p-2 rounded-xl bg-white/10 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold">COMP 2030: Algorithms</span>
                            <div className="text-[10px] opacity-80">08:30 - 10:00 • Lab B204</div>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4AF37] text-[#0B2545] font-bold">
                            In 40m
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white/10 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold">MATH 1010: Calculus</span>
                            <div className="text-[10px] opacity-80">13:30 - 15:00 • Main Audi 2</div>
                          </div>
                          <span className="text-[10px] opacity-75 font-mono">13:30</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      <span className="text-[11px] font-bold opacity-75 uppercase">
                        Upcoming Due Dates
                      </span>
                      <div className="mt-1 space-y-1">
                        {activeDeadlines.slice(0, 3).map((dl) => (
                          <div
                            key={dl.id}
                            onClick={() => handleToggleTask(dl.id)}
                            className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                              <span className="truncate">{dl.title}</span>
                            </div>
                            <span className="text-[10px] opacity-75 shrink-0 ml-2 font-mono">
                              {dl.dueDate.slice(5)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* WIDGET SIZE: LOCKSCREEN */}
                {widgetSize === 'lockscreen' && (
                  <div className="flex items-center justify-between py-1 px-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#D4AF37]" />
                      <div>
                        <span className="text-xs font-bold">COMP 2030 in 40 min</span>
                        <div className="text-[10px] opacity-75">Lab B204 • Dr. Tu</div>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-[#D4AF37] font-mono">08:30</span>
                  </div>
                )}
              </div>

              {/* App Grid Icons */}
              <div className="grid grid-cols-4 gap-4 px-2 pt-2">
                {[
                  { name: 'OneVinUni', color: 'bg-[#0B2545]', letter: 'VU' },
                  { name: 'Canvas', color: 'bg-red-700', letter: 'C' },
                  { name: 'Teams', color: 'bg-indigo-700', letter: 'T' },
                  { name: 'Outlook', color: 'bg-blue-700', letter: 'O' },
                ].map((app, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-12 h-12 rounded-2xl ${app.color} text-white font-bold flex items-center justify-center text-sm shadow-md`}
                    >
                      {app.letter}
                    </div>
                    <span className="text-[10px] text-white/90 font-medium">{app.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom App Dock */}
            <div className="relative z-10 bg-white/20 backdrop-blur-md rounded-3xl p-3 grid grid-cols-4 gap-3 mb-2">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs mx-auto">
                Phone
              </div>
              <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs mx-auto">
                Safari
              </div>
              <div className="w-11 h-11 rounded-2xl bg-[#0B2545] text-[#D4AF37] flex items-center justify-center text-xs font-bold shadow-xs mx-auto">
                SIS
              </div>
              <div className="w-11 h-11 rounded-2xl bg-slate-800 text-white flex items-center justify-center text-xs font-bold shadow-xs mx-auto">
                Mail
              </div>
            </div>

            {/* Home Indicator */}
            <div className="w-32 h-1 bg-white/60 rounded-full mx-auto mb-1 relative z-20" />
          </div>
        </div>
      </div>
    </div>
  );
};
