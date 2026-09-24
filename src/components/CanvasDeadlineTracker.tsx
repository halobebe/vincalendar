import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  ExternalLink,
  RefreshCw,
  Search,
  AlertCircle,
  BookOpen,
  Sparkles,
  HelpCircle,
  Check,
  Copy,
  Plus,
  Table as TableIcon,
  LayoutList,
  Filter,
  ArrowUpDown,
  GraduationCap,
  CalendarCheck,
  ChevronRight,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { CanvasDeadlineItem, Course, Deadline } from '../types';
import {
  fetchCanvasIcalFeed,
  parseClientIcs,
  sortAndFilterDeadlines,
  getRelativeDeadlineTime,
} from '../utils/canvasIcsParser';
import { soundEffects } from '../utils/sound';

interface CanvasDeadlineTrackerProps {
  courses?: Course[];
  onImportToCalendar?: (importedDeadlines: Deadline[]) => void;
}

const STORAGE_KEY_FEED_URL = 'canvas_ical_feed_url';
const STORAGE_KEY_SAVED_ITEMS = 'canvas_saved_deadlines';
const STORAGE_KEY_COMPLETED_IDS = 'canvas_completed_deadline_ids';

export const CanvasDeadlineTracker: React.FC<CanvasDeadlineTrackerProps> = ({
  courses = [],
  onImportToCalendar,
}) => {
  // Feed URL input state
  const [feedUrl, setFeedUrl] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_FEED_URL) || 'demo';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [rawFeedLength, setRawFeedLength] = useState<number | null>(null);

  // Parsed Deadlines
  const [deadlines, setDeadlines] = useState<CanvasDeadlineItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SAVED_ITEMS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Completed items set
  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_COMPLETED_IDS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // UI display options
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [includePast, setIncludePast] = useState(false);
  const [showHowToModal, setShowHowToModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Sync to local storage
  useEffect(() => {
    if (feedUrl && feedUrl !== 'demo') {
      localStorage.setItem(STORAGE_KEY_FEED_URL, feedUrl);
    }
  }, [feedUrl]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SAVED_ITEMS, JSON.stringify(deadlines));
  }, [deadlines]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COMPLETED_IDS, JSON.stringify(completedIds));
  }, [completedIds]);

  // Initial load if empty
  useEffect(() => {
    if (deadlines.length === 0) {
      handleFetchFeed('demo');
    }
  }, []);

  // Fetch from live iCal feed via backend proxy
  const handleFetchFeed = async (urlToFetch?: string) => {
    const targetUrl = (urlToFetch || feedUrl).trim();
    if (!targetUrl) {
      setErrorMessage('Please enter your Canvas Calendar feed URL (.ics).');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const response = await fetchCanvasIcalFeed(targetUrl, includePast);

      // Merge completion states
      const withStatus = response.deadlines.map((item) => ({
        ...item,
        completed: completedIds.includes(item.id) || completedIds.includes(item.uid),
      }));

      setDeadlines(withStatus);
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setRawFeedLength(response.rawIcsLength || null);

      setSuccessNotice(
        `Successfully synced ${response.upcomingCount} upcoming Canvas deadlines${
          response.source === 'demo' ? ' (VinUni Demo Feed)' : ''
        }!`
      );

      try {
        soundEffects.playSuccessPop();
      } catch {}

      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      console.warn('Backend proxy fetch failed, testing client-side fallback if raw ics was passed:', err);
      // Fallback: If user pasted raw ICS content
      if (targetUrl.includes('BEGIN:VCALENDAR') || targetUrl.includes('BEGIN:VEVENT')) {
        const clientParsed = parseClientIcs(targetUrl, includePast);
        setDeadlines(clientParsed);
        setSuccessNotice(`Parsed ${clientParsed.length} deadlines from pasted iCal text.`);
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        setErrorMessage(
          err?.message ||
            'Unable to fetch Canvas calendar feed. Make sure the link ends with .ics and is not blocked.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle completion
  const handleToggleComplete = (id: string) => {
    const isCompleted = completedIds.includes(id);
    let nextCompleted: string[];

    if (isCompleted) {
      nextCompleted = completedIds.filter((item) => item !== id);
    } else {
      nextCompleted = [...completedIds, id];
      try {
        soundEffects.playSuccessPop();
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#0B2545', '#D4AF37', '#10B981'],
        });
      } catch {}
    }

    setCompletedIds(nextCompleted);
    setDeadlines((prev) =>
      prev.map((d) => (d.id === id || d.uid === id ? { ...d, completed: !isCompleted } : d))
    );
  };

  // Import all or filtered upcoming deadlines to Main Calendar
  const handleImportAllToCalendar = () => {
    if (!onImportToCalendar || filteredDeadlines.length === 0) return;

    const mapped: Deadline[] = filteredDeadlines.map((c) => {
      // Find matching course by code
      const matchedCourse = courses.find(
        (co) =>
          co.code.toLowerCase().replace(/\s+/g, '') ===
          c.courseCode.toLowerCase().replace(/\s+/g, '')
      );

      return {
        id: `dl-canvas-${c.id}`,
        courseId: matchedCourse ? matchedCourse.id : `course-${c.courseCode.toLowerCase()}`,
        title: c.title,
        type:
          c.type === 'Exam'
            ? 'Exam'
            : c.type === 'Quiz'
            ? 'Quiz'
            : c.type === 'Project'
            ? 'Project'
            : 'Assignment',
        dueDate: c.dueDate,
        dueTime: c.dueTime,
        weightPercentage: c.type === 'Exam' ? 25 : c.type === 'Project' ? 20 : 10,
        location: c.location,
        description: c.description || `Synced directly from live Canvas iCal feed (${c.courseName}).`,
        status: c.completed ? 'completed' : 'pending',
        priority: c.type === 'Exam' ? 'high' : 'medium',
        submissionUrl: c.url,
        reminderSet: true,
      };
    });

    onImportToCalendar(mapped);

    try {
      soundEffects.playSuccessPop();
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch {}

    setSuccessNotice(`Added ${mapped.length} Canvas deadlines directly to your main timetable calendar!`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Distinct course names for filter dropdown
  const uniqueCourses = useMemo(() => {
    const set = new Set<string>();
    deadlines.forEach((d) => {
      if (d.courseCode && d.courseCode !== 'CANVAS') set.add(d.courseCode);
      else if (d.courseName) set.add(d.courseName);
    });
    return Array.from(set).sort();
  }, [deadlines]);

  // Filtered & sorted deadlines
  const filteredDeadlines = useMemo(() => {
    return sortAndFilterDeadlines(deadlines, {
      includePast,
      courseFilter: selectedCourse,
      typeFilter: selectedType,
      searchQuery,
    });
  }, [deadlines, includePast, selectedCourse, selectedType, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const now = new Date().getTime();
    const upcoming = deadlines.filter((d) => new Date(d.dueDateTime).getTime() >= now);
    const dueThisWeek = upcoming.filter((d) => {
      const diffDays =
        (new Date(d.dueDateTime).getTime() - now) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    });
    const exams = upcoming.filter((d) => d.type === 'Exam');
    const done = deadlines.filter((d) => completedIds.includes(d.id) || completedIds.includes(d.uid)).length;

    return {
      upcomingTotal: upcoming.length,
      dueThisWeek: dueThisWeek.length,
      examsTotal: exams.length,
      completedTotal: done,
    };
  }, [deadlines, completedIds]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#0B2545] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-[#134074]">
        {/* Subtle decorative background watermarks */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/5 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
                Live iCal (.ics) Feed Integration
              </span>
              <span className="text-xs text-slate-300 font-medium hidden sm:inline">
                CORS-Proxied • node-ical Parsed • Auto-Sorted
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <span>Canvas LMS Deadline Tracker</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Connect your official VinUniversity Canvas calendar feed URL (.ics). Deadlines, quizzes,
              and exams are securely fetched, parsed, and sorted chronologically with direct submission links.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowHowToModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10"
            >
              <HelpCircle className="w-4 h-4 text-[#D4AF37]" />
              <span>How to get Canvas link?</span>
            </button>

            {onImportToCalendar && filteredDeadlines.length > 0 && (
              <button
                onClick={handleImportAllToCalendar}
                className="px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#bfa033] text-[#0B2545] text-xs font-black shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4 text-[#0B2545]" />
                <span>Sync to Main Calendar</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Feed URL Input Form */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFetchFeed();
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <div className="relative flex-1">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="Paste Canvas iCal feed link (e.g. https://vinuni.instructure.com/feeds/calendars/user_...ics) or 'demo'"
                className="w-full pl-10 pr-24 py-3 bg-white/95 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm rounded-2xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] font-mono shadow-inner"
              />
              {feedUrl && feedUrl !== 'demo' && (
                <button
                  type="button"
                  onClick={() => setFeedUrl('demo')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Reset Demo
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 sm:flex-initial px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 whitespace-nowrap"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Fetching & Parsing...' : 'Sync Live Feed'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFeedUrl('demo');
                  handleFetchFeed('demo');
                }}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl transition-all whitespace-nowrap border border-white/10"
              >
                Try Demo Feed
              </button>
            </div>
          </form>

          {/* Sync status info */}
          <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {lastSyncedTime
                  ? `Last refreshed: ${lastSyncedTime}`
                  : 'Live proxy ready to bypass CORS restrictions'}
              </span>
              {rawFeedLength && (
                <span className="text-slate-400 font-mono text-[11px]">
                  ({Math.round(rawFeedLength / 1024)} KB payload)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Direct Node backend proxy preserves Canvas token privacy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts & Notifications */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs sm:text-sm flex items-start justify-between gap-3 shadow-xs"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold">Error Loading Feed</h4>
                <p className="mt-0.5 text-rose-700">{errorMessage}</p>
                <button
                  onClick={() => {
                    setFeedUrl('demo');
                    handleFetchFeed('demo');
                  }}
                  className="mt-2 text-xs font-bold underline text-rose-900 hover:text-rose-950"
                >
                  Click here to switch to the verified VinUni demo feed instead
                </button>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-800 font-bold"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {successNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successNotice}</span>
            </div>
            <button
              onClick={() => setSuccessNotice(null)}
              className="text-emerald-600 hover:text-emerald-900 font-bold"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.upcomingTotal}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Upcoming Deadlines
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">{stats.dueThisWeek}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Due Within 7 Days
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-purple-700">{stats.examsTotal}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Exams & Midterms
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600">{stats.completedTotal}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Marked Completed
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search assignments, course code (COMP 2030), or exam keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2545] bg-slate-50 focus:bg-white"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Course filter */}
          <div className="flex items-center gap-1">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 max-w-[150px] truncate"
            >
              <option value="ALL">All Courses ({uniqueCourses.length})</option>
              {uniqueCourses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Type filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700"
          >
            <option value="ALL">All Types</option>
            <option value="Assignment">Assignments Only</option>
            <option value="Quiz">Quizzes Only</option>
            <option value="Exam">Exams & Tests</option>
            <option value="Project">Projects & Milestones</option>
            <option value="Discussion">Discussions</option>
          </select>

          {/* Include Past Deadlines toggle */}
          <button
            onClick={() => setIncludePast(!includePast)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors flex items-center gap-1.5 ${
              includePast
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <span>{includePast ? 'Showing Past Due' : 'Hide Past Due'}</span>
          </button>

          {/* View Switcher: Table vs Cards */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white text-[#0B2545] shadow-xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Card View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-[#0B2545] shadow-xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Parsed Deadlines List or Table */}
      {filteredDeadlines.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No deadlines match your filter</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Try adjusting your search query, clearing course filters, or click &ldquo;Sync Live Feed&rdquo; to
            refresh items from Canvas.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCourse('ALL');
                setSelectedType('ALL');
                setIncludePast(true);
              }}
              className="px-4 py-2 text-xs font-bold text-[#0B2545] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
            >
              Show All Deadlines (Include Past)
            </button>
            <button
              onClick={() => {
                setFeedUrl('demo');
                handleFetchFeed('demo');
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0B2545] hover:bg-[#134074] rounded-xl transition-colors"
            >
              Load Verified VinUni Demo Feed
            </button>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARD LIST VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDeadlines.map((item) => {
            const relTime = getRelativeDeadlineTime(item.dueDateTime);
            const isDone = item.completed;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isDone
                    ? 'opacity-60 border-slate-200 bg-slate-50/60'
                    : item.isPast
                    ? 'border-rose-200 bg-rose-50/20'
                    : relTime.urgency === 'urgent'
                    ? 'border-amber-300 bg-amber-50/15'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div>
                  {/* Top Line: Checkbox, Course badge, Type, Urgency countdown */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleToggleComplete(item.id)}
                        className={`transition-colors p-0.5 rounded-md ${
                          isDone ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'
                        }`}
                        title={isDone ? 'Mark as pending' : 'Mark as completed'}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 fill-emerald-100 text-emerald-600" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <span className="px-2.5 py-0.5 rounded-lg bg-[#0B2545] text-[#D4AF37] font-black text-xs tracking-wide">
                        {item.courseCode}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          item.type === 'Exam'
                            ? 'bg-purple-100 text-purple-700'
                            : item.type === 'Quiz'
                            ? 'bg-blue-100 text-blue-700'
                            : item.type === 'Project'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>

                    {/* Urgency Badge */}
                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        isDone
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : relTime.urgency === 'overdue'
                          ? 'bg-rose-100 text-rose-700 border border-rose-300'
                          : relTime.urgency === 'urgent'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{isDone ? 'Completed' : relTime.text}</span>
                    </span>
                  </div>

                  {/* Title & Course Name */}
                  <h3
                    className={`font-bold text-slate-900 text-sm mt-3 ${
                      isDone ? 'line-through text-slate-500' : ''
                    }`}
                  >
                    {item.title}
                  </h3>

                  <div className="text-xs text-slate-500 font-medium mt-1 truncate">
                    {item.courseName}
                  </div>

                  {/* Description preview if present */}
                  {item.description && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 bg-slate-50 p-2 rounded-xl border border-slate-100 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Card Footer: Due timestamp + Canvas link */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {item.dueDate} at {item.dueTime}
                    </span>
                  </div>

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <span>Open Canvas</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-10">Done</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Assignment / Exam</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Time Left</th>
                  <th className="py-3 px-4 text-right">Canvas Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeadlines.map((item) => {
                  const relTime = getRelativeDeadlineTime(item.dueDateTime);
                  const isDone = item.completed;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isDone ? 'bg-slate-50/40 text-slate-400' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleComplete(item.id)}
                          className={`p-0.5 rounded-md ${
                            isDone ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-extrabold text-[#0B2545] px-2 py-0.5 bg-slate-100 rounded-md">
                          {item.courseCode}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900 max-w-xs">
                        <span className={isDone ? 'line-through text-slate-400' : ''}>
                          {item.title}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            item.type === 'Exam'
                              ? 'bg-purple-100 text-purple-700'
                              : item.type === 'Quiz'
                              ? 'bg-blue-100 text-blue-700'
                              : item.type === 'Project'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {item.dueDate} {item.dueTime}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-700'
                              : relTime.urgency === 'overdue'
                              ? 'bg-rose-100 text-rose-700'
                              : relTime.urgency === 'urgent'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {isDone ? 'Done' : relTime.text}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 text-xs hover:underline"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Guide Modal: How to retrieve Canvas iCal link */}
      <AnimatePresence>
        {showHowToModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0B2545] text-[#D4AF37] flex items-center justify-center font-bold">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      How to get your Canvas iCal Link
                    </h3>
                    <p className="text-xs text-slate-500">Takes less than 15 seconds</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHowToModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-[#0B2545] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong>Log into Canvas:</strong> Go to{' '}
                    <a
                      href="https://vinuni.instructure.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      vinuni.instructure.com
                    </a>{' '}
                    with your student Single Sign-On (SSO).
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-[#0B2545] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong>Open Calendar:</strong> Click the <strong>Calendar</strong> icon on the
                    left global navigation bar.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-[#0B2545] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong>Click &ldquo;Calendar Feed&rdquo;:</strong> Scroll down to the bottom right sidebar
                    and click the <strong>Calendar Feed</strong> link.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-[#0B2545] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <strong>Copy URL:</strong> Copy the link provided (starts with{' '}
                    <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">https://...</code> or{' '}
                    <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">webcal://...</code>{' '}
                    ending in <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">.ics</code>)
                    and paste it into the tracker box above!
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setFeedUrl('demo');
                    handleFetchFeed('demo');
                    setShowHowToModal(false);
                  }}
                  className="text-xs font-bold text-[#0B2545] hover:underline"
                >
                  Or test with sample data
                </button>

                <button
                  type="button"
                  onClick={() => setShowHowToModal(false)}
                  className="px-5 py-2 text-xs font-bold bg-[#0B2545] text-white rounded-xl shadow-xs hover:bg-[#134074]"
                >
                  Got It!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
