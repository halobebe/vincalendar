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
  Trash2,
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
  onDeleteDeadline?: (deadlineId: string) => void;
  onClearAllDeadlines?: () => void;
  onSelectCourse: (course: Course) => void;
  onNavigateToCanvasFeed?: () => void;
}

export const DeadlinesManager: React.FC<DeadlinesManagerProps> = ({
  deadlines,
  courses,
  onToggleDeadlineStatus,
  onToggleReminder,
  onAddDeadline,
  onDeleteDeadline,
  onClearAllDeadlines,
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

  const getCanvasDirectUrl = (deadline: Deadline, course?: Course): string => {
    if (deadline.submissionUrl && deadline.submissionUrl.startsWith('http')) {
      return deadline.submissionUrl;
    }
    const canvasCourseId = course?.id.replace(/[^0-9]/g, '') || '1020';
    return `https://vinuni.instructure.com/courses/${canvasCourseId}/assignments`;
  };

  const handleToggleComplete = (dl: Deadline) => {
    if (dl.status !== 'completed') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
      soundEffects.playComplete();
    }
    onToggleDeadlineStatus(dl.id);
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
    const due = new Date(`${dueDate}T${dueTime || '23:59'}:00`);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-4">
      {/* Header Container */}
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
          {deadlines.length > 0 && onClearAllDeadlines && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClearAllDeadlines}
              className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap border border-red-200"
              title="Clear all sample/mock deadlines"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Clear Sample Deadlines</span>
            </motion.button>
          )}

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

      {/* Deadlines List */}
      <div className="space-y-3">
        {filteredDeadlines.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">No deadlines found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You're all caught up! You can import your real coursework anytime from the Canvas iCal Feed tab.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredDeadlines.map((dl) => {
              const course = courses.find((c) => c.id === dl.courseId);
              const daysLeft = getDaysRemaining(dl.dueDate, dl.dueTime);
              const isUrgent = daysLeft <= 2 && dl.status !== 'completed';
              const isCompleted = dl.status === 'completed';

              return (
                <motion.div
                  key={dl.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
                    isCompleted
                      ? 'border-slate-200 opacity-60 bg-slate-50/50'
                      : isUrgent
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Checkbox & Info */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggleComplete(dl)}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                          isCompleted
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 hover:border-slate-400 bg-white'
                        }`}
                      >
                        {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <button
                            onClick={() => course && onSelectCourse(course)}
                            className="text-xs font-bold text-[#0B2545] hover:underline"
                          >
                            {course?.code || 'General'}
                          </button>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            {dl.type}
                          </span>
                          {dl.weightPercentage && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-[11px] font-bold text-[#D4AF37]">
                                {dl.weightPercentage}% of Grade
                              </span>
                            </>
                          )}
                        </div>

                        <h4
                          className={`text-sm font-bold text-slate-900 truncate ${
                            isCompleted ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {dl.title}
                        </h4>

                        {dl.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{dl.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{dl.dueDate}</span>
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{dl.dueTime}</span>
                          </span>
                          <span className="flex items-center gap-1 text-[#0B2545] font-semibold">
                            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
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

                      {onDeleteDeadline && (
                        <button
                          onClick={() => onDeleteDeadline(dl.id)}
                          className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                          title="Delete this deadline"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Add Deadline Modal */}
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due Time</label>
                  <input
                    type="time"
                    required
                    value={newDueTime}
                    onChange={(e) => setNewDueTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Weight (% of Grade)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
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
                    <option value="high">High (Red)</option>
                    <option value="medium">Medium (Amber)</option>
                    <option value="low">Low (Slate)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Location / Venue</label>
                <input
                  type="text"
                  placeholder="e.g. Building A Room A203 or Canvas Online"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Canvas / Submission URL</label>
                <input
                  type="url"
                  placeholder="https://vinuni.instructure.com/courses/..."
                  value={newSubmissionUrl}
                  onChange={(e) => setNewSubmissionUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Instructions / Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of requirements..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0B2545] hover:bg-[#134074] text-white font-bold rounded-xl shadow-xs"
                >
                  Save Deadline
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
