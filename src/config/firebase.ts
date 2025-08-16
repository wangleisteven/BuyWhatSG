// Firebase configuration for authentication
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { SECURE_CONFIG } from './secrets';

const firebaseConfig = SECURE_CONFIG.FIREBASE;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

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