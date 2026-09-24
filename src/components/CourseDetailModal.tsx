import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  BookOpen,
  FileText,
  Clock,
  MapPin,
  Mail,
  User,
  ExternalLink,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Plus,
  Share2,
  Download,
  Building,
  GraduationCap,
  Check,
  Edit3,
  Trash2,
} from 'lucide-react';
import { Course, Deadline } from '../types';
import confetti from 'canvas-confetti';
import { soundEffects } from '../utils/sound';

interface CourseDetailModalProps {
  course: Course | null;
  deadlines: Deadline[];
  onClose: () => void;
  onToggleChapterRead: (courseId: string, chapterNumber: number) => void;
  onToggleDeadlineStatus: (deadlineId: string) => void;
  onOpenAddDeadlineForCourse: (courseId: string) => void;
  onEditCourse?: (course: Course) => void;
  onDeleteCourse?: (courseId: string) => void;
}

type TabType = 'overview' | 'textbook' | 'syllabus' | 'deadlines';

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  course,
  deadlines,
  onClose,
  onToggleChapterRead,
  onToggleDeadlineStatus,
  onOpenAddDeadlineForCourse,
  onEditCourse,
  onDeleteCourse,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [downloadedSyllabus, setDownloadedSyllabus] = useState(false);

  if (!course) return null;

  const courseDeadlines = deadlines.filter((d) => d.courseId === course.id);
  const readChaptersCount = course.textbook.chapters.filter((c) => c.isRead).length;
  const totalChapters = course.textbook.chapters.length;
  const readingProgress = totalChapters > 0 ? Math.round((readChaptersCount / totalChapters) * 100) : 0;

  const handleCompleteDeadline = (deadlineId: string) => {
    soundEffects.playSuccessPop();
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {}
    onToggleDeadlineStatus(deadlineId);
  };

  const handleDownloadSyllabus = () => {
    setDownloadedSyllabus(true);
    soundEffects.playSuccessPop();
    setTimeout(() => setDownloadedSyllabus(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <motion.div
        id="course-detail-modal"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col"
      >
        {/* Modal Header: Solid VinUni Academic Navy, no harsh diagonal gradients */}
        <div className="p-6 bg-[#0B2545] text-white relative flex-shrink-0 border-b border-[#134074]">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold text-white tracking-wide"
              style={{ backgroundColor: course.color }}
            >
              {course.code}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D4AF37] text-[#0B2545]">
              {course.credits} Credits
            </span>
            <span className="text-xs text-slate-300 font-medium">{course.college} • {course.semester}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {course.name}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Instructor: {course.instructor.name} ({course.instructor.title})
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-[#0B2545] text-[#0B2545]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Classroom & Faculty</span>
          </button>

          <button
            onClick={() => setActiveTab('textbook')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'textbook'
                ? 'border-[#0B2545] text-[#0B2545]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Textbook & Readings</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800 font-extrabold font-mono">
              {readingProgress}%
            </span>
          </button>

          <button
            onClick={() => setActiveTab('syllabus')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'syllabus'
                ? 'border-[#0B2545] text-[#0B2545]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Course Syllabus</span>
          </button>

          <button
            onClick={() => setActiveTab('deadlines')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'deadlines'
                ? 'border-[#0B2545] text-[#0B2545]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Deadlines & Exams</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#D4AF37] text-[#0B2545] font-extrabold font-mono">
              {courseDeadlines.length}
            </span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#0B2545]" />
                  <span>Physical Classrooms & Time Slots</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {course.timeSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-extrabold text-sm text-slate-900">
                            {slot.day} • {slot.startTime} - {slot.endTime}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white text-[#0B2545] border border-slate-200">
                            {slot.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-2">
                          <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                          <span className="font-semibold text-slate-900">{slot.building}</span>
                        </div>
                        <div className="text-xs text-slate-500 pl-5 font-mono">
                          Room: <strong className="text-slate-900 font-bold">{slot.room}</strong>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                        <span>VinUni Campus</span>
                        <span className="text-emerald-700 font-semibold">In-Person Session</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructor Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-[#0B2545]" />
                  <span>Faculty & Instructor Profile</span>
                </h3>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#0B2545] text-[#D4AF37] font-extrabold flex items-center justify-center text-base">
                      {course.instructor.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">
                        {course.instructor.name}
                      </h4>
                      <p className="text-xs text-slate-600">{course.instructor.title}</p>
                      <p className="text-xs text-slate-700 font-medium mt-0.5">
                        Office: <strong>{course.instructor.office}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`mailto:${course.instructor.email}`}
                      className="px-4 py-2 text-xs font-bold text-white bg-[#0B2545] hover:bg-[#134074] rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email Faculty</span>
                    </a>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
                  <strong className="text-slate-900">Office Hours:</strong>{' '}
                  {course.instructor.officeHours}
                </div>
              </div>

              {/* Microsoft Teams Channel */}
              {course.teamsChannelUrl && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#0B2545] text-[#D4AF37] rounded-xl">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Microsoft Teams Class Channel
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Join discussion forum, live office hours, and collaborative channels.
                      </p>
                    </div>
                  </div>
                  <a
                    href={course.teamsChannelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-xs font-bold text-[#0B2545] bg-white hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-1 whitespace-nowrap shadow-xs"
                  >
                    <span>Open Channel</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEXTBOOK */}
          {activeTab === 'textbook' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-white text-[#0B2545] rounded-2xl border border-slate-200 shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#0B2545] uppercase tracking-wider">
                        Required Digital Textbook
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        {course.textbook.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Authors: {course.textbook.authors}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500 font-mono">
                        {course.textbook.edition && <span>Edition: {course.textbook.edition}</span>}
                        {course.textbook.isbn && <span>• ISBN: {course.textbook.isbn}</span>}
                      </div>
                    </div>
                  </div>

                  {course.textbook.onlineUrl && (
                    <a
                      href={course.textbook.onlineUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-xs font-bold text-[#0B2545] bg-[#D4AF37] hover:bg-[#C5A880] rounded-xl transition-colors shadow-xs flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open E-Book</span>
                    </a>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span>Reading Milestones</span>
                    <span>
                      {readChaptersCount} of {totalChapters} Chapters Completed ({readingProgress}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#0B2545] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${readingProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Assigned Reading Chapters & Notes
                </h4>
                <div className="space-y-2">
                  {course.textbook.chapters.map((ch) => (
                    <div
                      key={ch.number}
                      onClick={() => onToggleChapterRead(course.id, ch.number)}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        ch.isRead
                          ? 'bg-emerald-50/60 border-emerald-200 text-slate-900'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={ch.isRead}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-slate-300 text-[#0B2545] focus:ring-[#0B2545] cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold">
                            Chapter {ch.number}: {ch.title}
                          </span>
                          <span className="text-xs text-slate-500 ml-2 font-mono">
                            ({ch.pages})
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded whitespace-nowrap ${
                          ch.isRead
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {ch.isRead ? 'Completed' : 'Mark Read'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SYLLABUS */}
          {activeTab === 'syllabus' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Course Description & Objectives
                  </h4>
                  <button
                    onClick={handleDownloadSyllabus}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#0B2545] hover:text-[#134074] whitespace-nowrap"
                  >
                    {downloadedSyllabus ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Download className="w-3.5 h-3.5" />}
                    <span>{downloadedSyllabus ? 'Downloaded!' : 'Download Syllabus PDF'}</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {course.syllabus.overview}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Key Learning Outcomes
                </h4>
                <div className="space-y-2">
                  {course.syllabus.learningOutcomes.map((outcome, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-slate-200 flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-[#0B2545] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">
                        {idx + 1}
                      </span>
                      <p className="text-xs sm:text-sm text-slate-800">{outcome}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Grading Scheme & Assessment Weights
                </h4>
                <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {course.syllabus.gradingScale.map((grade, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>{grade.item}</span>
                        <span className="text-[#0B2545] font-mono">{grade.percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#0B2545] h-1.5 rounded-full"
                          style={{ width: `${grade.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <h5 className="font-bold text-slate-900 mb-1">Attendance Policy</h5>
                  <p className="text-slate-600 leading-relaxed">
                    {course.syllabus.attendancePolicy}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <h5 className="font-bold text-slate-900 mb-1">Academic Integrity</h5>
                  <p className="text-slate-600 leading-relaxed">
                    {course.syllabus.academicIntegrity}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DEADLINES */}
          {activeTab === 'deadlines' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Upcoming Assignments & Exam Dates
                </h4>
                <button
                  onClick={() => onOpenAddDeadlineForCourse(course.id)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0B2545] hover:bg-[#134074] rounded-xl shadow-xs flex items-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Add Deadline</span>
                </button>
              </div>

              {courseDeadlines.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold">No deadlines recorded for {course.code}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {courseDeadlines.map((dl) => {
                    const isExam = dl.type === 'Exam';
                    const isCompleted = dl.status === 'completed';

                    return (
                      <div
                        key={dl.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isCompleted
                            ? 'bg-slate-50/50 border-slate-200 opacity-60'
                            : isExam
                            ? 'bg-white border-red-200 shadow-xs'
                            : 'bg-white border-slate-200 shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleCompleteDeadline(dl.id)}
                              className={`mt-0.5 p-1 rounded-full transition-colors ${
                                isCompleted
                                  ? 'text-emerald-600 hover:text-slate-400'
                                  : 'text-slate-300 hover:text-emerald-600'
                              }`}
                              title={isCompleted ? 'Mark as Pending' : 'Mark as Completed'}
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>

                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded whitespace-nowrap ${
                                    isExam
                                      ? 'bg-red-50 text-red-700 border border-red-200'
                                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                                  }`}
                                >
                                  {dl.type}
                                </span>
                                {dl.weightPercentage && (
                                  <span className="text-[11px] font-bold text-slate-500 font-mono">
                                    Weight: {dl.weightPercentage}%
                                  </span>
                                )}
                              </div>

                              <h4
                                className={`text-sm sm:text-base font-bold text-slate-900 ${
                                  isCompleted ? 'line-through text-slate-400' : ''
                                }`}
                              >
                                {dl.title}
                              </h4>

                              {dl.description && (
                                <p className="text-xs text-slate-600 mt-1">{dl.description}</p>
                              )}

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                                <span className="font-semibold text-slate-800 font-mono">
                                  Due: {dl.dueDate} at {dl.dueTime}
                                </span>
                                {dl.location && (
                                  <span className="flex items-center gap-1 text-slate-600">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                    <span>{dl.location}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {dl.submissionUrl && (
                            <a
                              href={dl.submissionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 text-xs font-bold text-[#0B2545] bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-1 shrink-0 whitespace-nowrap"
                            >
                              <span>Canvas</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            {onDeleteCourse && (
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to remove ${course.code} from your schedule?`)) {
                    onDeleteCourse(course.id);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200"
                title="Remove course from calendar"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Course</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onEditCourse && (
              <button
                onClick={() => onEditCourse(course)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#0B2545] bg-white hover:bg-slate-100 rounded-xl border border-slate-300 shadow-xs transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Course</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0B2545] hover:bg-[#134074] rounded-xl shadow-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
