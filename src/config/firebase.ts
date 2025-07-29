// Firebase configuration for authentication
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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

export default app;