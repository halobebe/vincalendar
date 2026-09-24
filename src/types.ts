export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type ClassType = 'Lecture' | 'Lab' | 'Tutorial' | 'Seminar' | 'Workshop';

export interface TimeSlot {
  id: string;
  day: DayOfWeek;
  startTime: string; // e.g. "08:30"
  endTime: string;   // e.g. "10:00"
  type: ClassType;
  building: string;  // e.g. "Building B", "Main Building", "Library"
  room: string;      // e.g. "Lab B204", "Audi 2", "A302"
  instructor?: string;
}

export interface Instructor {
  name: string;
  title: string;
  email: string;
  office: string;
  officeHours: string;
  avatarUrl?: string;
}

export interface TextbookChapter {
  number: number;
  title: string;
  pages: string;
  isRead: boolean;
}

export interface CourseTextbook {
  title: string;
  authors: string;
  edition?: string;
  isbn?: string;
  coverUrl?: string;
  onlineUrl?: string;
  chapters: TextbookChapter[];
}

export interface GradeItem {
  item: string;
  percentage: number;
}

export interface CourseSyllabus {
  overview: string;
  learningOutcomes: string[];
  gradingScale: GradeItem[];
  attendancePolicy: string;
  academicIntegrity?: string;
  downloadUrl?: string;
}

export interface Course {
  id: string;
  code: string;        // e.g. "COMP 2030"
  name: string;        // e.g. "Data Structures and Algorithms"
  credits: number;     // e.g. 4
  college: 'CECS' | 'CBM' | 'CHS' | 'CAS';
  color: string;       // Hex code e.g. "#1E40AF"
  accentBg: string;    // Light bg class
  accentBorder: string;// Border class
  accentText: string;  // Text color class
  semester: string;    // e.g. "Fall 2026"
  timeSlots: TimeSlot[];
  instructor: Instructor;
  textbook: CourseTextbook;
  syllabus: CourseSyllabus;
  teamsChannelUrl?: string;
}

export type DeadlineType = 'Assignment' | 'Exam' | 'Quiz' | 'Project' | 'Reading';
export type DeadlineStatus = 'pending' | 'in_progress' | 'completed';
export type PriorityLevel = 'high' | 'medium' | 'low';

export interface Deadline {
  id: string;
  courseId: string;
  title: string;
  type: DeadlineType;
  dueDate: string;     // YYYY-MM-DD
  dueTime: string;     // HH:mm
  weightPercentage?: number;
  location?: string;   // For exams e.g. "Main Audi 1"
  description?: string;
  status: DeadlineStatus;
  priority: PriorityLevel;
  submissionUrl?: string;
  reminderSet: boolean;
  teamsSyncId?: string;
  outlookSyncId?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'deadline' | 'exam' | 'class_reminder' | 'sync' | 'teams';
  read: boolean;
  courseCode?: string;
  deadlineId?: string;
}

export interface VinUniSyncState {
  connected: boolean;
  portalUrl: string; // "https://one.vinuni.edu.vn/"
  studentId: string;
  studentName: string;
  email: string;
  college: string;
  program: string;
  cohort: string;
  gpa: number;
  creditsCompleted: number;
  creditsTotal: number;
  overallAttendance: number;
  lastSyncedAt: string | null;
  semester: string;
  isSyncing: boolean;
  tokenExpiresAt?: string;
}

export interface OneVinUniAttendanceRecord {
  id: string;
  courseCode: string;
  courseName: string;
  attended: number;
  total: number;
  percentage: number;
  status: 'excellent' | 'warning' | 'critical';
  lastCheckInTime?: string;
  todaySession?: {
    time: string;
    room: string;
    checkedIn: boolean;
  };
}

export interface OneVinUniExamSeat {
  id: string;
  courseCode: string;
  courseName: string;
  examType: 'Midterm Examination' | 'Final Examination';
  date: string;
  time: string;
  room: string;
  building: string;
  seatNumber: string;
  proctor: string;
  allowedItems: string[];
}

export interface OneVinUniPortalService {
  id: string;
  title: string;
  category: 'Academics' | 'Campus Life' | 'Productivity' | 'Administration';
  description: string;
  url: string;
  icon: string;
  badge?: string;
}

export interface MicrosoftSyncState {
  teamsConnected: boolean;
  outlookConnected: boolean;
  accountEmail: string | null;
  autoRemindersEnabled: boolean;
  lastSyncedAt: string | null;
  webhookActive: boolean;
}

export type WidgetSize = 'small' | 'medium' | 'large' | 'lockscreen';
export type WidgetTheme = 'vinuni_navy' | 'midnight_glass' | 'clean_minimal' | 'paper_white';

export interface WidgetConfig {
  size: WidgetSize;
  theme: WidgetTheme;
  showDeadlines: boolean;
  showNextClassCountdown: boolean;
  showTaskChecklist: boolean;
}

export interface CanvasDeadlineItem {
  id: string;
  uid: string;
  title: string;
  courseName: string;
  courseCode: string;
  dueDate: string;
  dueTime: string;
  dueDateTime: string;
  type: 'Assignment' | 'Quiz' | 'Exam' | 'Project' | 'Discussion' | 'Reading' | 'Other';
  url?: string;
  location?: string;
  description?: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  isPast?: boolean;
}

export type CalendarViewMode = 'week' | 'month' | 'day' | 'deadlines' | 'canvas' | 'widgets';
