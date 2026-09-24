import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare,
  Plus,
  Bell,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Filter,
  Search,
  Sparkles,
  Share2,
  X,
  GraduationCap,
} from 'lucide-react';
import { Deadline, Course, DeadlineType, PriorityLevel } from '../types';
import confetti from 'canvas-confetti';
import { soundEffects } from '../utils/sound';
import { sendBrowserNotification } from '../utils/notifications';

interface DeadlinesManagerProps {
  deadlines: Deadline[];
  courses: Course[];
  onToggleDeadlineStatus: (deadlineId: string) => void;
  onToggleReminder: (deadlineId: string) => void;
  onAddDeadline: (deadline: Deadline) => void;
  onSelectCourse: (course: Course) => void;
  onNavigateToCanvasFeed?: () => void;
}

export const DeadlinesManager: React.FC<DeadlinesManagerProps> = ({
  deadlines,
  courses,
  onToggleDeadlineStatus,
  onToggleReminder,
  onAddDeadline,
  onSelectCourse,
  onNavigateToCanvasFeed,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newCourseId, setNewCourseId] = useState(courses[0]?.id || '');
  const [newType, setNewType] = useState<DeadlineType>('Assignment');
  const [newDueDate, setNewDueDate] = useState('2026-09-25');
  const [newDueTime, setNewDueTime] = useState('23:59');
  const [newWeight, setNewWeight] = useState(10);
  const [newLocation, setNewLocation] = useState('');
  const [newPriority, setNewPriority] = useState<PriorityLevel>('high');
  const [newSubmissionUrl, setNewSubmissionUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const getCanvasDirectUrl = (dl: Deadline, course?: Course): string => {
    if (dl.submissionUrl && (dl.submissionUrl.startsWith('http://') || dl.submissionUrl.startsWith('https://'))) {
      return dl.submissionUrl;
    }
    const cleanCode = course?.code ? course.code.replace(/\s+/g, '').toLowerCase() : 'courses';
    const idNum = dl.id.replace(/[^0-9]/g, '') || '1';
    return `https://vinuni.instructure.com/courses/${cleanCode}/assignments/${idNum}`;
  };

  const handleToggleComplete = (id: string) => {
    soundEffects.playSuccessPop();
    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}
    onToggleDeadlineStatus(id);
  };

  const handleTriggerReminderTest = (dl: Deadline) => {
    const course = courses.find((c) => c.id === dl.courseId);
    sendBrowserNotification(`⚡ [${dl.type.toUpperCase()}] ${course?.code || 'Course'} Due Soon!`, {
      body: `${dl.title} is due on ${dl.dueDate} at ${dl.dueTime}. Location: ${dl.location || 'Canvas Submission'}.`,
    });
    onToggleReminder(dl.id);
  };

  const handleCreateDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created: Deadline = {
      id: `dl-${Date.now()}`,
      courseId: newCourseId,
      title: newTitle.trim(),
      type: newType,
      dueDate: newDueDate,
      dueTime: newDueTime,
      weightPercentage: Number(newWeight) || 0,
      location: newLocation.trim() || undefined,
      submissionUrl: newSubmissionUrl.trim() || undefined,
      description: newDescription.trim() || undefined,
      status: 'pending',
      priority: newPriority,
      reminderSet: true,
      teamsSyncId: `teams-${Date.now()}`,
      outlookSyncId: `outlook-${Date.now()}`,
    };

    onAddDeadline(created);
    setShowAddModal(false);
    setNewTitle('');
    setNewSubmissionUrl('');
    setNewDescription('');

    sendBrowserNotification(`New ${newType} Added: ${created.title}`, {
      body: `Scheduled for ${created.dueDate} at ${created.dueTime}. Synced with OneVinUni & Teams.`,
    });
  };

  const filteredDeadlines = deadlines.filter((d) => {
    if (filterType !== 'all' && d.type.toLowerCase() !== filterType.toLowerCase()) {
      return false;
    }
    if (filterStatus === 'pending' && d.status === 'completed') return false;
    if (filterStatus === 'completed' && d.status !== 'completed') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const course = courses.find((c) => c.id === d.courseId);
      const matchTitle = d.title.toLowerCase().includes(q);
      const matchCourse = course?.code.toLowerCase().includes(q) || course?.name.toLowerCase().includes(q);
      if (!matchTitle && !matchCourse) return false;
    }
    return true;
  });

  const getDaysRemaining = (dueDate: string, dueTime: string) => {
    const target = new Date(`${dueDate}T${dueTime}:00`);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Past due';
    if (diffDays === 0) return 'Due today!';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  return (
    <div className="space-y-4">
      {/* Header Container: Crisp, solid VinUni branding, no generic gradients */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-[#0B2545] border border-slate-200">
              OneVinUni Canvas Sync
            </span>
            <span className="text-xs text-slate-500">
              Real-time Automated Push Notifications & Outlook Webhooks
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Assignments, Quizzes & Exam Planner
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {onNavigateToCanvasFeed && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onNavigateToCanvasFeed}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#0B2545] font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap border border-blue-200"
            >
              <GraduationCap className="w-4 h-4 text-blue-700" />
              <span>Live Canvas iCal Feed</span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>Add Deadline or Exam</span>
          </motion.button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by assignment name or course code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B2545]"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                filterStatus === 'pending'
                  ? 'bg-white text-[#0B2545] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                filterStatus === 'completed'
                  ? 'bg-white text-[#0B2545] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                filterStatus === 'all'
                  ? 'bg-white text-[#0B2545] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700"
          >
            <option value="all">All Types</option>
            <option value="exam">Exams Only</option>
            <option value="assignment">Assignments Only</option>
            <option value="quiz">Quizzes Only</option>
            <option value="project">Projects Only</option>
          </select>
        </div>
      </div>

      {/* Deadlines List with Framer Motion layout */}
      <div className="space-y-3">
        {filteredDeadlines.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
            <CheckSquare className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-base font-bold text-slate-700">No matching deadlines found</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search filters or click "Add Deadline or Exam" above.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredDeadlines.map((dl) => {
              const course = courses.find((c) => c.id === dl.courseId);
              const isExam = dl.type === 'Exam';
              const isCompleted = dl.status === 'completed';
              const timeRemaining = getDaysRemaining(dl.dueDate, dl.dueTime);

              return (
                <motion.div
                  key={dl.id}
                  id={`deadline-card-${dl.id}`}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className={`p-5 rounded-2xl border transition-all ${
                    isCompleted
                      ? 'bg-slate-50/60 border-slate-200 opacity-60'
                      : isExam
                      ? 'bg-white border-red-200 shadow-xs hover:border-red-300'
                      : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left details */}
                    <div className="flex items-start gap-3.5">
                      <button
                        onClick={() => handleToggleComplete(dl.id)}
                        className={`mt-1 p-1 rounded-full transition-transform active:scale-90 ${
                          isCompleted
                            ? 'text-emerald-600 hover:text-slate-400'
                            : 'text-slate-300 hover:text-emerald-600'
                        }`}
                        title={isCompleted ? 'Mark as Incomplete' : 'Mark as Completed'}
                      >
                        <CheckCircle2 className="w-6 h-6" />
                      </button>

                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          {course && (
                            <button
                              onClick={() => onSelectCourse(course)}
                              className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-md text-white hover:opacity-90 transition-opacity whitespace-nowrap"
                              style={{ backgroundColor: course.color }}
                            >
                              {course.code}
                            </button>
                          )}

                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded whitespace-nowrap ${
                              isExam
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : dl.type === 'Project'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {dl.type}
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                              timeRemaining.includes('today') || timeRemaining.includes('tomorrow')
                                ? 'bg-amber-100 text-amber-900 font-extrabold animate-pulse'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {timeRemaining}
                          </span>

                          {dl.weightPercentage && (
                            <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                              Weight: {dl.weightPercentage}%
                            </span>
                          )}
                        </div>

                        <h3
                          className={`text-base font-bold text-slate-900 ${
                            isCompleted ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {dl.title}
                        </h3>

                        {dl.description && (
                          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                            {dl.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-[#0B2545]" />
                            <span className="font-mono">
                              {dl.dueDate} • {dl.dueTime}
                            </span>
                          </span>

                          {dl.location && (
                            <span className="flex items-center gap-1 text-slate-700">
                              <MapPin className="w-3.5 h-3.5 text-rose-500" />
                              <span>{dl.location}</span>
                            </span>
                          )}

                          <span className="flex items-center gap-1 text-slate-500 text-[11px] font-medium">
                            <Share2 className="w-3 h-3 text-[#0B2545]" />
                            <span>Teams / Outlook Synced</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0">
                      <button
                        onClick={() => handleTriggerReminderTest(dl)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                          dl.reminderSet
                            ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Send instant real-time push alert notification"
                      >
                        <Bell className={`w-3.5 h-3.5 ${dl.reminderSet ? 'text-amber-600' : ''}`} />
                        <span>Push Alert</span>
                      </button>

                      <a
                        id={`canvas-link-${dl.id}`}
                        href={getCanvasDirectUrl(dl, course)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 hover:border-red-300 text-xs font-bold rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-colors shadow-xs"
                        title={`Open ${dl.title} directly in Canvas LMS`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block shrink-0" />
                        <span>Canvas</span>
                        <ExternalLink className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Add Deadline Modal: Clean form, 2x button padding math */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add Deadline or Exam</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDeadline} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Exam, Assignment 2, Lab Quiz"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0B2545] text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course</label>
                  <select
                    value={newCourseId}
                    onChange={(e) => setNewCourseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as DeadlineType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="Assignment">Assignment</option>
                    <option value="Exam">Exam / Midterm / Final</option>
                    <option value="Quiz">Quiz</option>
                    <option value="Project">Project Milestone</option>
                    <option value="Reading">Textbook Reading</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due Time</label>
                  <input
                    type="time"
                    required
                    value={newDueTime}
                    onChange={(e) => setNewDueTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Grade Weight (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newWeight}
                    onChange={(e) => setNewWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Physical Classroom / Exam Hall (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Auditorium 1, Seat B-14 or Lab B204"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Canvas Assignment Direct URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://vinuni.instructure.com/courses/.../assignments/..."
                  value={newSubmissionUrl}
                  onChange={(e) => setNewSubmissionUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Instructions, chapters covered, submission guidelines..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-900 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 font-bold text-white bg-[#0B2545] hover:bg-[#134074] rounded-xl shadow-xs transition-colors"
                >
                  Save & Push Alert
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
