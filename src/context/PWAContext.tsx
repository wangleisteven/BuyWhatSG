import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { isStandalone, updateManifestForCurrentDomain } from '../utils';
import { handleDeepLink, registerUrlHandler, markPWAAsInstalled } from '../utils';
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
  openApp: () => Promise<void>;
  isPWAInstalled: boolean;
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
  const [isPWAInstalled, setIsPWAInstalled] = useState(localStorage.getItem('pwa-installed') === 'true');
  const { addToast } = useNotificationSystem();
  const navigate = useNavigate();

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
      setIsPWAInstalled(true);
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
    
    // Check if PWA was previously installed
    if (localStorage.getItem('pwa-installed') === 'true') {
      setIsPWAInstalled(true);
    }

    // Initialize deep linking
    const deepLinkResult = handleDeepLink(window.location.href);
    
    // Navigate to the deep link route if it's different from current location
    if (deepLinkResult.route && deepLinkResult.route !== window.location.pathname) {
      console.log('🔗 Navigating to deep link route:', deepLinkResult.route);
      navigate(deepLinkResult.route, { replace: true });
    }
    
    registerUrlHandler();
    

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [addToast]);

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

  const openApp = async (): Promise<void> => {
    console.log('🚀 Open App button clicked');
    console.log('📱 PWA installed:', isPWAInstalled);
    console.log('🌐 Running in browser:', !isPWA);
    console.log('📍 Current URL:', window.location.href);
    console.log('🔧 User agent:', navigator.userAgent);
    
    if (!isPWAInstalled) {
      console.warn('❌ PWA not marked as installed');
      addToast({
        variant: 'warning',
        message: 'App not installed. Please install the app first.',
        duration: 3000
      });
      return;
    }

    if (isPWA) {
      console.log('✅ Already running in PWA mode');
      addToast({
        variant: 'info',
        message: 'You are already using the app!',
        duration: 2000
      });
      return;
    }

    try {
      // Get current path to preserve navigation state
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      // The manifest.json protocol handler expects: web+buywhatsg://path -> /?handler=path
      // So we need to encode the current path as the protocol parameter
      const encodedPath = encodeURIComponent(currentPath);
      const protocolUrl = `web+buywhatsg://${encodedPath}`;
      
      console.log('🔗 Attempting to open with protocol:', protocolUrl);
      
      // For iOS Safari, show specific message
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        console.log('🍎 iOS detected - showing iOS-specific message');
        addToast({
          variant: 'info',
          message: 'Please find the BuyWhatSG app on your device and open it directly.',
          duration: 4000
        });
        return;
      }

      // Set up detection for successful app opening
      let appOpened = false;
      let timeoutId: NodeJS.Timeout;
      
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleBlur);
      };
      
      const handleVisibilityChange = () => {
        if (document.hidden && !appOpened) {
          console.log('✅ App appears to have opened (visibility change)');
          appOpened = true;
          cleanup();
        }
      };
      
      const handleBlur = () => {
        if (!appOpened) {
          setTimeout(() => {
            if (document.hidden || !document.hasFocus()) {
              console.log('✅ App appears to have opened (blur detection)');
              appOpened = true;
              cleanup();
            }
          }, 100);
        }
      };
      
      // Set up event listeners
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleBlur);
      
      // Set timeout to show failure message
      timeoutId = setTimeout(() => {
        if (!appOpened) {
          cleanup();
          console.log('❌ Failed to open app - timeout reached');
          addToast({
            variant: 'warning',
            message: 'Unable to open the app. Please find the BuyWhatSG app on your device and open it directly.',
            duration: 4000
          });
        }
      }, 3000);
      
      // Try to open with protocol handler
      console.log('🔄 Attempting protocol handler redirect...');
      window.location.href = protocolUrl;
      
    } catch (error) {
      console.error('❌ Error opening app:', error);
      addToast({
        variant: 'error',
        message: 'Failed to open app. Please find the BuyWhatSG app on your device.',
        duration: 4000
      });
    }
  };

  const value: PWAContextType = {
    deferredPrompt,
    canInstall,
    isPWA,
    showInstallPrompt,
    openApp,
    isPWAInstalled,
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
};