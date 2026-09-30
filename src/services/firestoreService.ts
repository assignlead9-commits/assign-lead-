import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  writeBatch,
  getDocFromServer,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Department,
  LeadStatus,
  UserProfile,
  Lead,
  LeadActivity,
  Followup,
  LeadAssignment,
} from '../types/crm';
import {
  INITIAL_DEPARTMENTS,
  INITIAL_STATUSES,
  INITIAL_PROFILES,
  INITIAL_LEADS,
  INITIAL_ACTIVITIES,
  INITIAL_FOLLOWUPS,
} from './seedData';

// Firestore collection names
export const COLL_DEPARTMENTS = 'departments';
export const COLL_STATUSES = 'lead_statuses';
export const COLL_PROFILES = 'profiles';
export const COLL_LEADS = 'leads';
export const COLL_ACTIVITIES = 'lead_activities';
export const COLL_FOLLOWUPS = 'followups';
export const COLL_ASSIGNMENTS = 'lead_assignments';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo:
        auth?.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let isInitialized = false;

export async function testConnection(): Promise<{ success: boolean; latency: number; error?: string }> {
  const start = performance.now();
  try {
    // Ping firestore using getDocs on departments
    await getDocs(collection(db, COLL_DEPARTMENTS));
    const latency = Math.round(performance.now() - start);
    return { success: true, latency };
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return { success: false, latency: 0, error: error.message || 'Connection failed' };
  }
}

export async function initFirestoreDatabase(): Promise<boolean> {
  if (isInitialized) return true;
  try {
    // Check if departments exist
    const snap = await getDocs(collection(db, COLL_DEPARTMENTS));
    if (snap.empty) {
      console.log('Seeding initial data into Firestore...');
      const batch = writeBatch(db);

      INITIAL_DEPARTMENTS.forEach((d) => {
        batch.set(doc(db, COLL_DEPARTMENTS, d.id), d);
      });

      INITIAL_STATUSES.forEach((s) => {
        batch.set(doc(db, COLL_STATUSES, s.id), s);
      });

      INITIAL_PROFILES.forEach((p) => {
        batch.set(doc(db, COLL_PROFILES, p.id), p);
      });

      INITIAL_LEADS.forEach((l) => {
        batch.set(doc(db, COLL_LEADS, l.id), l);
      });

      INITIAL_ACTIVITIES.forEach((a) => {
        batch.set(doc(db, COLL_ACTIVITIES, a.id), a);
      });

      INITIAL_FOLLOWUPS.forEach((f) => {
        batch.set(doc(db, COLL_FOLLOWUPS, f.id), f);
      });

      await batch.commit();
      console.log('Firestore seed completed successfully.');
    }
    isInitialized = true;
    return true;
  } catch (err) {
    console.warn('Firestore initialization or connection error:', err);
    return false;
  }
}

export async function fetchCollectionFromFirestore<T>(collectionName: string): Promise<T[]> {
  try {
    const snap = await getDocs(collection(db, collectionName));
    return snap.docs.map((d) => d.data() as T);
  } catch (err) {
    console.warn(`Failed to fetch ${collectionName} from Firestore`, err);
    return [];
  }
}

export async function saveDocToFirestore(collectionName: string, id: string, data: any): Promise<void> {
  try {
    await setDoc(doc(db, collectionName, id), data, { merge: true });
  } catch (err) {
    console.warn(`Failed to save doc to ${collectionName}/${id}`, err);
  }
}

export async function saveBatchToFirestore(collectionName: string, items: { id: string; data: any }[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      batch.set(doc(db, collectionName, item.id), item.data, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.warn(`Failed to batch save docs to ${collectionName}`, err);
  }
}

export function getFirebaseMetadata() {
  return {
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId,
    authDomain: firebaseConfig.authDomain,
    appId: firebaseConfig.appId,
  };
}
