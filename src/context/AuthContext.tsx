import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useToast } from './NotificationSystemContext';

type User = {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  isOnline: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const { addToast } = useToast();

  const isAuthenticated = user !== null;

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Convert Firebase user to app user
  const formatUser = (firebaseUser: FirebaseUser): User => ({
    id: firebaseUser.uid,
    name: firebaseUser.displayName || 'User',
    email: firebaseUser.email || '',
    photoURL: firebaseUser.photoURL || undefined
  });

  // Login with Google
  const loginWithGoogle = async (): Promise<void> => {
    if (!isOnline) {
      addToast({
        message: 'Cannot sign in while offline',
        type: 'warning',
        duration: 3000
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // // Check if we're on mobile or if popup might be blocked
      // const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // if (isMobile) {
      //   // Use redirect for mobile devices
      //   await signInWithRedirect(auth, googleProvider);
      // } else {
      //   // Try popup first for desktop
        try {
          await signInWithPopup(auth, googleProvider);
          setLoading(false);
        } catch (popupError: any) {
          // If popup fails, fallback to redirect
          if (popupError.code === 'auth/popup-blocked' || 
              popupError.code === 'auth/popup-closed-by-user' ||
              popupError.code === 'auth/cancelled-popup-request') {
            await signInWithRedirect(auth, googleProvider);
          } else {
            throw popupError;
          }
        }
    //   }
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      setLoading(false);
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    if (!isOnline) {
      addToast({
        message: 'Cannot sign out while offline',
        type: 'warning',
        duration: 3000
      });
      return;
    }
    
    try {
      await signOut(auth);
      // Dispatch custom event to clear shopping lists
      window.dispatchEvent(new CustomEvent('userSignOut'));
      // User is set to null by the auth state listener
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    // Handle redirect result
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User signed in successfully via redirect
          console.log('User signed in via redirect:', result.user);
        }
      } catch (error) {
        console.error('Error handling redirect result:', error);
      }
    };

    handleRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        const formattedUser = formatUser(firebaseUser);
        setUser(formattedUser);
        localStorage.setItem('user', JSON.stringify(formattedUser));
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loginWithGoogle,
        logout,
        loading,
        isOnline
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};