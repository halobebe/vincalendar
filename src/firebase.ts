import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Course, Deadline } from './types';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore (support custom databaseId if configured)
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Auth
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Connection verification test
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Connection verified with live cloud Firestore.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or Firestore is temporarily unreachable.');
      return false;
    }
    return true;
  }
}

// Authentication Helpers
export async function ensureSignedIn(): Promise<User> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          resolve(cred.user);
        } catch (err) {
          reject(err);
        }
      }
    });
  });
}

// Robust Google login: attempts popup first, falls back to redirect if popup is blocked
export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn('[Firebase Auth] Popup failed or blocked:', error?.code, error?.message);
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      // In embedded iframe contexts or strict browsers, redirect flow can be used
      try {
        await signInWithRedirect(auth, googleProvider);
        return null;
      } catch (redirectErr) {
        console.error('[Firebase Auth] Redirect failed:', redirectErr);
        throw redirectErr;
      }
    }
    throw error;
  }
}

export async function checkRedirectAuthResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result ? result.user : null;
  } catch (e) {
    console.warn('[Firebase Auth] No redirect result:', e);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// Real-Time Subscriptions scoped per user
export function subscribeToRealtimeCourses(
  userId: string,
  onUpdate: (courses: Course[]) => void,
  onError?: (err: Error) => void
): () => void {
  const coursesCol = collection(db, 'users', userId, 'courses');
  return onSnapshot(
    coursesCol,
    (snapshot) => {
      const courses: Course[] = [];
      snapshot.forEach((docSnap) => {
        courses.push(docSnap.data() as Course);
      });
      onUpdate(courses);
    },
    (error) => {
      console.error('[Firebase] Realtime courses sync error:', error);
      if (onError) onError(error);
    }
  );
}

export function subscribeToRealtimeDeadlines(
  userId: string,
  onUpdate: (deadlines: Deadline[]) => void,
  onError?: (err: Error) => void
): () => void {
  const deadlinesCol = collection(db, 'users', userId, 'deadlines');
  return onSnapshot(
    deadlinesCol,
    (snapshot) => {
      const deadlines: Deadline[] = [];
      snapshot.forEach((docSnap) => {
        deadlines.push(docSnap.data() as Deadline);
      });
      deadlines.sort((a, b) => {
        const dateA = new Date(`${a.dueDate}T${a.dueTime || '23:59'}:00`).getTime();
        const dateB = new Date(`${b.dueDate}T${b.dueTime || '23:59'}:00`).getTime();
        return dateA - dateB;
      });
      onUpdate(deadlines);
    },
    (error) => {
      console.error('[Firebase] Realtime deadlines sync error:', error);
      if (onError) onError(error);
    }
  );
}

export function subscribeToUserProfile(
  userId: string,
  onUpdate: (profile: any) => void
): () => void {
  const userDoc = doc(db, 'users', userId);
  return onSnapshot(userDoc, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data());
    }
  });
}

// Data Mutation Functions scoped per user
export async function syncCourseToFirebase(userId: string, course: Course): Promise<void> {
  const cleanId = course.id.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const courseDoc = doc(db, 'users', userId, 'courses', cleanId);
  await setDoc(courseDoc, { ...course, userId }, { merge: true });
}

export async function removeCourseFromFirebase(userId: string, courseId: string): Promise<void> {
  const cleanId = courseId.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const courseDoc = doc(db, 'users', userId, 'courses', cleanId);
  await deleteDoc(courseDoc);
}

export async function syncDeadlineToFirebase(userId: string, deadline: Deadline): Promise<void> {
  const cleanId = deadline.id.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const dlDoc = doc(db, 'users', userId, 'deadlines', cleanId);
  await setDoc(dlDoc, { ...deadline, userId }, { merge: true });
}

export async function removeDeadlineFromFirebase(userId: string, deadlineId: string): Promise<void> {
  const cleanId = deadlineId.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const dlDoc = doc(db, 'users', userId, 'deadlines', cleanId);
  await deleteDoc(dlDoc);
}

export async function batchSyncDeadlinesToFirebase(
  userId: string,
  deadlines: Deadline[]
): Promise<number> {
  if (deadlines.length === 0) return 0;
  const batch = writeBatch(db);

  deadlines.forEach((dl) => {
    const cleanId = dl.id.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const dlDoc = doc(db, 'users', userId, 'deadlines', cleanId);
    batch.set(dlDoc, { ...dl, userId }, { merge: true });
  });

  await batch.commit();
  return deadlines.length;
}

// Seeds user profile and initial starter schedule if user collection is totally empty
export async function seedInitialFirestoreData(
  userId: string,
  initialCourses: Course[],
  initialDeadlines: Deadline[],
  studentProfile?: {
    studentId?: string;
    studentName?: string;
    email?: string;
    college?: string;
    program?: string;
    cohort?: string;
    photoURL?: string;
  }
): Promise<boolean> {
  const coursesCol = collection(db, 'users', userId, 'courses');
  const snap = await getDocs(coursesCol);

  // If user already has courses in their cloud account, do not overwrite!
  if (!snap.empty) {
    return false;
  }

  const batch = writeBatch(db);

  // Set user profile
  const userDoc = doc(db, 'users', userId);
  batch.set(
    userDoc,
    {
      uid: userId,
      studentId: studentProfile?.studentId || '26an.ntt',
      studentName: studentProfile?.studentName || 'Student',
      email: studentProfile?.email || 'student@vinuni.edu.vn',
      college: studentProfile?.college || 'CECS',
      program: studentProfile?.program || 'B.Sc. in Computer Science',
      cohort: studentProfile?.cohort || 'Class of 2026',
      photoURL: studentProfile?.photoURL || '',
      gpa: 3.84,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  // Seed default template courses so new user doesn't start with a blank screen
  initialCourses.forEach((c) => {
    const cleanId = c.id.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const cDoc = doc(db, 'users', userId, 'courses', cleanId);
    batch.set(cDoc, { ...c, userId });
  });

  // Seed default template deadlines
  initialDeadlines.forEach((d) => {
    const cleanId = d.id.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const dDoc = doc(db, 'users', userId, 'deadlines', cleanId);
    batch.set(dDoc, { ...d, userId });
  });

  await batch.commit();
  console.log(`[Firebase] Initial starter courses and deadlines seeded for user ${userId}.`);
  return true;
}
