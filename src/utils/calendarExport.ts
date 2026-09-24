import { Course, Deadline } from '../types';

/**
 * Generates an RFC 5545 iCalendar (.ics) format string.
 * This can be directly imported into Microsoft Outlook, Teams, Apple Calendar, or Google Calendar.
 */
export function generateICalendarData(courses: Course[], deadlines: Deadline[]): string {
  const now = new Date();
  const formatICSDate = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VinUni College Course Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:VinUni Academic Schedule',
    'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
  ];

  // Map days to iCal RRULE days
  const dayMap: Record<string, string> = {
    Mon: 'MO',
    Tue: 'TU',
    Wed: 'WE',
    Thu: 'TH',
    Fri: 'FR',
    Sat: 'SA',
    Sun: 'SU',
  };

  // Add recurring course time slots
  courses.forEach((course) => {
    course.timeSlots.forEach((slot) => {
      // Find the next occurrence of this day of week
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const targetDayIndex = days.indexOf(slot.day);
      const currentDayIndex = now.getDay();
      let diff = targetDayIndex - currentDayIndex;
      if (diff < 0) diff += 7;

      const eventDate = new Date(now);
      eventDate.setDate(now.getDate() + diff);

      const [startH, startM] = slot.startTime.split(':').map(Number);
      const [endH, endM] = slot.endTime.split(':').map(Number);

      const startDate = new Date(eventDate);
      startDate.setHours(startH, startM, 0, 0);

      const endDate = new Date(eventDate);
      endDate.setHours(endH, endM, 0, 0);

      const rruleDay = dayMap[slot.day] || 'MO';

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:course-${course.id}-${slot.id}@vinuni.edu.vn`);
      lines.push(`DTSTAMP:${formatICSDate(now)}`);
      lines.push(`DTSTART:${formatICSDate(startDate)}`);
      lines.push(`DTEND:${formatICSDate(endDate)}`);
      lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${rruleDay};COUNT=16`);
      lines.push(`SUMMARY:${course.code}: ${course.name} (${slot.type})`);
      lines.push(`LOCATION:VinUniversity Ocean Park, ${slot.building} - ${slot.room}`);
      lines.push(
        `DESCRIPTION:Instructor: ${course.instructor.name} (${course.instructor.email})\\nCredits: ${course.credits}\\nOffice: ${course.instructor.office}`
      );
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    });
  });

  // Add Deadlines and Exams
  deadlines.forEach((deadline) => {
    const [year, month, day] = deadline.dueDate.split('-').map(Number);
    const [hours, mins] = deadline.dueTime.split(':').map(Number);

    const dueDate = new Date(year, month - 1, day, hours, mins, 0);
    const startDate = new Date(dueDate.getTime() - 60 * 60 * 1000); // 1 hour duration or exam start

    const course = courses.find((c) => c.id === deadline.courseId);
    const courseCode = course ? course.code : 'COURSE';

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:deadline-${deadline.id}@vinuni.edu.vn`);
    lines.push(`DTSTAMP:${formatICSDate(now)}`);
    lines.push(`DTSTART:${formatICSDate(startDate)}`);
    lines.push(`DTEND:${formatICSDate(dueDate)}`);
    lines.push(`SUMMARY:[${deadline.type.toUpperCase()}] ${courseCode} - ${deadline.title}`);
    if (deadline.location) {
      lines.push(`LOCATION:${deadline.location}`);
    }
    lines.push(
      `DESCRIPTION:${deadline.description || ''}\\nPriority: ${deadline.priority}\\nWeight: ${deadline.weightPercentage || 0}%`
    );
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT24H');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Upcoming deadline: ${deadline.title}`);
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadCalendarICS(courses: Course[], deadlines: Deadline[]) {
  const icsString = generateICalendarData(courses, deadlines);
  const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'VinUni_Course_Schedule.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
