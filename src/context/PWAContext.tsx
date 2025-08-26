import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { isStandalone, updateManifestForCurrentDomain } from '../utils';
import { handleDeepLink, registerUrlHandler, markPWAAsInstalled, showOpenInAppPrompt } from '../utils';
import { useNotificationSystem } from './NotificationSystemContext';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAContextType {
  deferredPrompt: BeforeInstallPromptEvent | null;
  canInstall: boolean;
  isPWA: boolean;
  showInstallPrompt: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

interface PWAProviderProps {
  children: ReactNode;
}

export const PWAProvider = ({ children }: PWAProviderProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isPWA, setIsPWA] = useState(isStandalone());
  const { addToast } = useNotificationSystem();

  useEffect(() => {
    // Update manifest for current domain (localhost vs ngrok)
    updateManifestForCurrentDomain();

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      // Clear the deferredPrompt so it can be garbage collected
      setDeferredPrompt(null);
      setCanInstall(false);
      setIsPWA(true);
      // Mark PWA as installed for deep linking
      markPWAAsInstalled();
    };

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if app is already installed (running in standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      setIsPWA(true);
    }

    // Initialize deep linking
    handleDeepLink(window.location.href);
    registerUrlHandler();
    
    // Show open in app prompt if PWA is installed but running in browser
    showOpenInAppPrompt(addToast);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const showInstallPrompt = async (): Promise<void> => {
    if (!deferredPrompt) {
      console.warn('Install prompt not available. Make sure the app meets PWA criteria.');
      throw new Error('No install prompt available');
    }

    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      // Clear the deferredPrompt
      setDeferredPrompt(null);
      setCanInstall(false);
    } catch (error) {
      console.error('Error showing install prompt:', error);
      throw error;
    }
  };

  const value: PWAContextType = {
    deferredPrompt,
    canInstall,
    isPWA,
    showInstallPrompt,
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
};