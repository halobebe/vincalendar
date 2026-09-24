import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  X,
  Plus,
  Trash2,
  Clock,
  MapPin,
  User,
  BookOpen,
  Search,
  Check,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  GraduationCap,
  Calendar,
} from 'lucide-react';
import { Course, TimeSlot, DayOfWeek, ClassType } from '../types';
import { ZENON_COURSE_CATALOG, CatalogCourse } from '../data/zenonCourseCatalog';
import { soundEffects } from '../utils/sound';

interface AddEditCourseModalProps {
  onClose: () => void;
  onSaveCourse: (course: Course) => void;
  courseToEdit?: Course | null;
  initialDay?: DayOfWeek;
  initialStartTime?: string;
}

const COLOR_OPTIONS = [
  '#0B2545', // VinUni Navy
  '#1E40AF', // Deep Blue
  '#047857', // Emerald
  '#B45309', // Amber
  '#7C3AED', // Purple
  '#BE123C', // Crimson
  '#0E7490', // Cyan
];

export const AddEditCourseModal: React.FC<AddEditCourseModalProps> = ({
  onClose,
  onSaveCourse,
  courseToEdit,
  initialDay,
  initialStartTime,
}) => {
  const isEditing = !!courseToEdit;

  // Active view: 'catalog' | 'custom'
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>(
    isEditing ? 'custom' : 'catalog'
  );

  // Catalog search and filter state
  const [catalogQuery, setCatalogQuery] = useState('');
  const [selectedCollege, setSelectedCollege] = useState<string>('ALL');
  const [selectedCredits, setSelectedCredits] = useState<string>('ALL');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [filterBySelectedDay, setFilterBySelectedDay] = useState(false);
  const [catalogPage, setCatalogPage] = useState(1);
  const ITEMS_PER_PAGE = 16;

  // Manual Form State
  const [code, setCode] = useState(courseToEdit ? courseToEdit.code : '');
  const [name, setName] = useState(courseToEdit ? courseToEdit.name : '');
  const [credits, setCredits] = useState<number>(courseToEdit ? courseToEdit.credits : 3);
  const [college, setCollege] = useState<'CECS' | 'CBM' | 'CHS' | 'CAS'>(
    courseToEdit ? courseToEdit.college : 'CECS'
  );
  const [selectedColor, setSelectedColor] = useState(
    courseToEdit ? courseToEdit.color : COLOR_OPTIONS[0]
  );

  // Autocomplete suggestions in manual form
  const [showCodeSuggestions, setShowCodeSuggestions] = useState(false);

  // Instructor
  const [instructorName, setInstructorName] = useState(
    courseToEdit ? courseToEdit.instructor.name : ''
  );
  const [instructorTitle, setInstructorTitle] = useState(
    courseToEdit ? courseToEdit.instructor.title : 'Faculty Member'
  );
  const [instructorEmail, setInstructorEmail] = useState(
    courseToEdit ? courseToEdit.instructor.email : ''
  );
  const [instructorOffice, setInstructorOffice] = useState(
    courseToEdit ? courseToEdit.instructor.office : 'VinUni Academic Building'
  );
  const [officeHours, setOfficeHours] = useState(
    courseToEdit ? courseToEdit.instructor.officeHours : 'Tuesdays 14:00 - 16:00'
  );

  // Time slots
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(() => {
    if (courseToEdit && courseToEdit.timeSlots.length > 0) {
      return courseToEdit.timeSlots;
    }
    const defaultStart = initialStartTime || '08:30';
    const [h, m] = defaultStart.split(':').map(Number);
    const endH = Math.min(h + 1, 18).toString().padStart(2, '0');
    const defaultEnd = `${endH}:${(m + 30) % 60 === 0 ? '30' : '00'}`;

    return [
      {
        id: `slot-${Date.now()}-1`,
        day: initialDay || 'Mon',
        startTime: defaultStart,
        endTime: defaultEnd,
        type: 'Lecture',
        building: 'Main Academic Building',
        room: 'Room A201',
      },
    ];
  });

  // Textbook
  const [bookTitle, setBookTitle] = useState(
    courseToEdit ? courseToEdit.textbook.title : ''
  );
  const [bookAuthors, setBookAuthors] = useState(
    courseToEdit ? courseToEdit.textbook.authors : ''
  );
  const [bookISBN, setBookISBN] = useState(
    courseToEdit ? courseToEdit.textbook.isbn || '' : ''
  );

  // Syllabus overview
  const [syllabusOverview, setSyllabusOverview] = useState(
    courseToEdit ? courseToEdit.syllabus.overview : ''
  );

  // Filter Catalog Courses
  const filteredCatalog = useMemo(() => {
    const q = catalogQuery.toLowerCase().trim();

    return ZENON_COURSE_CATALOG.filter((c) => {
      // Query filter (matches code, name, classCode, instructor, room)
      if (q) {
        const matchCode = c.code.toLowerCase().includes(q);
        const matchName = c.name.toLowerCase().includes(q);
        const matchClass = c.classCode.toLowerCase().includes(q);
        const matchInstructor = c.instructor.name.toLowerCase().includes(q);
        const matchRoom = c.timeSlots.some((s) => s.room.toLowerCase().includes(q));
        if (!matchCode && !matchName && !matchClass && !matchInstructor && !matchRoom) {
          return false;
        }
      }

      // College filter
      if (selectedCollege !== 'ALL' && c.college !== selectedCollege) {
        return false;
      }

      // Credits filter
      if (selectedCredits !== 'ALL') {
        if (selectedCredits === '4+' && c.credits < 4) return false;
        if (selectedCredits !== '4+' && c.credits !== Number(selectedCredits)) return false;
      }

      // Open only filter
      if (onlyOpen && c.isFull) {
        return false;
      }

      // Filter by initial slot day
      if (filterBySelectedDay && initialDay) {
        const hasDay = c.timeSlots.some((s) => s.day === initialDay);
        if (!hasDay) return false;
      }

      return true;
    });
  }, [catalogQuery, selectedCollege, selectedCredits, onlyOpen, filterBySelectedDay, initialDay]);

  // Paginated Catalog items
  const paginatedCatalog = useMemo(() => {
    return filteredCatalog.slice(0, catalogPage * ITEMS_PER_PAGE);
  }, [filteredCatalog, catalogPage]);

  // Autocomplete suggestions for manual course code input
  const codeSuggestions = useMemo(() => {
    if (!code.trim() || code.length < 2) return [];
    const q = code.toLowerCase().trim();
    return ZENON_COURSE_CATALOG.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [code]);

  // Apply Catalog Course to Manual Form
  const handleSelectToCustomize = (course: CatalogCourse) => {
    setCode(course.code);
    setName(course.name);
    setCredits(course.credits);
    setCollege(course.college);
    setSelectedColor(course.color);
    setInstructorName(course.instructor.name);
    setInstructorTitle(course.instructor.title);
    setInstructorEmail(course.instructor.email);
    setInstructorOffice(course.instructor.office);
    setOfficeHours(course.instructor.officeHours);
    setTimeSlots(course.timeSlots);
    setBookTitle(course.textbook.title);
    setBookAuthors(course.textbook.authors);
    setBookISBN(course.textbook.isbn || '');
    setSyllabusOverview(course.syllabus.overview);
    setActiveTab('custom');
  };

  // Instant Add Course from Catalog to Timetable
  const handleInstantAdd = (course: CatalogCourse) => {
    // Fire festive celebration
    try {
      soundEffects.playSuccessPop();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#0B2545', '#D4AF37', '#1E40AF', '#10B981'],
      });
    } catch {
      // Audio or canvas fallback
    }

    const courseToAdd: Course = {
      ...course,
      id: `course-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };

    onSaveCourse(courseToAdd);
  };

  const handleAddTimeSlot = () => {
    setTimeSlots([
      ...timeSlots,
      {
        id: `slot-${Date.now()}-${timeSlots.length + 1}`,
        day: 'Wed',
        startTime: '10:15',
        endTime: '11:45',
        type: 'Lab',
        building: 'Building B - Science Wing',
        room: 'Lab B102',
      },
    ]);
  };

  const handleRemoveTimeSlot = (id: string) => {
    if (timeSlots.length <= 1) return;
    setTimeSlots(timeSlots.filter((s) => s.id !== id));
  };

  const handleUpdateSlot = (id: string, field: keyof TimeSlot, value: any) => {
    setTimeSlots(
      timeSlots.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    try {
      soundEffects.playSuccessPop();
      confetti({
        particleCount: 40,
        spread: 55,
        origin: { y: 0.7 },
      });
    } catch {
      // Audio fallback
    }

    const newCourse: Course = {
      id: courseToEdit ? courseToEdit.id : `course-${Date.now()}`,
      code: code.toUpperCase().trim(),
      name: name.trim(),
      credits: Number(credits) || 3,
      college,
      color: selectedColor,
      accentBg: courseToEdit ? courseToEdit.accentBg : 'bg-slate-50',
      accentBorder: courseToEdit ? courseToEdit.accentBorder : 'border-slate-200',
      accentText: courseToEdit ? courseToEdit.accentText : 'text-[#0B2545]',
      semester: courseToEdit ? courseToEdit.semester : 'Fall 2026',
      timeSlots,
      instructor: {
        name: instructorName.trim() || 'Prof. Faculty Member',
        title: instructorTitle,
        email: instructorEmail.trim() || `${code.toLowerCase()}@vinuni.edu.vn`,
        office: instructorOffice,
        officeHours,
      },
      textbook: {
        title: bookTitle.trim() || `${name} Standard Course Reader`,
        authors: bookAuthors.trim() || 'VinUni Faculty',
        isbn: bookISBN.trim() || '978-0134685991',
        edition: 'Fall 2026 Edition',
        onlineUrl: 'https://library.vinuni.edu.vn',
        chapters: [
          { number: 1, title: 'Introduction & Foundations', pages: '1-45', isRead: true },
          { number: 2, title: 'Core Principles & Theory', pages: '46-92', isRead: false },
          { number: 3, title: 'Advanced Methodologies & Lab Work', pages: '93-160', isRead: false },
        ],
      },
      syllabus: {
        overview:
          syllabusOverview.trim() ||
          `${name} provides an in-depth exploration of core principles, modern academic methodologies, and practical applications aligned with VinUniversity standards.`,
        learningOutcomes: [
          'Master fundamental theory and apply practical problem solving.',
          'Demonstrate academic research and project presentation skills.',
          'Collaborate effectively in cross-disciplinary lab environments.',
        ],
        gradingScale: [
          { item: 'Assignments & Problem Sets', percentage: 30 },
          { item: 'Midterm Examination', percentage: 25 },
          { item: 'Final Exam or Capstone Project', percentage: 35 },
          { item: 'Classroom Participation', percentage: 10 },
        ],
        attendancePolicy: 'Minimum 80% attendance is mandatory according to VinUniversity Academic Regulations.',
      },
    };

    onSaveCourse(newCourse);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col"
      >
        {/* Modal Top Banner */}
        <div className="p-5 sm:p-6 bg-[#0B2545] text-white flex items-center justify-between border-b border-[#134074]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-[#D4AF37] uppercase tracking-wider">
                  VinUniversity Academic Registry
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-medium">
                  {ZENON_COURSE_CATALOG.length} Courses Catalog
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                {isEditing ? `Edit Course: ${courseToEdit.code}` : 'Add Course to Calendar'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (Only when adding a new course) */}
        {!isEditing && (
          <div className="px-6 pt-4 pb-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center p-1 bg-slate-200/80 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'catalog'
                    ? 'bg-white text-[#0B2545] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                <span>Browse VinUni Catalog ({ZENON_COURSE_CATALOG.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('custom')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'custom'
                    ? 'bg-white text-[#0B2545] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Custom / Manual Entry</span>
              </button>
            </div>

            {initialDay && initialStartTime && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Slot preset: {initialDay} {initialStartTime}</span>
              </div>
            )}
          </div>
        )}

        {/* Modal Body */}
        {activeTab === 'catalog' && !isEditing ? (
          /* CATALOG BROWSER VIEW */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search and Filters Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-white space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search 360+ courses by code (COMP1010), title, class code (IFAFA261), or instructor..."
                  value={catalogQuery}
                  onChange={(e) => {
                    setCatalogQuery(e.target.value);
                    setCatalogPage(1);
                  }}
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0B2545] bg-slate-50 focus:bg-white transition-all"
                />
                {catalogQuery && (
                  <button
                    onClick={() => {
                      setCatalogQuery('');
                      setCatalogPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Chips */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* College Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-400 font-medium text-[11px] mr-1">College:</span>
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'CECS', label: 'CECS' },
                    { id: 'CBM', label: 'CBM' },
                    { id: 'CHS', label: 'CHS' },
                    { id: 'CAS', label: 'CAS' },
                  ].map((col) => (
                    <button
                      key={col.id}
                      onClick={() => {
                        setSelectedCollege(col.id);
                        setCatalogPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-xl font-bold transition-all text-xs ${
                        selectedCollege === col.id
                          ? 'bg-[#0B2545] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>

                {/* Credits & Status */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 font-medium text-[11px]">Credits:</span>
                    <select
                      value={selectedCredits}
                      onChange={(e) => {
                        setSelectedCredits(e.target.value);
                        setCatalogPage(1);
                      }}
                      className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                    >
                      <option value="ALL">All Credits</option>
                      <option value="1">1 Credit</option>
                      <option value="2">2 Credits</option>
                      <option value="3">3 Credits</option>
                      <option value="4+">4+ Credits</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setOnlyOpen(!onlyOpen)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 ${
                      onlyOpen
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <Check className={`w-3 h-3 ${onlyOpen ? 'opacity-100' : 'opacity-0'}`} />
                    <span>Open Only</span>
                  </button>

                  {initialDay && (
                    <button
                      onClick={() => setFilterBySelectedDay(!filterBySelectedDay)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 ${
                        filterBySelectedDay
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <span>{initialDay} Only</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status counter */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>
                  Showing <strong className="text-slate-800">{filteredCatalog.length}</strong> of{' '}
                  <strong>{ZENON_COURSE_CATALOG.length}</strong> official VinUni course offerings
                </span>
                <span className="text-slate-400">
                  Click "+ Add to Calendar" for instant 1-click scheduling
                </span>
              </div>
            </div>

            {/* Courses List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-3">
              {filteredCatalog.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-slate-700">No courses match your filter</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Try clearing search keywords or switching college and credits filters to see all
                    360+ courses.
                  </p>
                  <button
                    onClick={() => {
                      setCatalogQuery('');
                      setSelectedCollege('ALL');
                      setSelectedCredits('ALL');
                      setOnlyOpen(false);
                      setFilterBySelectedDay(false);
                    }}
                    className="mt-4 px-4 py-2 text-xs font-bold text-[#0B2545] bg-blue-50 hover:bg-blue-100 rounded-xl"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {paginatedCatalog.map((course) => (
                    <div
                      key={course.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Course header line */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-lg bg-[#0B2545] text-[#D4AF37] font-black text-xs tracking-wide">
                              {course.code}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[11px] font-semibold">
                              {course.classCode}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${course.accentBg} ${course.accentText}`}
                            >
                              {course.college}
                            </span>
                            <span className="px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                              {course.credits} Cr
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              course.isFull
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {course.isFull ? 'Full' : `${course.currentEnrolled}/${course.maxCapacity}`}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="font-bold text-slate-900 text-sm mt-2.5 line-clamp-2">
                          {course.name}
                        </h4>

                        {/* Instructor */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-2">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{course.instructor.name}</span>
                        </div>

                        {/* Time Slots */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                          {course.timeSlots.map((slot) => (
                            <div
                              key={slot.id}
                              className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-xl text-slate-700"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#0B2545] w-8">{slot.day}</span>
                                <span className="font-mono text-[11px]">
                                  {slot.startTime} – {slot.endTime}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200 font-medium">
                                  {slot.type}
                                </span>
                                <span className="font-medium text-slate-600">
                                  {slot.room}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectToCustomize(course)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                          Customize Details
                        </button>

                        <button
                          type="button"
                          onClick={() => handleInstantAdd(course)}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#0B2545] hover:bg-[#134074] rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Add to Calendar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Load More Button */}
              {paginatedCatalog.length < filteredCatalog.length && (
                <div className="text-center pt-4 pb-2">
                  <button
                    onClick={() => setCatalogPage((p) => p + 1)}
                    className="px-6 py-2.5 text-xs font-bold text-[#0B2545] bg-white hover:bg-blue-50 border border-slate-300 rounded-2xl shadow-xs transition-all inline-flex items-center gap-2"
                  >
                    <span>Load More Courses</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                      +{Math.min(ITEMS_PER_PAGE, filteredCatalog.length - paginatedCatalog.length)}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MANUAL / CUSTOM ENTRY FORM */
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* Catalog quick-autofill banner if not editing */}
            {!isEditing && (
              <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200/80 flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span>
                    <strong>Pro-tip:</strong> Typing a Course Code below will suggest matching
                    offerings from the 360+ VinUni catalog to auto-fill all slots!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="px-3 py-1 font-bold text-[#0B2545] bg-white rounded-xl border border-blue-200 hover:bg-blue-50 transition-colors shrink-0"
                >
                  Open Catalog
                </button>
              </div>
            )}

            {/* Section 1: Course Info */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Course Details & Credits
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Course Code with Autocomplete */}
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. COMP1010"
                    value={code}
                    onFocus={() => setShowCodeSuggestions(true)}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setShowCodeSuggestions(true);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0B2545] font-mono uppercase"
                  />

                  {/* Autocomplete Dropdown */}
                  {showCodeSuggestions && codeSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden text-xs">
                      <div className="p-2 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500">
                        Select to auto-fill details ({codeSuggestions.length} found):
                      </div>
                      {codeSuggestions.map((suggestion) => (
                        <button
                          type="button"
                          key={suggestion.id}
                          onClick={() => {
                            handleSelectToCustomize(suggestion);
                            setShowCodeSuggestions(false);
                          }}
                          className="w-full text-left p-2.5 hover:bg-blue-50 border-b border-slate-100 last:border-none flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-[#0B2545]">{suggestion.code}</span>
                            <span className="text-slate-600 ml-1.5 font-medium">
                              {suggestion.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {suggestion.classCode}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Introduction to Programming"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0B2545]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Credits</label>
                  <select
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value={1}>1 Credit</option>
                    <option value={2}>2 Credits</option>
                    <option value={3}>3 Credits</option>
                    <option value={4}>4 Credits</option>
                    <option value={5}>5 Credits</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">College</label>
                  <select
                    value={college}
                    onChange={(e) => setCollege(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="CECS">CECS (Engineering & CS)</option>
                    <option value="CBM">CBM (Business & Mgmt)</option>
                    <option value="CHS">CHS (Health Sciences)</option>
                    <option value="CAS">CAS (Arts & Sciences)</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Color Theme</label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          selectedColor === c ? 'scale-125 border-slate-900' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Time Slots & Classroom Physical Locations */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Time Slots & Physical Classrooms
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Assign weekly recurring meeting times and VinUni campus room
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTimeSlot}
                  className="px-3 py-1.5 text-xs font-bold text-[#0B2545] bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 flex items-center gap-1 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Slot</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {timeSlots.map((slot, index) => (
                  <div
                    key={slot.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Session #{index + 1}
                      </span>
                      {timeSlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTimeSlot(slot.id)}
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Day</label>
                        <select
                          value={slot.day}
                          onChange={(e) => handleUpdateSlot(slot.id, 'day', e.target.value as DayOfWeek)}
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="Mon">Monday</option>
                          <option value="Tue">Tuesday</option>
                          <option value="Wed">Wednesday</option>
                          <option value="Thu">Thursday</option>
                          <option value="Fri">Friday</option>
                          <option value="Sat">Saturday</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Start Time</label>
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => handleUpdateSlot(slot.id, 'startTime', e.target.value)}
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">End Time</label>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => handleUpdateSlot(slot.id, 'endTime', e.target.value)}
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Type</label>
                        <select
                          value={slot.type}
                          onChange={(e) => handleUpdateSlot(slot.id, 'type', e.target.value as ClassType)}
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="Lecture">Lecture</option>
                          <option value="Lab">Lab</option>
                          <option value="Tutorial">Tutorial</option>
                          <option value="Seminar">Seminar</option>
                          <option value="Workshop">Workshop</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Building Location</label>
                        <input
                          type="text"
                          placeholder="e.g. Building I - Academic Complex"
                          value={slot.building}
                          onChange={(e) => handleUpdateSlot(slot.id, 'building', e.target.value)}
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Classroom / Room #</label>
                        <input
                          type="text"
                          placeholder="e.g. Room I201 or Lab B204"
                          value={slot.room}
                          onChange={(e) => handleUpdateSlot(slot.id, 'room', e.target.value)}
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-300 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Instructor Details */}
            <div className="pt-2 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Faculty & Instructor Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Instructor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Nguyen Van A"
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#0B2545]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Faculty Email</label>
                  <input
                    type="email"
                    placeholder="e.g. name@vinuni.edu.vn"
                    value={instructorEmail}
                    onChange={(e) => setInstructorEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#0B2545]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Office Room</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Building, Room 410"
                    value={instructorOffice}
                    onChange={(e) => setInstructorOffice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Office Hours</label>
                  <input
                    type="text"
                    placeholder="e.g. Wednesdays 14:00 - 16:00"
                    value={officeHours}
                    onChange={(e) => setOfficeHours(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Textbook & Syllabus */}
            <div className="pt-2 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Book & Syllabus Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course Textbook Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Introduction to Programming with Python"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Textbook Authors</label>
                  <input
                    type="text"
                    placeholder="e.g. VinUni Faculty Team"
                    value={bookAuthors}
                    onChange={(e) => setBookAuthors(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="mt-3 text-xs">
                <label className="block font-bold text-slate-700 mb-1">Course Syllabus Overview</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of syllabus topics, policies, or grading..."
                  value={syllabusOverview}
                  onChange={(e) => setSyllabusOverview(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#0B2545] hover:bg-[#134074] rounded-xl shadow-xs transition-colors whitespace-nowrap"
              >
                {isEditing ? 'Save Changes' : 'Add Course to Calendar'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
