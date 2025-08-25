// Firebase configuration for authentication
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAI } from 'firebase/ai';
import { SECURE_CONFIG } from './secrets';
import { CURRENT_ENV, envLog } from './envConfig';

// Get environment-specific Firebase configuration
const firebaseConfig = SECURE_CONFIG.FIREBASE;

// Log environment information (only in development)
envLog('Firebase initializing in', CURRENT_ENV, 'environment');
envLog('Using Firebase project:', firebaseConfig.projectId);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const ai = getAI(app);

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time
    // Firebase persistence failed: Multiple tabs open
  } else if (err.code === 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    // Firebase persistence is not available in this browser
  }
});

export default app;