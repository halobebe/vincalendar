import { Course, TimeSlot, DayOfWeek, ClassType, Deadline, DeadlineType } from '../types';

export interface ParsedScheduleResult {
  courses: Course[];
  warnings: string[];
  totalParsed: number;
}

export interface ParsedCanvasFeedResult {
  courses: Course[];
  deadlines: Deadline[];
  warnings: string[];
  totalEvents: number;
}

// Map day strings to DayOfWeek
const DAY_MAP: Record<string, DayOfWeek> = {
  monday: 'Mon',
  mon: 'Mon',
  t2: 'Mon',
  'thứ hai': 'Mon',
  'thu hai': 'Mon',
  tuesday: 'Tue',
  tue: 'Tue',
  t3: 'Tue',
  'thứ ba': 'Tue',
  'thu ba': 'Tue',
  wednesday: 'Wed',
  wed: 'Wed',
  t4: 'Wed',
  'thứ tư': 'Wed',
  'thu tu': 'Wed',
  thursday: 'Thu',
  thu: 'Thu',
  t5: 'Thu',
  'thứ năm': 'Thu',
  'thu nam': 'Thu',
  friday: 'Fri',
  fri: 'Fri',
  t6: 'Fri',
  'thứ sáu': 'Fri',
  'thu sau': 'Fri',
  saturday: 'Sat',
  sat: 'Sat',
  t7: 'Sat',
  'thứ bảy': 'Sat',
  'thu bay': 'Sat',
  sunday: 'Sun',
  sun: 'Sun',
  cn: 'Sun',
  'chủ nhật': 'Sun',
  'chu nhat': 'Sun',
};

const COLOR_PALETTES = [
  { color: '#0B2545', accentBg: 'bg-blue-50', accentBorder: 'border-blue-200', accentText: 'text-blue-700' },
  { color: '#046A38', accentBg: 'bg-emerald-50', accentBorder: 'border-emerald-200', accentText: 'text-emerald-700' },
  { color: '#7E22CE', accentBg: 'bg-purple-50', accentBorder: 'border-purple-200', accentText: 'text-purple-700' },
  { color: '#C2410C', accentBg: 'bg-amber-50', accentBorder: 'border-amber-200', accentText: 'text-amber-700' },
  { color: '#0E7490', accentBg: 'bg-cyan-50', accentBorder: 'border-cyan-200', accentText: 'text-cyan-700' },
  { color: '#BE185D', accentBg: 'bg-rose-50', accentBorder: 'border-rose-200', accentText: 'text-rose-700' },
];

/**
 * Parses freeform copied text or HTML table copied from https://one.vinuni.edu.vn/student
 */
export function parseTimetableText(rawText: string, defaultCollege: 'CECS' | 'CBM' | 'CHS' | 'CAS' = 'CBM'): ParsedScheduleResult {
  const warnings: string[] = [];
  const coursesMap = new Map<string, Course>();

  // Check if input is JSON
  const trimmed = rawText.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : parsed.courses || parsed.enrolledCourses || [];
      if (Array.isArray(list) && list.length > 0) {
        return parseJsonSchedule(list, defaultCollege);
      }
    } catch {
      // not json, continue to line parsing
    }
  }

  // Check if input is iCal (.ics)
  if (trimmed.includes('BEGIN:VCALENDAR') || trimmed.includes('BEGIN:VEVENT')) {
    return parseIcsCalendar(trimmed, defaultCollege);
  }

  // Line-by-line smart text parsing
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  let currentColorIdx = 0;

  // Pattern to find course codes: e.g. BUSA 2010, ECON 1010, MEDI 1020, COMP 2030, etc.
  const courseCodeRegex = /\b([A-Z]{3,4})\s*(\d{3,4}[A-Z]?)\b/i;
  // Time regex: e.g. 08:30 - 10:00, 8:30-10:00, 08:30 to 10:00
  const timeRangeRegex = /(\d{1,2}:\d{2})\s*(?:-|to|–)\s*(\d{1,2}:\d{2})/i;
  // Room regex: Audi 1, Audi 2, Lab B204, Room 204, B204, M101, C102, FabLab
  const roomRegex = /\b(Audi(?:torium)?\s*\d+|Lab\s*[A-Z0-9]+|Room\s*\d+|[A-D]\d{3}|FabLab(?:\s*M\d+)?|Case\s*Room\s*\d+)\b/i;

  let currentCourse: Partial<Course> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line introduces a course code
    const codeMatch = line.match(courseCodeRegex);
    if (codeMatch) {
      const code = `${codeMatch[1].toUpperCase()} ${codeMatch[2].toUpperCase()}`;

      // Extract title from same line or look ahead
      let courseName = line.replace(codeMatch[0], '').replace(/^[\s:\-–—|]+/, '').trim();
      if (!courseName && i + 1 < lines.length && !lines[i + 1].match(courseCodeRegex) && !lines[i + 1].match(timeRangeRegex)) {
        courseName = lines[i + 1];
      }
      if (!courseName) {
        courseName = getSuggestedCourseName(code);
      }

      const palette = COLOR_PALETTES[currentColorIdx % COLOR_PALETTES.length];
      currentColorIdx++;

      currentCourse = {
        id: `course-${code.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code,
        name: courseName,
        credits: 3,
        college: inferCollegeFromCode(code) || defaultCollege,
        color: palette.color,
        accentBg: palette.accentBg,
        accentBorder: palette.accentBorder,
        accentText: palette.accentText,
        semester: 'Fall Semester 2026',
        timeSlots: [],
        instructor: {
          name: 'Faculty Instructor',
          title: 'Professor',
          email: `${code.toLowerCase().replace(/\s+/g, '')}.faculty@vinuni.edu.vn`,
          office: 'Faculty Building C',
          officeHours: 'Mon, Wed 14:00 - 16:00',
        },
        textbook: {
          title: `${courseName} - Course Materials`,
          authors: 'Course Faculty & Department',
          chapters: [
            { number: 1, title: 'Introduction & Foundations', pages: '1-45', isRead: true },
            { number: 2, title: 'Core Principles & Case Analysis', pages: '46-95', isRead: false },
            { number: 3, title: 'Advanced Applications', pages: '96-160', isRead: false },
          ],
        },
        syllabus: {
          overview: `Comprehensive academic curriculum for ${code}: ${courseName} at VinUniversity.`,
          learningOutcomes: [
            'Master core principles and analytical frameworks',
            'Apply rigorous methodologies to real-world scenarios',
            'Collaborate on interdisciplinary group projects',
          ],
          gradingScale: [
            { item: 'Class Participation & Attendance', percentage: 15 },
            { item: 'Assignments & Case Studies', percentage: 35 },
            { item: 'Midterm Examination', percentage: 20 },
            { item: 'Final Capstone / Examination', percentage: 30 },
          ],
          attendancePolicy: 'Minimum 80% attendance required per VinUniversity academic regulations.',
          academicIntegrity: 'VinUniversity honor code strictly applied to all coursework.',
        },
      };

      coursesMap.set(code, currentCourse as Course);
    }

    // Look for day, time, and room in current line
    const timeMatch = line.match(timeRangeRegex);
    if (timeMatch && currentCourse) {
      const startTime = timeMatch[1].padStart(5, '0');
      const endTime = timeMatch[2].padStart(5, '0');

      // Detect day
      let day: DayOfWeek = 'Mon';
      const lower = line.toLowerCase();
      for (const [key, val] of Object.entries(DAY_MAP)) {
        if (lower.includes(key)) {
          day = val;
          break;
        }
      }

      // Detect room
      const roomMatch = line.match(roomRegex);
      const room = roomMatch ? roomMatch[0] : 'Room 204';
      const building = room.startsWith('Lab') || room.startsWith('B') ? 'Building B' : 'Building A';

      const slot: TimeSlot = {
        id: `slot-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        day,
        startTime,
        endTime,
        type: room.toLowerCase().includes('lab') ? 'Lab' : 'Lecture',
        building,
        room,
      };

      currentCourse.timeSlots = currentCourse.timeSlots || [];
      // avoid duplicate timeslots
      const exists = currentCourse.timeSlots.some(
        (s) => s.day === slot.day && s.startTime === slot.startTime
      );
      if (!exists) {
        currentCourse.timeSlots.push(slot);
      }
    }

    // Also look for instructor email / name
    if (currentCourse && currentCourse.instructor) {
      const emailMatch = line.match(/([a-zA-Z0-9._%+-]+@vinuni\.edu\.vn)/i);
      if (emailMatch) {
        currentCourse.instructor.email = emailMatch[1];
      }
      if (line.toLowerCase().includes('instructor:') || line.toLowerCase().includes('giảng viên:')) {
        const namePart = line.split(/instructor:|giảng viên:/i)[1]?.trim();
        if (namePart) {
          currentCourse.instructor.name = namePart;
        }
      }
    }
  }

  const courses = Array.from(coursesMap.values());
  if (courses.length === 0) {
    warnings.push('No recognized course codes (e.g., BUSA 1010, ECON 1020, MEDI 1010) found in input.');
  }

  return {
    courses,
    warnings,
    totalParsed: courses.length,
  };
}

/**
 * Parses iCalendar (.ics) export
 */
export function parseIcsCalendar(icsContent: string, defaultCollege: 'CECS' | 'CBM' | 'CHS' | 'CAS' = 'CBM'): ParsedScheduleResult {
  const coursesMap = new Map<string, Course>();
  const events = icsContent.split(/BEGIN:VEVENT/i).slice(1);
  let colorIdx = 0;

  for (const ev of events) {
    const summaryMatch = ev.match(/SUMMARY:(.*?)(?:\r?\n|$)/i);
    const locationMatch = ev.match(/LOCATION:(.*?)(?:\r?\n|$)/i);
    const dtstartMatch = ev.match(/DTSTART.*?:(\d{8}T\d{4})/i);
    const dtendMatch = ev.match(/DTEND.*?:(\d{8}T\d{4})/i);
    const rruleMatch = ev.match(/RRULE:.*?BYDAY=([A-Z,]+)/i);

    if (!summaryMatch) continue;
    const summary = summaryMatch[1].trim();

    // Check for code
    const codeMatch = summary.match(/\b([A-Z]{3,4})\s*(\d{3,4}[A-Z]?)\b/i);
    const code = codeMatch ? `${codeMatch[1].toUpperCase()} ${codeMatch[2].toUpperCase()}` : summary.slice(0, 9).trim();
    const courseName = codeMatch ? summary.replace(codeMatch[0], '').replace(/^[\s:\-–—|]+/, '').trim() || getSuggestedCourseName(code) : summary;

    let course = coursesMap.get(code);
    if (!course) {
      const pal = COLOR_PALETTES[colorIdx % COLOR_PALETTES.length];
      colorIdx++;
      course = {
        id: `course-${code.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        code,
        name: courseName,
        credits: 3,
        college: inferCollegeFromCode(code) || defaultCollege,
        color: pal.color,
        accentBg: pal.accentBg,
        accentBorder: pal.accentBorder,
        accentText: pal.accentText,
        semester: 'Fall Semester 2026',
        timeSlots: [],
        instructor: {
          name: 'Faculty Instructor',
          title: 'Professor',
          email: `${code.toLowerCase().replace(/\s+/g, '')}.faculty@vinuni.edu.vn`,
          office: 'Faculty Building C',
          officeHours: 'Mon, Wed 14:00 - 16:00',
        },
        textbook: {
          title: `${courseName} - Course Materials`,
          authors: 'Course Faculty',
          chapters: [{ number: 1, title: 'Introduction', pages: '1-30', isRead: true }],
        },
        syllabus: {
          overview: `Academic syllabus for ${code}`,
          learningOutcomes: ['Understand key core concepts'],
          gradingScale: [{ item: 'Assessments', percentage: 100 }],
          attendancePolicy: 'Standard VinUni attendance policy',
          academicIntegrity: 'VinUni Academic Integrity applies',
        },
      };
      coursesMap.set(code, course);
    }

    // Extract time and day
    if (dtstartMatch && dtendMatch) {
      const st = dtstartMatch[1].split('T')[1];
      const et = dtendMatch[1].split('T')[1];
      const startTime = `${st.slice(0, 2)}:${st.slice(2, 4)}`;
      const endTime = `${et.slice(0, 2)}:${et.slice(2, 4)}`;

      let days: DayOfWeek[] = ['Mon'];
      if (rruleMatch) {
        const bydays = rruleMatch[1].split(',');
        const mapped = bydays.map((b) => {
          const map: Record<string, DayOfWeek> = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };
          return map[b.trim()] || 'Mon';
        });
        if (mapped.length > 0) days = mapped;
      }

      const room = locationMatch ? locationMatch[1].trim() : 'Audi 1';
      for (const d of days) {
        course.timeSlots.push({
          id: `slot-${Date.now()}-${Math.random()}`,
          day: d,
          startTime,
          endTime,
          type: room.toLowerCase().includes('lab') ? 'Lab' : 'Lecture',
          building: 'Building A',
          room,
        });
      }
    }
  }

  const courses = Array.from(coursesMap.values());
  return {
    courses,
    warnings: courses.length === 0 ? ['No events parsed from .ics'] : [],
    totalParsed: courses.length,
  };
}

/**
 * Parses full Canvas LMS iCal (.ics) calendar feed
 * Extracts BOTH recurring class sessions/rooms AND assignment/quiz/exam deadlines!
 */
export function parseCanvasIcsFeed(
  icsContent: string,
  defaultCollege: 'CECS' | 'CBM' | 'CHS' | 'CAS' = 'CBM'
): ParsedCanvasFeedResult {
  const coursesMap = new Map<string, Course>();
  const deadlines: Deadline[] = [];
  const events = icsContent.split(/BEGIN:VEVENT/i).slice(1);
  let colorIdx = 0;

  for (const ev of events) {
    const summaryMatch = ev.match(/SUMMARY:(.*?)(?:\r?\n|$)/i);
    const locationMatch = ev.match(/LOCATION:(.*?)(?:\r?\n|$)/i);
    const descriptionMatch = ev.match(/DESCRIPTION:(.*?)(?:\r?\n(?=[A-Z-]+:)|$)/is);
    const urlMatch = ev.match(/URL:(.*?)(?:\r?\n|$)/i);
    const dtstartMatch = ev.match(/DTSTART.*?:(\d{8})(?:T(\d{4}))?/i);
    const dtendMatch = ev.match(/DTEND.*?:(\d{8})(?:T(\d{4}))?/i);
    const rruleMatch = ev.match(/RRULE:.*?BYDAY=([A-Z,]+)/i);

    if (!summaryMatch) continue;
    const rawSummary = summaryMatch[1].replace(/\\,/g, ',').trim();
    const location = locationMatch ? locationMatch[1].replace(/\\,/g, ',').trim() : '';
    const description = descriptionMatch ? descriptionMatch[1].replace(/\\n/g, ' ').replace(/\\,/g, ',').trim().slice(0, 300) : '';
    const url = urlMatch ? urlMatch[1].trim() : '';

    // Extract Course Code: e.g. [BUSA 2010], (BUSA 2010), BUSA 2010 - ..., or in description
    let courseCode = '';
    const bracketCode = rawSummary.match(/\[([A-Z]{3,4}\s*\d{3,4}[A-Z]?)\]/i) ||
                        rawSummary.match(/\(([A-Z]{3,4}\s*\d{3,4}[A-Z]?)\)/i);
    if (bracketCode) {
      courseCode = bracketCode[1].toUpperCase().replace(/\s+/, ' ');
    } else {
      const codeMatch = rawSummary.match(/\b([A-Z]{3,4})\s*(\d{3,4}[A-Z]?)\b/i);
      if (codeMatch) {
        courseCode = `${codeMatch[1].toUpperCase()} ${codeMatch[2].toUpperCase()}`;
      } else if (description) {
        const descMatch = description.match(/\b([A-Z]{3,4})\s*(\d{3,4}[A-Z]?)\b/i);
        if (descMatch) {
          courseCode = `${descMatch[1].toUpperCase()} ${descMatch[2].toUpperCase()}`;
        }
      }
    }

    if (!courseCode) {
      // Fallback code from summary
      courseCode = rawSummary.split(/[-:–]/)[0].trim().slice(0, 10).toUpperCase() || 'VINUNI 101';
    }

    // Clean title
    let itemTitle = rawSummary
      .replace(/\[[A-Z]{3,4}\s*\d{3,4}[A-Z]?\]/gi, '')
      .replace(/\([A-Z]{3,4}\s*\d{3,4}[A-Z]?\)/gi, '')
      .replace(new RegExp(`^${courseCode}\\s*[-–:]?\\s*`, 'i'), '')
      .trim();
    if (!itemTitle) itemTitle = rawSummary;

    // Ensure Course exists in Map
    let course = coursesMap.get(courseCode);
    if (!course) {
      const pal = COLOR_PALETTES[colorIdx % COLOR_PALETTES.length];
      colorIdx++;
      const courseName = getSuggestedCourseName(courseCode);
      const college = inferCollegeFromCode(courseCode) || defaultCollege;

      course = {
        id: `course-${courseCode.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        code: courseCode,
        name: courseName,
        credits: 3,
        college,
        color: pal.color,
        accentBg: pal.accentBg,
        accentBorder: pal.accentBorder,
        accentText: pal.accentText,
        semester: 'Fall Semester 2026',
        timeSlots: [],
        instructor: {
          name: 'Faculty Lead',
          title: 'Professor',
          email: `${courseCode.toLowerCase().replace(/\s+/g, '')}.faculty@vinuni.edu.vn`,
          office: 'Building C',
          officeHours: 'By appointment',
        },
        textbook: {
          title: `${courseName} Course Materials (Canvas)`,
          authors: 'Course Faculty',
          chapters: [{ number: 1, title: 'Module 1: Orientation', pages: 'Canvas', isRead: true }],
        },
        syllabus: {
          overview: `Official Canvas LMS Curriculum for ${courseCode}: ${courseName}`,
          learningOutcomes: ['Demonstrate mastery of enrolled Canvas coursework'],
          gradingScale: [{ item: 'Canvas Coursework', percentage: 100 }],
          attendancePolicy: 'Standard VinUni attendance policy.',
          academicIntegrity: 'VinUniversity academic integrity rules apply.',
        },
      };
      coursesMap.set(courseCode, course);
    }

    // Determine event classification: Is it a class session OR a deadline?
    const isDeadlineKeyword = /\b(assignment|due|quiz|exam|midterm|final|project|homework|hw|problem set|submission|paper|essay|milestone)\b/i.test(rawSummary) ||
                              /\b(assignment|quiz|submission)\b/i.test(url);

    if (dtstartMatch) {
      const dateStr = dtstartMatch[1]; // YYYYMMDD
      const timeStr = dtstartMatch[2] || '2359'; // HHmm
      const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
      const formattedTime = `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}`;

      if (isDeadlineKeyword) {
        // Classify deadline type
        let dlType: DeadlineType = 'Assignment';
        const lowerSummary = rawSummary.toLowerCase();
        if (lowerSummary.includes('exam') || lowerSummary.includes('midterm') || lowerSummary.includes('final')) {
          dlType = 'Exam';
        } else if (lowerSummary.includes('quiz')) {
          dlType = 'Quiz';
        } else if (lowerSummary.includes('project') || lowerSummary.includes('milestone')) {
          dlType = 'Project';
        } else if (lowerSummary.includes('reading')) {
          dlType = 'Reading';
        }

        // Extract direct Canvas submission link from URL parameter, description, or event body
        let finalUrl = url;
        if (!finalUrl) {
          const directMatch = ev.match(/https?:\/\/[^\s\r\n<>"']+(?:instructure\.com|vinuni\.edu\.vn)[^\s\r\n<>"']*/i);
          if (directMatch) {
            finalUrl = directMatch[0];
          }
        }
        if (!finalUrl) {
          // Construct deep link to VinUni Canvas calendar / assignment
          finalUrl = `https://vinuni.instructure.com/calendar#view_name=month&view_start=${formattedDate}`;
        }

        deadlines.push({
          id: `dl-canvas-${Date.now()}-${deadlines.length + 1}`,
          courseId: course.id,
          title: itemTitle || `${dlType} for ${courseCode}`,
          type: dlType,
          dueDate: formattedDate,
          dueTime: formattedTime,
          weightPercentage: dlType === 'Exam' ? 25 : dlType === 'Project' ? 20 : 10,
          location: location || (dlType === 'Exam' ? 'Auditorium 1' : undefined),
          description: description || `Synced directly from VinUni Canvas LMS (${rawSummary}).`,
          status: 'pending',
          priority: dlType === 'Exam' ? 'high' : 'medium',
          submissionUrl: finalUrl,
          reminderSet: true,
        });
      } else {
        // It is a scheduled class or recurring session
        let endTime = '10:00';
        if (dtendMatch && dtendMatch[2]) {
          const et = dtendMatch[2];
          endTime = `${et.slice(0, 2)}:${et.slice(2, 4)}`;
        }

        // Determine Day of week from date or RRULE
        let day: DayOfWeek = 'Mon';
        if (rruleMatch) {
          const byday = rruleMatch[1].split(',')[0].trim();
          const map: Record<string, DayOfWeek> = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };
          day = map[byday] || 'Mon';
        } else {
          const dt = new Date(`${formattedDate}T12:00:00Z`);
          const daysArr: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          day = daysArr[dt.getUTCDay()] || 'Mon';
        }

        const room = location || 'Building A, Room 204';
        const type: ClassType = room.toLowerCase().includes('lab') ? 'Lab' : room.toLowerCase().includes('case') ? 'Workshop' : 'Lecture';

        // Avoid duplicate timeslots on the same day/time
        const exists = course.timeSlots.some((s) => s.day === day && s.startTime === formattedTime);
        if (!exists) {
          course.timeSlots.push({
            id: `slot-canvas-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            day,
            startTime: formattedTime,
            endTime,
            type,
            building: room.includes('Audi') ? 'Main Building' : 'Building A',
            room,
          });
        }
      }
    }
  }

  // Ensure each parsed course has at least one scheduled slot on the weekly timetable grid
  // In case Canvas LMS only had assignments / quizzes and didn't include recurring lecture events
  const defaultSlotPatterns: { day1: DayOfWeek; day2: DayOfWeek; startTime: string; endTime: string; room: string }[] = [
    { day1: 'Mon', day2: 'Thu', startTime: '10:15', endTime: '11:45', room: 'Case Study Room 1' },
    { day1: 'Tue', day2: 'Fri', startTime: '08:30', endTime: '10:00', room: 'Auditorium 1' },
    { day1: 'Wed', day2: 'Sat', startTime: '08:30', endTime: '11:45', room: 'Case Study Room 2' },
    { day1: 'Tue', day2: 'Fri', startTime: '13:30', endTime: '15:00', room: 'Building A, Room 201' },
    { day1: 'Mon', day2: 'Wed', startTime: '15:15', endTime: '16:45', room: 'MakerSpace M102' },
  ];

  let patternIdx = 0;
  for (const course of coursesMap.values()) {
    if (course.timeSlots.length === 0) {
      const pattern = defaultSlotPatterns[patternIdx % defaultSlotPatterns.length];
      patternIdx++;

      course.timeSlots.push({
        id: `slot-${course.code.toLowerCase()}-1`,
        day: pattern.day1,
        startTime: pattern.startTime,
        endTime: pattern.endTime,
        type: pattern.room.includes('Case') ? 'Workshop' : 'Lecture',
        building: pattern.room.includes('Audi') ? 'Main Academic Building' : 'Building A',
        room: pattern.room,
      });

      course.timeSlots.push({
        id: `slot-${course.code.toLowerCase()}-2`,
        day: pattern.day2,
        startTime: pattern.startTime,
        endTime: pattern.endTime,
        type: pattern.room.includes('Case') ? 'Workshop' : 'Lecture',
        building: pattern.room.includes('Audi') ? 'Main Academic Building' : 'Building A',
        room: pattern.room,
      });
    }
  }

  const courses = Array.from(coursesMap.values());
  return {
    courses,
    deadlines,
    warnings: courses.length === 0 ? ['No course items detected in Canvas feed'] : [],
    totalEvents: events.length,
  };
}

function parseJsonSchedule(list: any[], defaultCollege: 'CECS' | 'CBM' | 'CHS' | 'CAS'): ParsedScheduleResult {
  const courses: Course[] = [];
  let colorIdx = 0;

  for (const item of list) {
    if (typeof item === 'string') {
      const codeMatch = item.match(/\b([A-Z]{3,4})\s*(\d{3,4}[A-Z]?)\b/i);
      const code = codeMatch ? `${codeMatch[1].toUpperCase()} ${codeMatch[2].toUpperCase()}` : item;
      const name = getSuggestedCourseName(code) || item;
      const pal = COLOR_PALETTES[colorIdx % COLOR_PALETTES.length];
      colorIdx++;

      courses.push({
        id: `course-${code.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        code,
        name,
        credits: 3,
        college: inferCollegeFromCode(code) || defaultCollege,
        color: pal.color,
        accentBg: pal.accentBg,
        accentBorder: pal.accentBorder,
        accentText: pal.accentText,
        semester: 'Fall Semester 2026',
        timeSlots: [
          {
            id: `slot-${Date.now()}`,
            day: 'Mon',
            startTime: '08:30',
            endTime: '10:00',
            type: 'Lecture',
            building: 'Building A',
            room: 'Room 204',
          },
        ],
        instructor: {
          name: 'Course Professor',
          title: 'Faculty Lead',
          email: `${code.toLowerCase().replace(/\s+/g, '')}.faculty@vinuni.edu.vn`,
          office: 'Building C',
          officeHours: 'By appointment',
        },
        textbook: {
          title: `${name} Official Materials`,
          authors: 'VinUniversity Faculty',
          chapters: [{ number: 1, title: 'Module 1', pages: '1-50', isRead: false }],
        },
        syllabus: {
          overview: `Syllabus for ${name}`,
          learningOutcomes: ['Complete coursework assignments'],
          gradingScale: [{ item: 'Coursework', percentage: 100 }],
          attendancePolicy: 'Standard policy',
          academicIntegrity: 'Standard integrity',
        },
      });
    } else if (typeof item === 'object' && item !== null) {
      const code = item.code || item.courseCode || 'COURSE 101';
      const name = item.name || item.courseName || item.title || getSuggestedCourseName(code);
      const pal = COLOR_PALETTES[colorIdx % COLOR_PALETTES.length];
      colorIdx++;

      courses.push({
        id: item.id || `course-${code.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        code,
        name,
        credits: item.credits || 3,
        college: item.college || inferCollegeFromCode(code) || defaultCollege,
        color: item.color || pal.color,
        accentBg: item.accentBg || pal.accentBg,
        accentBorder: item.accentBorder || pal.accentBorder,
        accentText: item.accentText || pal.accentText,
        semester: item.semester || 'Fall Semester 2026',
        timeSlots: item.timeSlots || [
          {
            id: `slot-${Date.now()}`,
            day: 'Tue',
            startTime: '08:30',
            endTime: '10:00',
            type: 'Lecture',
            building: 'Building A',
            room: 'Audi 1',
          },
        ],
        instructor: item.instructor || {
          name: 'Course Instructor',
          title: 'Professor',
          email: 'faculty@vinuni.edu.vn',
          office: 'Building C',
          officeHours: 'Tue, Thu 14:00 - 16:00',
        },
        textbook: item.textbook || {
          title: `${name} Guide`,
          authors: 'Department Faculty',
          chapters: [],
        },
        syllabus: item.syllabus || {
          overview: `${name} overview`,
          learningOutcomes: [],
          gradingScale: [],
          attendancePolicy: 'Standard',
          academicIntegrity: 'Standard',
        },
      });
    }
  }

  return {
    courses,
    warnings: [],
    totalParsed: courses.length,
  };
}

export function inferCollegeFromCode(code: string): 'CECS' | 'CBM' | 'CHS' | 'CAS' | null {
  const upper = code.toUpperCase();
  if (upper.startsWith('COMP') || upper.startsWith('ENGR') || upper.startsWith('MECH') || upper.startsWith('ELEC')) {
    return 'CECS';
  }
  if (
    upper.startsWith('BUSA') ||
    upper.startsWith('ECON') ||
    upper.startsWith('FINC') ||
    upper.startsWith('MKTG') ||
    upper.startsWith('ACCT') ||
    upper.startsWith('MGMT') ||
    upper.startsWith('HOSP')
  ) {
    return 'CBM';
  }
  if (
    upper.startsWith('MEDI') ||
    upper.startsWith('NURS') ||
    upper.startsWith('ANAT') ||
    upper.startsWith('BIOL') ||
    upper.startsWith('PHAR') ||
    upper.startsWith('PHYS')
  ) {
    return 'CHS';
  }
  if (
    upper.startsWith('COMM') ||
    upper.startsWith('PHIL') ||
    upper.startsWith('ENGL') ||
    upper.startsWith('PSYC') ||
    upper.startsWith('MATH') ||
    upper.startsWith('STAT')
  ) {
    return 'CAS';
  }
  return null;
}

export function getSuggestedCourseName(code: string): string {
  const map: Record<string, string> = {
    // CBM
    'BUSA 1010': 'Introduction to Business Administration',
    'BUSA 2010': 'Technology Entrepreneurship & Innovation',
    'ECON 1010': 'Principles of Microeconomics',
    'ECON 1020': 'Principles of Macroeconomics',
    'ACCT 1010': 'Financial Accounting & Reporting',
    'ACCT 2010': 'Managerial Accounting',
    'FINC 2010': 'Corporate Finance & Valuation',
    'MKTG 2010': 'Principles of Marketing',
    'MGMT 3010': 'Strategic Management & Leadership',
    'HOSP 1010': 'Introduction to Hospitality Management',
    // CHS
    'MEDI 1010': 'Human Anatomy & Histology I',
    'MEDI 1020': 'Medical Physiology & Biophysics',
    'MEDI 2010': 'General Pathology & Pathophysiology',
    'BIOL 1010': 'Molecular & Cellular Biology',
    'NURS 1010': 'Foundations of Professional Nursing',
    'NURS 2010': 'Health Assessment & Clinical Skills',
    // CAS
    'MATH 1010': 'Multivariable Calculus & Differential Equations',
    'STAT 1010': 'Probability and Statistics for Decision Making',
    'COMM 1010': 'Academic & Intercultural Communication',
    'PHIL 1010': 'Critical Thinking and Ethics',
    // CECS
    'COMP 1010': 'Introduction to Programming (Python)',
    'COMP 2030': 'Data Structures and Algorithms',
    'COMP 3010': 'Operating Systems & System Programming',
    'ENGR 1020': 'Engineering Design and Prototyping',
  };
  return map[code.toUpperCase()] || `${code} Course`;
}

// 1-Click extraction script to run in browser on one.vinuni.edu.vn/student
export const VINUNI_PORTAL_EXTRACTION_SCRIPT = `(function() {
  try {
    const courses = [];
    // Search common table cells or cards on one.vinuni.edu.vn
    const elements = document.querySelectorAll('tr, .course-card, .schedule-item, div[class*="timetable"], div[class*="schedule"]');
    const courseRegex = /\\b([A-Z]{3,4})\\s*(\\d{3,4}[A-Z]?)\\b/i;
    const timeRegex = /(\\d{1,2}:\\d{2})\\s*[-–to]\\s*(\\d{1,2}:\\d{2})/i;
    
    document.querySelectorAll('tr, .schedule-item, div[class*="course"]').forEach(el => {
      const text = el.innerText || el.textContent || '';
      const cMatch = text.match(courseRegex);
      if (cMatch) {
        const code = cMatch[0].toUpperCase();
        const tMatch = text.match(timeRegex);
        courses.push({
          code: code,
          rawText: text.replace(/\\s+/g, ' ').trim().slice(0, 150)
        });
      }
    });

    const payload = {
      portal: window.location.href,
      extractedAt: new Date().toISOString(),
      studentEmail: '26an.ntt@vinuni.edu.vn',
      pageTitle: document.title,
      rawPageText: document.body.innerText.slice(0, 10000),
      detectedCourses: courses
    };

    const json = JSON.stringify(payload, null, 2);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json).then(() => {
        alert("VinUni Schedule Extracted! Copied to clipboard. Now paste it into your VinUni Course Planner!");
      });
    } else {
      console.log(json);
      alert("VinUni Schedule Extracted! Check browser console or copy text.");
    }
  } catch(err) {
    alert("Extraction error: " + err.message);
  }
})();`;
