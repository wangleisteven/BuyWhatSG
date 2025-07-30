// Firebase configuration for authentication
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = { 
  apiKey: "AIzaSyDYUDPIzq-rrdO42q-Z306VO2vCUyJGG10", 
  authDomain: "buywhatsg-80f32.firebaseapp.com", 
  projectId: "buywhatsg-80f32", 
  storageBucket: "buywhatsg-80f32.firebasestorage.app", 
  messagingSenderId: "559463319723", 
  appId: "1:559463319723:web:add63e7da748f31a080fee", 
  measurementId: "G-0B5MJCPNTV" 
};

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
    console.warn('Firebase persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    console.warn('Firebase persistence is not available in this browser');
  }
});

export default app;