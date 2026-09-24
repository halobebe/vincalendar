/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { AuthModal } from './components/AuthModal';
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
  checkRedirectAuthResult,
  auth,
} from './firebase';
import { User, onAuthStateChanged } from 'firebase/auth';

export default function App() {
  // Current active account / workspace identifier
  const [activeAccountKey, setActiveAccountKey] = useState<string>(() => {
    return localStorage.getItem('vinuni_active_account_key') || '';
  });

  // State
  const [courses, setCourses] = useState<Course[]>(() => {
    const key = localStorage.getItem('vinuni_active_account_key') || 'default';
    const saved = localStorage.getItem(`vinuni_courses_${key}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_COURSES;
      }
    }
    return INITIAL_COURSES;
  });

  const [deadlines, setDeadlines] = useState<Deadline[]>(() => {
    const key = localStorage.getItem('vinuni_active_account_key') || 'default';
    const saved = localStorage.getItem(`vinuni_deadlines_${key}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_DEADLINES;
      }
    }
    return INITIAL_DEADLINES;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const key = localStorage.getItem('vinuni_active_account_key') || 'default';
    const saved = localStorage.getItem(`vinuni_notifications_${key}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_NOTIFICATIONS;
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [currentView, setCurrentView] = useState<CalendarViewMode>('week');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const [addSlotPreset, setAddSlotPreset] = useState<{
    day?: DayOfWeek;
    startTime?: string;
  } | null>(null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active sync user ID: either custom student ID or Firebase Auth UID
  const effectiveUserId = activeAccountKey || currentUser?.uid || 'guest';

  // Subscriptions cleaner ref
  const unsubscribeListenersRef = useRef<(() => void) | null>(null);

  // Bind real-time cloud listeners whenever the effective user changes
  const bindUserCloudListeners = (userId: string, userMeta?: { email?: string; displayName?: string; photoURL?: string }) => {
    if (unsubscribeListenersRef.current) {
      unsubscribeListenersRef.current();
      unsubscribeListenersRef.current = null;
    }

    if (!userId) return;

    // Seed initial schedule if user's cloud collection is blank
    seedInitialFirestoreData(userId, INITIAL_COURSES, INITIAL_DEADLINES, {
      studentId: userId,
      studentName: userMeta?.displayName || 'Student',
      email: userMeta?.email || `${userId}@vinuni.edu.vn`,
      photoURL: userMeta?.photoURL || '',
    }).catch(console.warn);

    // Subscribe to realtime Courses
    const unsubCourses = subscribeToRealtimeCourses(
      userId,
      (cloudCourses) => {
        if (cloudCourses && cloudCourses.length > 0) {
          setCourses(cloudCourses);
        }
      },
      () => setIsCloudConnected(false)
    );

    // Subscribe to realtime Deadlines
    const unsubDeadlines = subscribeToRealtimeDeadlines(
      userId,
      (cloudDeadlines) => {
        if (cloudDeadlines && cloudDeadlines.length > 0) {
          setDeadlines(cloudDeadlines);
        }
      },
      () => setIsCloudConnected(false)
    );

    unsubscribeListenersRef.current = () => {
      unsubCourses();
      unsubDeadlines();
    };
  };

  // Initialize Firebase and Authentication
  useEffect(() => {
    testFirebaseConnection();

    // Check redirect login results
    checkRedirectAuthResult()
      .then((user) => {
        if (user) {
          setCurrentUser(user);
        }
      })
      .catch((e) => console.warn('Redirect auth check:', e));

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setIsCloudConnected(true);
        // If no custom student ID override is active, bind to Google/Firebase UID
        if (!activeAccountKey) {
          bindUserCloudListeners(user.uid, {
            email: user.email || undefined,
            displayName: user.displayName || undefined,
            photoURL: user.photoURL || undefined,
          });
        }
      } else {
        ensureSignedIn().catch((err) => {
          console.warn('[Firebase] Anonymous sign-in attempt:', err);
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeListenersRef.current) {
        unsubscribeListenersRef.current();
      }
    };
  }, []);

  // Handle custom student ID account switch
  useEffect(() => {
    if (activeAccountKey) {
      bindUserCloudListeners(activeAccountKey, {
        displayName: activeAccountKey,
        email: `${activeAccountKey}@vinuni.edu.vn`,
      });
    }
  }, [activeAccountKey]);

  // Sync to local storage scoped by user ID
  useEffect(() => {
    const key = activeAccountKey || currentUser?.uid || 'default';
    localStorage.setItem(`vinuni_courses_${key}`, JSON.stringify(courses));
  }, [courses, activeAccountKey, currentUser]);

  useEffect(() => {
    const key = activeAccountKey || currentUser?.uid || 'default';
    localStorage.setItem(`vinuni_deadlines_${key}`, JSON.stringify(deadlines));
  }, [deadlines, activeAccountKey, currentUser]);

  useEffect(() => {
    const key = activeAccountKey || currentUser?.uid || 'default';
    localStorage.setItem(`vinuni_notifications_${key}`, JSON.stringify(notifications));
  }, [notifications, activeAccountKey, currentUser]);

  // Auth Action Handlers
  const handleSignInGoogle = async () => {
    setAuthError(null);
    try {
      const user = await loginWithGoogle();
      if (user) {
        // Clear any custom manual override so we use the real Google account
        setActiveAccountKey('');
        localStorage.removeItem('vinuni_active_account_key');
        setCurrentUser(user);
        bindUserCloudListeners(user.uid, {
          email: user.email || undefined,
          displayName: user.displayName || undefined,
          photoURL: user.photoURL || undefined,
        });
      }
    } catch (e: any) {
      console.warn('Google sign-in error:', e);
      setAuthError(
        e?.code === 'auth/unauthorized-domain'
          ? 'Notice: This domain is awaiting Firebase Auth domain whitelist. You can still use the "Switch to Your Student ID" below to customize your schedule immediately!'
          : e?.message || 'Failed to sign in with Google.'
      );
      throw e;
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setActiveAccountKey('');
      localStorage.removeItem('vinuni_active_account_key');
      const anonUser = await ensureSignedIn();
      setCurrentUser(anonUser);
    } catch (e) {
      console.warn('Logout error:', e);
    }
  };

  const handleCustomAccountSwitch = (customIdentifier: string) => {
    const cleanId = customIdentifier.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '_');
    setActiveAccountKey(cleanId);
    localStorage.setItem('vinuni_active_account_key', cleanId);
    bindUserCloudListeners(cleanId, {
      displayName: customIdentifier,
      email: `${customIdentifier}@vinuni.edu.vn`,
    });
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

    if (effectiveUserId) {
      syncCourseToFirebase(effectiveUserId, savedCourse).catch(console.error);
    }

    const isUpdate = courses.some((c) => c.id === savedCourse.id);
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      courseId: savedCourse.id,
      title: isUpdate ? 'Course Updated' : 'Course Added',
      message: `${savedCourse.code} - ${savedCourse.name} schedule was updated.`,
      timestamp: 'Just now',
      read: false,
      type: 'course',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleDeleteCourse = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    setDeadlines((prev) => prev.filter((d) => d.courseId !== courseId));
    setSelectedCourse(null);

    if (effectiveUserId) {
      removeCourseFromFirebase(effectiveUserId, courseId).catch(console.error);
    }

    if (course) {
      const notif: NotificationItem = {
        id: `notif-${Date.now()}`,
        courseId: course.id,
        title: 'Course Dropped',
        message: `${course.code} has been removed from your semester plan.`,
        timestamp: 'Just now',
        read: false,
        type: 'course',
      };
      setNotifications((prev) => [notif, ...prev]);
    }
  };

  // Deadline Handlers
  const handleAddDeadline = (newDeadline: Deadline) => {
    setDeadlines((prev) => [newDeadline, ...prev]);

    if (effectiveUserId) {
      syncDeadlineToFirebase(effectiveUserId, newDeadline).catch(console.error);
    }

    const course = courses.find((c) => c.id === newDeadline.courseId);
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      courseId: newDeadline.courseId,
      title: `New ${newDeadline.type}: ${newDeadline.title}`,
      message: `Due on ${newDeadline.dueDate} at ${newDeadline.dueTime} (${course?.code || 'Course'}).`,
      timestamp: 'Just now',
      read: false,
      type: 'deadline',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleImportCanvasDeadlines = (importedDeadlines: Deadline[]) => {
    let newItemsToSave: Deadline[] = [];
    setDeadlines((prev) => {
      const existingKeys = new Set(prev.map((d) => `${d.title.toLowerCase().trim()}_${d.dueDate}`));
      newItemsToSave = importedDeadlines.filter(
        (d) => !existingKeys.has(`${d.title.toLowerCase().trim()}_${d.dueDate}`)
      );
      return [...newItemsToSave, ...prev];
    });

    if (effectiveUserId && newItemsToSave.length > 0) {
      batchSyncDeadlinesToFirebase(effectiveUserId, newItemsToSave).catch(console.error);
    }

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Canvas iCal Feed Synced',
      message: `Successfully synchronized ${importedDeadlines.length} assignments from VinUniversity Canvas LMS.`,
      timestamp: 'Just now',
      read: false,
      type: 'canvas',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleToggleDeadlineStatus = (deadlineId: string) => {
    const target = deadlines.find((d) => d.id === deadlineId);
    if (target && effectiveUserId) {
      syncDeadlineToFirebase(effectiveUserId, {
        ...target,
        status: target.status === 'completed' ? 'pending' : 'completed',
      }).catch(console.error);
    }

    setDeadlines((prev) =>
      prev.map((d) => {
        if (d.id === deadlineId) {
          const nextStatus = d.status === 'completed' ? 'pending' : 'completed';
          return { ...d, status: nextStatus };
        }
        return d;
      })
    );
  };

  const handleToggleReminder = (deadlineId: string) => {
    const target = deadlines.find((d) => d.id === deadlineId);
    if (target && effectiveUserId) {
      syncDeadlineToFirebase(effectiveUserId, {
        ...target,
        reminderSet: !target.reminderSet,
      }).catch(console.error);
    }

    setDeadlines((prev) =>
      prev.map((d) => (d.id === deadlineId ? { ...d, reminderSet: !d.reminderSet } : d))
    );
  };

  const handleToggleChapterRead = (courseId: string, chapterNumber: number) => {
    setCourses((prev) => {
      const updated = prev.map((course) => {
        if (course.id !== courseId || !course.textbook) return course;
        const newChapters = course.textbook.chapters.map((ch) =>
          ch.number === chapterNumber ? { ...ch, isRead: !ch.isRead } : ch
        );
        const updatedCourse = {
          ...course,
          textbook: { ...course.textbook, chapters: newChapters },
        };
        if (effectiveUserId) {
          syncCourseToFirebase(effectiveUserId, updatedCourse).catch(console.error);
        }
        return updatedCourse;
      });
      return updated;
    });
  };

  // Badge count for unread
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // Active user label
  const displayedUserLabel =
    activeAccountKey
      ? `@${activeAccountKey}`
      : currentUser?.email
      ? currentUser.email
      : currentUser?.isAnonymous
      ? 'Guest Student'
      : 'Account';

  // Render view components
  const renderActiveView = () => {
    switch (currentView) {
      case 'week':
        return (
          <CalendarWeekTimeGrid
            courses={courses}
            deadlines={deadlines}
            onSelectCourse={(course) => setSelectedCourse(course)}
            onAddCourseSlot={(day, startTime) => {
              setCourseToEdit(null);
              setAddSlotPreset({ day, startTime });
              setShowAddCourse(true);
            }}
          />
        );

      case 'month':
        return (
          <CalendarMonthView
            courses={courses}
            deadlines={deadlines}
            onSelectCourse={(course) => setSelectedCourse(course)}
            onSelectDate={(dateStr) => {
              console.log('Selected date:', dateStr);
            }}
          />
        );

      case 'day':
        return (
          <CalendarDayView
            courses={courses}
            deadlines={deadlines}
            onSelectCourse={(course) => setSelectedCourse(course)}
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
            onSelectCourse={(course) => setSelectedCourse(course)}
            onNavigateToCanvasFeed={() => setCurrentView('canvas')}
          />
        );

      case 'canvas':
        return (
          <CanvasDeadlineTracker
            courses={courses}
            onImportDeadlines={handleImportCanvasDeadlines}
            existingDeadlines={deadlines}
          />
        );

      case 'widgets':
        return (
          <HomeScreenWidget
            courses={courses}
            deadlines={deadlines}
            onSelectCourse={(course) => setSelectedCourse(course)}
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
        userEmail={displayedUserLabel}
        userPhoto={currentUser?.photoURL || null}
        onOpenAuthModal={() => setShowAuthModal(true)}
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
            <span>Multi-Account Cloud Sync</span>
          </div>
        </div>
      </footer>

      {/* MODALS AND DRAWERS */}
      {/* 1. Account / Auth / Student ID Switcher Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        currentUser={currentUser}
        onSignInGoogle={handleSignInGoogle}
        onSignOut={handleSignOut}
        onCustomAccountSwitch={handleCustomAccountSwitch}
        authError={authError}
      />

      {/* 2. Course Detail Modal */}
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

      {/* 3. Add / Edit Course Modal */}
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

      {/* 4. Real-Time Push Notification Drawer */}
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
