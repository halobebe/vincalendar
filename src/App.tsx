/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  INITIAL_COURSES,
  INITIAL_DEADLINES,
  INITIAL_NOTIFICATIONS,
} from './data/mockVinUniData';
import {
  Course,
  Deadline,
  NotificationItem,
  CalendarViewMode,
  DayOfWeek,
} from './types';
import { Navbar } from './components/Navbar';
import { CalendarWeekTimeGrid } from './components/CalendarWeekTimeGrid';
import { CalendarMonthView } from './components/CalendarMonthView';
import { CalendarDayView } from './components/CalendarDayView';
import { DeadlinesManager } from './components/DeadlinesManager';
import { CanvasDeadlineTracker } from './components/CanvasDeadlineTracker';
import { HomeScreenWidget } from './components/HomeScreenWidget';
import { CourseDetailModal } from './components/CourseDetailModal';
import { AddEditCourseModal } from './components/AddEditCourseModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import {
  ensureSignedIn,
  testFirebaseConnection,
  subscribeToRealtimeCourses,
  subscribeToRealtimeDeadlines,
  syncCourseToFirebase,
  removeCourseFromFirebase,
  syncDeadlineToFirebase,
  batchSyncDeadlinesToFirebase,
  seedInitialFirestoreData,
  loginWithGoogle,
  logoutUser,
  auth,
} from './firebase';
import { User, onAuthStateChanged } from 'firebase/auth';

export default function App() {
  // Persistence state
  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem('vinuni_courses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If legacy mock course exists, migrate cleanly to the new enrolled schedule from the image
        if (Array.isArray(parsed) && parsed.some((c: Course) => c.id === 'course-comp2030')) {
          localStorage.setItem('vinuni_courses', JSON.stringify(INITIAL_COURSES));
          return INITIAL_COURSES;
        }
        return parsed;
      } catch {
        return INITIAL_COURSES;
      }
    }
    return INITIAL_COURSES;
  });

  const [deadlines, setDeadlines] = useState<Deadline[]>(() => {
    const saved = localStorage.getItem('vinuni_deadlines');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((d: Deadline) => d.id === 'dl-comp2030-1')) {
          localStorage.setItem('vinuni_deadlines', JSON.stringify(INITIAL_DEADLINES));
          return INITIAL_DEADLINES;
        }
        return parsed;
      } catch {
        return INITIAL_DEADLINES;
      }
    }
    return INITIAL_DEADLINES;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('vinuni_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  // UI state
  const [currentView, setCurrentView] = useState<CalendarViewMode>('week');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const [addSlotPreset, setAddSlotPreset] = useState<{
    day?: DayOfWeek;
    startTime?: string;
  } | null>(null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);

  // Initialize Firebase, Authentication, and Realtime Listeners
  useEffect(() => {
    testFirebaseConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsCloudConnected(true);

        try {
          await seedInitialFirestoreData(user.uid, courses, deadlines);
        } catch (seedErr) {
          console.warn('[Firebase] Seed info:', seedErr);
        }

        // Realtime Courses sync
        const unsubCourses = subscribeToRealtimeCourses(
          user.uid,
          (cloudCourses) => {
            if (cloudCourses && cloudCourses.length > 0) {
              setCourses(cloudCourses);
            }
          },
          () => setIsCloudConnected(false)
        );

        // Realtime Deadlines sync
        const unsubDeadlines = subscribeToRealtimeDeadlines(
          user.uid,
          (cloudDeadlines) => {
            if (cloudDeadlines && cloudDeadlines.length > 0) {
              setDeadlines(cloudDeadlines);
            }
          },
          () => setIsCloudConnected(false)
        );

        return () => {
          unsubCourses();
          unsubDeadlines();
        };
      } else {
        ensureSignedIn().catch((err) => {
          console.warn('[Firebase] Anonymous sign-in attempt:', err);
        });
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Sync to local storage as fallback
  useEffect(() => {
    localStorage.setItem('vinuni_courses', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem('vinuni_deadlines', JSON.stringify(deadlines));
  }, [deadlines]);

  useEffect(() => {
    localStorage.setItem('vinuni_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Auth Action Handlers
  const handleSignInGoogle = async () => {
    try {
      const user = await loginWithGoogle();
      setCurrentUser(user);
    } catch (e) {
      console.warn('Google sign-in:', e);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      await ensureSignedIn();
    } catch (e) {
      console.warn('Logout error:', e);
    }
  };

  // Course management handlers
  const handleSaveCourse = (savedCourse: Course) => {
    setCourses((prev) => {
      const existingIndex = prev.findIndex((c) => c.id === savedCourse.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = savedCourse;
        return updated;
      }
      return [...prev, savedCourse];
    });

    if (currentUser) {
      syncCourseToFirebase(currentUser.uid, savedCourse).catch(console.error);
    }

    const isUpdate = courses.some((c) => c.id === savedCourse.id);
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: isUpdate ? `Course Updated: ${savedCourse.code}` : `Course Added: ${savedCourse.code}`,
      body: `${savedCourse.name} has been saved to your timetable.`,
      timestamp: 'Just now',
      type: 'class_reminder',
      read: false,
      courseCode: savedCourse.code,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setCourseToEdit(null);
    setAddSlotPreset(null);
    setShowAddCourse(false);
  };

  const handleDeleteCourse = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    setDeadlines((prev) => prev.filter((d) => d.courseId !== courseId));
    setSelectedCourse(null);

    if (currentUser) {
      removeCourseFromFirebase(currentUser.uid, courseId).catch(console.error);
    }

    if (course) {
      const notif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: `Course Removed: ${course.code}`,
        body: `${course.name} and associated items removed from your calendar.`,
        timestamp: 'Just now',
        type: 'class_reminder',
        read: false,
        courseCode: course.code,
      };
      setNotifications((prev) => [notif, ...prev]);
    }
  };

  const handleAddDeadline = (newDeadline: Deadline) => {
    setDeadlines((prev) => [newDeadline, ...prev]);

    if (currentUser) {
      syncDeadlineToFirebase(currentUser.uid, newDeadline).catch(console.error);
    }

    const course = courses.find((c) => c.id === newDeadline.courseId);
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: `Scheduled: ${newDeadline.title}`,
      body: `Due on ${newDeadline.dueDate} at ${newDeadline.dueTime} (${course?.code || 'Canvas'}).`,
      timestamp: 'Just now',
      type: newDeadline.type === 'Exam' ? 'exam' : 'deadline',
      read: false,
      courseCode: course?.code,
      deadlineId: newDeadline.id,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleImportCanvasDeadlines = (importedDeadlines: Deadline[]) => {
    let newItemsToSave: Deadline[] = [];
    setDeadlines((prev) => {
      // Merge and prevent duplicates based on title and dueDate
      const existingKeys = new Set(prev.map((d) => `${d.title.toLowerCase().trim()}_${d.dueDate}`));
      newItemsToSave = importedDeadlines.filter(
        (d) => !existingKeys.has(`${d.title.toLowerCase().trim()}_${d.dueDate}`)
      );
      return [...newItemsToSave, ...prev];
    });

    if (currentUser && newItemsToSave.length > 0) {
      batchSyncDeadlinesToFirebase(currentUser.uid, newItemsToSave).catch(console.error);
    }

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Canvas iCal Feed Synced',
      body: `Imported ${importedDeadlines.length} live Canvas assignment deadlines into your timetable calendar.`,
      timestamp: 'Just now',
      type: 'sync',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleToggleDeadlineStatus = (deadlineId: string) => {
    const target = deadlines.find((d) => d.id === deadlineId);
    if (target && currentUser) {
      syncDeadlineToFirebase(currentUser.uid, {
        ...target,
        status: target.status === 'completed' ? 'pending' : 'completed',
      }).catch(console.error);
    }

    setDeadlines((prev) =>
      prev.map((d) => {
        if (d.id === deadlineId) {
          const newStatus = d.status === 'completed' ? 'pending' : 'completed';
          return { ...d, status: newStatus };
        }
        return d;
      })
    );
  };

  const handleToggleReminder = (deadlineId: string) => {
    const target = deadlines.find((d) => d.id === deadlineId);
    if (target && currentUser) {
      syncDeadlineToFirebase(currentUser.uid, {
        ...target,
        reminderSet: !target.reminderSet,
      }).catch(console.error);
    }

    setDeadlines((prev) =>
      prev.map((d) => (d.id === deadlineId ? { ...d, reminderSet: !d.reminderSet } : d))
    );
  };

  const handleToggleChapterRead = (courseId: string, chapterNumber: number) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId) {
          const updatedChapters = c.textbook.chapters.map((ch) =>
            ch.number === chapterNumber ? { ...ch, isRead: !ch.isRead } : ch
          );
          return {
            ...c,
            textbook: { ...c.textbook, chapters: updatedChapters },
          };
        }
        return c;
      })
    );

    if (selectedCourse && selectedCourse.id === courseId) {
      setSelectedCourse((prev) => {
        if (!prev) return null;
        const updatedChapters = prev.textbook.chapters.map((ch) =>
          ch.number === chapterNumber ? { ...ch, isRead: !ch.isRead } : ch
        );
        return {
          ...prev,
          textbook: { ...prev.textbook, chapters: updatedChapters },
        };
      });
    }
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const renderActiveView = () => {
    switch (currentView) {
      case 'week':
        return (
          <CalendarWeekTimeGrid
            courses={courses}
            deadlines={deadlines}
            onSelectCourse={(c) => setSelectedCourse(c)}
            onOpenAddCourse={() => {
              setCourseToEdit(null);
              setAddSlotPreset(null);
              setShowAddCourse(true);
            }}
            onOpenAddCourseWithSlot={(day, startTime) => {
              setCourseToEdit(null);
              setAddSlotPreset({ day, startTime });
              setShowAddCourse(true);
            }}
            onViewChange={setCurrentView}
          />
        );
      case 'month':
        return (
          <CalendarMonthView
            courses={courses}
            deadlines={deadlines}
            onSelectCourse={(c) => setSelectedCourse(c)}
            onSelectDeadline={() => setCurrentView('deadlines')}
          />
        );
      case 'day':
        return (
          <CalendarDayView
            courses={courses}
            deadlines={deadlines}
            onSelectCourse={(c) => setSelectedCourse(c)}
            onToggleDeadlineStatus={handleToggleDeadlineStatus}
          />
        );
      case 'deadlines':
        return (
          <DeadlinesManager
            deadlines={deadlines}
            courses={courses}
            onToggleDeadlineStatus={handleToggleDeadlineStatus}
            onToggleReminder={handleToggleReminder}
            onAddDeadline={handleAddDeadline}
            onSelectCourse={(c) => setSelectedCourse(c)}
            onNavigateToCanvasFeed={() => setCurrentView('canvas')}
          />
        );
      case 'canvas':
        return (
          <CanvasDeadlineTracker
            courses={courses}
            onImportToCalendar={handleImportCanvasDeadlines}
          />
        );
      case 'widgets':
        return (
          <HomeScreenWidget
            courses={courses}
            deadlines={deadlines}
            onToggleDeadlineStatus={handleToggleDeadlineStatus}
            onSelectCourse={(c) => setSelectedCourse(c)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        currentView={currentView}
        onViewChange={(v) => setCurrentView(v)}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setShowNotifications(true)}
        isCloudConnected={isCloudConnected}
        userEmail={currentUser?.email || (currentUser?.isAnonymous ? 'Guest Student' : null)}
        onSignInGoogle={handleSignInGoogle}
        onSignOut={handleSignOut}
        onOpenAddCourse={() => {
          setCourseToEdit(null);
          setAddSlotPreset(null);
          setShowAddCourse(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {renderActiveView()}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[#0B2545] text-[#D4AF37] font-extrabold flex items-center justify-center text-[10px]">
              VU
            </span>
            <span className="font-semibold text-slate-700">
              VinUniversity Course Planner & Academic Calendar
            </span>
            <span className="text-slate-400">| Ocean Park Campus, Hanoi</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <span>Fall Semester 2026</span>
            <span>•</span>
            <span>Canvas Assignment Deadlines & Submissions</span>
            <span>•</span>
            <span>Manual Course Management</span>
          </div>
        </div>
      </footer>

      {/* MODALS AND DRAWERS */}
      {/* 1. Course Detail Modal (Classrooms, Textbook, Syllabus, Deadlines, Edit, Remove) */}
      <CourseDetailModal
        course={selectedCourse}
        deadlines={deadlines}
        onClose={() => setSelectedCourse(null)}
        onToggleChapterRead={handleToggleChapterRead}
        onToggleDeadlineStatus={handleToggleDeadlineStatus}
        onOpenAddDeadlineForCourse={() => {
          setSelectedCourse(null);
          setCurrentView('deadlines');
        }}
        onEditCourse={(course) => {
          setSelectedCourse(null);
          setCourseToEdit(course);
          setAddSlotPreset(null);
          setShowAddCourse(true);
        }}
        onDeleteCourse={handleDeleteCourse}
      />

      {/* 2. Add / Edit Course Modal */}
      {showAddCourse && (
        <AddEditCourseModal
          courseToEdit={courseToEdit}
          initialDay={addSlotPreset?.day}
          initialStartTime={addSlotPreset?.startTime}
          onClose={() => {
            setShowAddCourse(false);
            setCourseToEdit(null);
            setAddSlotPreset(null);
          }}
          onSaveCourse={handleSaveCourse}
        />
      )}

      {/* 3. Real-Time Push Notification Drawer */}
      <NotificationDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkAsRead={(id) =>
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
          )
        }
        onMarkAllAsRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        }
        onClearAll={() => setNotifications([])}
      />
    </div>
  );
}
