import { CanvasDeadlineItem } from '../types';

/**
 * Canvas iCal Parsing & Utility Helpers
 */

export interface ParsedFeedResponse {
  success: boolean;
  message?: string;
  source: 'live' | 'demo' | 'cache' | 'local';
  feedUrl: string;
  totalParsed: number;
  upcomingCount: number;
  pastCount: number;
  deadlines: CanvasDeadlineItem[];
  rawIcs?: string;
  rawIcsLength?: number;
  error?: string;
}

/**
 * Clean course title and extract course name/code from Canvas summary
 * Format examples:
 * - "Homework 3: Trees [COMP 2030 - Data Structures]"
 * - "Quiz 2: Memory Management (COMP2030)"
 * - "Final Exam: CECS 1011"
 */
export function extractCourseAndTitle(
  rawSummary: string,
  categories?: string[] | string
): { title: string; courseName: string; courseCode: string } {
  let summary = (rawSummary || 'Untitled Canvas Assignment').trim();
  let courseName = '';
  let courseCode = '';

  // 1. Check for brackets e.g. [COMP 2030 - Data Structures]
  const bracketMatch = summary.match(/\[(.*?)\]/);
  if (bracketMatch) {
    courseName = bracketMatch[1].trim();
    summary = summary.replace(/\[(.*?)\]/, '').trim();
  }

  // 2. Check for parentheses e.g. (COMP 2030) if no bracket
  if (!courseName) {
    const parenMatch = summary.match(/\((.*?)\)/);
    if (parenMatch && /[A-Z]{2,4}\s*\d{2,4}/i.test(parenMatch[1])) {
      courseName = parenMatch[1].trim();
      summary = summary.replace(/\((.*?)\)/, '').trim();
    }
  }

  // 3. Fallback to categories array/string if present
  if (!courseName && categories) {
    if (Array.isArray(categories)) {
      courseName = categories.join(', ').trim();
    } else if (typeof categories === 'string') {
      courseName = categories.trim();
    }
  }

  // Extract a 2-4 letter + 3-4 digit course code (e.g. COMP 2030, MATH 1010, CECS 1011)
  const codeMatch = (courseName || summary).match(/\b([A-Z]{2,4})\s*(\d{3,4}[A-Z]?)\b/i);
  if (codeMatch) {
    courseCode = `${codeMatch[1].toUpperCase()} ${codeMatch[2].toUpperCase()}`;
  } else if (courseName) {
    courseCode = courseName.split(/[-:]/)[0].trim().slice(0, 10).toUpperCase();
  } else {
    courseCode = 'CANVAS';
  }

  if (!courseName) {
    courseName = courseCode !== 'CANVAS' ? courseCode : 'Canvas Course';
  }

  // Clean trailing punctuation or separators from title
  summary = summary.replace(/^[-–:]\s*/, '').replace(/\s*[-–:]$/, '').trim();

  return {
    title: summary || 'Canvas Assignment',
    courseName,
    courseCode,
  };
}

/**
 * Classify event into Assignment, Quiz, Exam, Project, Discussion, or Reading
 */
export function classifyDeadlineType(
  title: string,
  url?: string,
  description?: string
): CanvasDeadlineItem['type'] {
  const text = `${title} ${url || ''} ${description || ''}`.toLowerCase();

  if (text.includes('exam') || text.includes('midterm') || text.includes('final') || text.includes('test')) {
    return 'Exam';
  }
  if (text.includes('quiz') || text.includes('check-in') || text.includes('assessment')) {
    return 'Quiz';
  }
  if (text.includes('project') || text.includes('milestone') || text.includes('capstone') || text.includes('presentation')) {
    return 'Project';
  }
  if (text.includes('discussion') || text.includes('forum') || text.includes('thread')) {
    return 'Discussion';
  }
  if (text.includes('reading') || text.includes('textbook') || text.includes('prep')) {
    return 'Reading';
  }
  return 'Assignment';
}

/**
 * Client-side raw ICS parser fallback (useful for offline / pasted ICS content)
 */
export function parseClientIcs(rawIcs: string, includePast = false): CanvasDeadlineItem[] {
  const lines = rawIcs.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const unfolded: string[] = [];

  // Unfold lines starting with space or tab
  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }

  const events: CanvasDeadlineItem[] = [];
  let inEvent = false;
  let currentEvent: Record<string, string> = {};

  for (const line of unfolded) {
    const trimmed = line.trim();
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
    } else if (trimmed === 'END:VEVENT') {
      inEvent = false;
      if (currentEvent.DTSTART || currentEvent.DUE || currentEvent.DTEND) {
        const item = formatRawIcsEvent(currentEvent);
        if (item) events.push(item);
      }
    } else if (inEvent) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const fullKey = trimmed.slice(0, colonIndex);
        const value = trimmed.slice(colonIndex + 1);
        const key = fullKey.split(';')[0].toUpperCase();
        currentEvent[key] = value;
      }
    }
  }

  return sortAndFilterDeadlines(events, { includePast });
}

function formatRawIcsEvent(evt: Record<string, string>): CanvasDeadlineItem | null {
  const rawDateStr = evt.DTSTART || evt.DUE || evt.DTEND;
  if (!rawDateStr) return null;

  // Format 20261025T165900Z or 20261025
  let year = 2026;
  let month = 1;
  let day = 1;
  let hour = 23;
  let min = 59;
  let isUtc = rawDateStr.endsWith('Z');

  const matchDateTime = rawDateStr.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
  if (!matchDateTime) return null;

  year = parseInt(matchDateTime[1], 10);
  month = parseInt(matchDateTime[2], 10);
  day = parseInt(matchDateTime[3], 10);
  if (matchDateTime[4] && matchDateTime[5]) {
    hour = parseInt(matchDateTime[4], 10);
    min = parseInt(matchDateTime[5], 10);
  }

  let dt: Date;
  if (isUtc) {
    dt = new Date(Date.UTC(year, month - 1, day, hour, min));
  } else {
    dt = new Date(year, month - 1, day, hour, min);
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const dueDate = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const dueTime = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  const dueDateTime = dt.toISOString();

  const now = new Date();
  const isPast = dt.getTime() < now.getTime();

  const { title, courseName, courseCode } = extractCourseAndTitle(
    evt.SUMMARY || 'Canvas Assignment',
    evt.CATEGORIES
  );

  const type = classifyDeadlineType(title, evt.URL, evt.DESCRIPTION);

  return {
    id: evt.UID || `dl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    uid: evt.UID || `uid-${Date.now()}`,
    title,
    courseName,
    courseCode,
    dueDate,
    dueTime,
    dueDateTime,
    type,
    url: evt.URL,
    location: evt.LOCATION,
    description: evt.DESCRIPTION ? evt.DESCRIPTION.replace(/\\n/g, '\n').replace(/\\,/g, ',') : undefined,
    completed: false,
    priority: type === 'Exam' ? 'high' : type === 'Project' ? 'medium' : 'low',
    isPast,
  };
}

/**
 * Filter out past deadlines & sort chronologically from soonest to latest
 */
export function sortAndFilterDeadlines(
  items: CanvasDeadlineItem[],
  options: {
    includePast?: boolean;
    courseFilter?: string;
    typeFilter?: string;
    searchQuery?: string;
  } = {}
): CanvasDeadlineItem[] {
  const { includePast = false, courseFilter = 'ALL', typeFilter = 'ALL', searchQuery = '' } = options;
  const now = new Date().getTime();

  return items
    .filter((item) => {
      // Past filter
      const itemTime = new Date(item.dueDateTime).getTime();
      if (!includePast && itemTime < now) {
        return false;
      }

      // Course filter
      if (courseFilter !== 'ALL' && item.courseCode !== courseFilter && item.courseName !== courseFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'ALL' && item.type.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchCourse =
          item.courseName.toLowerCase().includes(q) || item.courseCode.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchCourse && !matchDesc) return false;
      }

      return true;
    })
    .sort((a, b) => new Date(a.dueDateTime).getTime() - new Date(b.dueDateTime).getTime());
}

/**
 * Relative time calculation for human readability
 */
export function getRelativeDeadlineTime(dueDateTime: string): {
  text: string;
  urgency: 'overdue' | 'urgent' | 'warning' | 'normal';
  hoursRemaining: number;
} {
  const target = new Date(dueDateTime).getTime();
  const now = new Date().getTime();
  const diffMs = target - now;
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const pastDays = Math.abs(diffDays);
    return {
      text: pastDays === 0 ? 'Overdue today' : `${pastDays}d overdue`,
      urgency: 'overdue',
      hoursRemaining: diffHours,
    };
  }

  if (diffHours < 12) {
    return {
      text: diffHours <= 1 ? 'Due in <1 hr!' : `Due in ${diffHours} hrs!`,
      urgency: 'urgent',
      hoursRemaining: diffHours,
    };
  }

  if (diffDays === 1) {
    return {
      text: 'Due tomorrow',
      urgency: 'urgent',
      hoursRemaining: diffHours,
    };
  }

  if (diffDays <= 3) {
    return {
      text: `Due in ${diffDays} days`,
      urgency: 'warning',
      hoursRemaining: diffHours,
    };
  }

  if (diffDays <= 7) {
    return {
      text: `Due in ${diffDays} days`,
      urgency: 'normal',
      hoursRemaining: diffHours,
    };
  }

  return {
    text: `Due in ${Math.round(diffDays / 7)} wks`,
    urgency: 'normal',
    hoursRemaining: diffHours,
  };
}

/**
 * Proxy fetch helper to invoke our backend route /api/canvas/ical-feed
 * If running on a static host like GitHub Pages where /api/canvas/ical-feed returns 404,
 * gracefully falls back to client-side parsing and public CORS proxies.
 */
export async function fetchCanvasIcalFeed(
  feedUrl: string,
  includePast = false
): Promise<ParsedFeedResponse> {
  const cleanUrl = feedUrl.trim();

  // Try backend proxy endpoint first
  try {
    const response = await fetch('/api/canvas/ical-feed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        feedUrl: cleanUrl,
        includePast,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return data as ParsedFeedResponse;
      }
    }
  } catch (proxyErr) {
    console.info('Backend proxy not reachable, switching to static client-side fallback:', proxyErr);
  }

  // --- Static Fallback for GitHub Pages & static hosts ---
  // 1. Demo Mode
  if (cleanUrl.toLowerCase() === 'demo' || cleanUrl.includes('demo-canvas-feed')) {
    const now = new Date();
    const formatOffset = (days: number, h: number, m: number) => {
      const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      d.setHours(h, m, 0, 0);
      return d;
    };

    const demoItems: CanvasDeadlineItem[] = [
      {
        id: 'dl-demo-pa2',
        uid: 'uid-demo-pa2',
        title: 'Programming Assignment 2: Balanced Binary Trees',
        courseName: 'COMP 2030 - Data Structures',
        courseCode: 'COMP 2030',
        dueDate: formatOffset(2, 23, 59).toISOString().split('T')[0],
        dueTime: '23:59',
        dueDateTime: formatOffset(2, 23, 59).toISOString(),
        type: 'Assignment',
        url: 'https://vinuni.instructure.com/courses/comp2030/assignments/4012',
        location: 'Canvas Submission',
        description: 'Implement AVL Tree insertion, rotations, and subtree size tracking in C++. Submit your zip archive on Canvas.',
        completed: false,
        priority: 'medium',
        isPast: false,
      },
      {
        id: 'dl-demo-ps4',
        uid: 'uid-demo-ps4',
        title: 'Problem Set 4: Multivariable Integrals & Greens Theorem',
        courseName: 'MATH 1010 - Calculus',
        courseCode: 'MATH 1010',
        dueDate: formatOffset(4, 17, 0).toISOString().split('T')[0],
        dueTime: '17:00',
        dueDateTime: formatOffset(4, 17, 0).toISOString(),
        type: 'Assignment',
        url: 'https://vinuni.instructure.com/courses/math1010/assignments/2984',
        location: 'Canvas Submission',
        description: 'Solve problems 1-12 from Chapter 14. Scan handwritten working as high-resolution PDF.',
        completed: false,
        priority: 'medium',
        isPast: false,
      },
      {
        id: 'dl-demo-cecs',
        uid: 'uid-demo-cecs',
        title: 'Engineering Lab Milestone 1: Sensor Calibration Report',
        courseName: 'CECS 1011',
        courseCode: 'CECS 1011',
        dueDate: formatOffset(6, 23, 59).toISOString().split('T')[0],
        dueTime: '23:59',
        dueDateTime: formatOffset(6, 23, 59).toISOString(),
        type: 'Project',
        url: 'https://vinuni.instructure.com/courses/cecs1011/assignments/1109',
        location: 'MakerSpace Lab M102 / Canvas',
        description: 'Submit your team lab report on thermal sensor calibration and Arduino telemetry data graphs.',
        completed: false,
        priority: 'medium',
        isPast: false,
      },
      {
        id: 'dl-demo-quiz3',
        uid: 'uid-demo-quiz3',
        title: 'Online Quiz 3: Heap Sort & Priority Queues',
        courseName: 'COMP 2030',
        courseCode: 'COMP 2030',
        dueDate: formatOffset(8, 14, 0).toISOString().split('T')[0],
        dueTime: '14:00',
        dueDateTime: formatOffset(8, 14, 0).toISOString(),
        type: 'Quiz',
        url: 'https://vinuni.instructure.com/courses/comp2030/quizzes/8821',
        location: 'Canvas Lockdown Browser',
        description: '30-minute timed quiz covering binary min-heaps, Floyds heapify algorithm, and priority queues.',
        completed: false,
        priority: 'low',
        isPast: false,
      },
      {
        id: 'dl-demo-midterm',
        uid: 'uid-demo-midterm',
        title: 'Midterm Examination',
        courseName: 'COMP 2030 - Data Structures',
        courseCode: 'COMP 2030',
        dueDate: formatOffset(15, 9, 0).toISOString().split('T')[0],
        dueTime: '09:00',
        dueDateTime: formatOffset(15, 9, 0).toISOString(),
        type: 'Exam',
        url: 'https://vinuni.instructure.com/calendar?event_id=midterm-comp2030',
        location: 'Main Campus Auditorium 1',
        description: 'In-person written midterm exam. Bring student ID card, 2B pencils, and approved non-programmable calculator.',
        completed: false,
        priority: 'high',
        isPast: false,
      },
    ];

    return {
      success: true,
      source: 'demo',
      feedUrl: 'demo',
      message: `Loaded ${demoItems.length} verified demo deadlines.`,
      totalParsed: demoItems.length,
      upcomingCount: demoItems.length,
      pastCount: 0,
      deadlines: demoItems,
    };
  }

  // 2. Direct Raw ICS String
  if (cleanUrl.startsWith('BEGIN:VCALENDAR') || cleanUrl.includes('BEGIN:VEVENT')) {
    const parsed = parseClientIcs(cleanUrl, includePast);
    return {
      success: true,
      source: 'local',
      feedUrl: 'raw-ics-text',
      totalParsed: parsed.length,
      upcomingCount: parsed.filter((d) => !d.isPast).length,
      pastCount: parsed.filter((d) => d.isPast).length,
      deadlines: parsed,
      rawIcs: cleanUrl,
    };
  }

  // 3. Remote URL on static host: Fetch via public CORS proxy
  let targetUrl = cleanUrl;
  if (targetUrl.startsWith('webcal://')) {
    targetUrl = 'https://' + targetUrl.slice('webcal://'.length);
  }

  const corsProxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
  ];

  let rawText = '';
  for (const proxyUrl of corsProxies) {
    try {
      const res = await fetch(proxyUrl);
      if (res.ok) {
        rawText = await res.text();
        if (rawText.includes('BEGIN:VCALENDAR') || rawText.includes('BEGIN:VEVENT')) {
          break;
        }
      }
    } catch {}
  }

  if (!rawText) {
    throw new Error(
      'Could not reach the Canvas iCal feed directly due to cross-origin restrictions. Please check the URL or paste the raw .ics text.'
    );
  }

  const parsed = parseClientIcs(rawText, includePast);
  return {
    success: true,
    source: 'live',
    feedUrl: cleanUrl,
    totalParsed: parsed.length,
    upcomingCount: parsed.filter((d) => !d.isPast).length,
    pastCount: parsed.filter((d) => d.isPast).length,
    deadlines: parsed,
    rawIcsLength: rawText.length,
  };
}
