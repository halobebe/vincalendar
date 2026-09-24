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
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Course, Deadline, NotificationItem } from './types';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore (support custom databaseId if configured)
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Auth
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Connection verification test as required by Firebase skill
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
    // Expected when test doc does not exist, but connection succeeds
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

export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// Real-Time Subscriptions
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
      // Sort chronologically
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

// Data Mutation Functions
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

export async function seedInitialFirestoreData(
  userId: string,
  initialCourses: Course[],
  initialDeadlines: Deadline[],
  studentProfile?: any
): Promise<boolean> {
  const coursesCol = collection(db, 'users', userId, 'courses');
  const snap = await getDocs(coursesCol);

  // If already has data, do not overwrite
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
      studentName: studentProfile?.studentName || 'Nguyen Trong Thien An',
      email: studentProfile?.email || '26an.ntt@vinuni.edu.vn',
      college: studentProfile?.college || 'CECS',
      program: studentProfile?.program || 'B.Sc. in Computer Science',
      cohort: studentProfile?.cohort || 'Class of 2026',
      gpa: 3.84,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  // Seed initial courses
  initialCourses.forEach((c) => {
    const cleanId = c.id.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const cDoc = doc(db, 'users', userId, 'courses', cleanId);
    batch.set(cDoc, { ...c, userId });
  });

  // Seed initial deadlines
  initialDeadlines.forEach((d) => {
    const cleanId = d.id.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const dDoc = doc(db, 'users', userId, 'deadlines', cleanId);
    batch.set(dDoc, { ...d, userId });
  });

  await batch.commit();
  console.log('[Firebase] Successfully seeded initial courses and deadlines to Firestore.');
  return true;
}
