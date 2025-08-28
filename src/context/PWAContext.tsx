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
  const [isPWAInstalled, setIsPWAInstalled] = useState(() => {
    // Check if actually running in PWA mode first
    if (isStandalone()) {
      return true;
    }
    // Otherwise check localStorage
    return localStorage.getItem('pwa-installed') === 'true';
  });
  const { addToast } = useNotificationSystem();
  const navigate = useNavigate();

  // Auto-open PWA if installed and not already running in PWA mode
  const autoOpenPWA = async () => {
    // Skip auto-open if already in PWA mode
    if (isPWA) {
      console.log('✅ Already running in PWA mode, skipping auto-open');
      return;
    }

    // Skip auto-open if PWA is not marked as installed
    if (!isPWAInstalled) {
      console.log('❌ PWA not marked as installed, skipping auto-open');
      return;
    }

    // Skip auto-open on iOS (protocol handlers don't work reliably)
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      console.log('🍎 iOS detected, skipping auto-open');
      return;
    }

    try {
      console.log('🚀 Attempting auto-open of PWA...');
      
      // Test if protocol handler is registered
      const isProtocolRegistered = await testProtocolHandler();
      
      if (!isProtocolRegistered) {
        console.warn('❌ Protocol handler not registered, PWA may not be properly installed');
        // Reset installation status
        setIsPWAInstalled(false);
        localStorage.removeItem('pwa-installed');
        return;
      }

      console.log('✅ Protocol handler registered, attempting auto-open');
      
      // Get current path to preserve navigation state
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      const encodedPath = encodeURIComponent(currentPath);
      const protocolUrl = `web+buywhatsg://${encodedPath}`;
      
      console.log('🔗 Auto-opening with protocol:', protocolUrl);
      
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
          console.log('✅ PWA auto-opened successfully (visibility change)');
          appOpened = true;
          cleanup();
        }
      };
      
      const handleBlur = () => {
        if (!appOpened) {
          setTimeout(() => {
            if (document.hidden || !document.hasFocus()) {
              console.log('✅ PWA auto-opened successfully (blur detection)');
              appOpened = true;
              cleanup();
            }
          }, 100);
        }
      };
      
      // Set up event listeners
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleBlur);
      
      // Set timeout for auto-open attempt (shorter than manual open)
      timeoutId = setTimeout(() => {
        if (!appOpened) {
          cleanup();
          console.log('⏰ Auto-open timeout reached, continuing with website');
        }
      }, 1500); // Shorter timeout for auto-open
      
      // Attempt to open with protocol handler
      window.location.href = protocolUrl;
      
    } catch (error) {
      console.error('❌ Error during auto-open:', error);
    }
  };

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
      setIsPWAInstalled(true);
      markPWAAsInstalled();
    }
    
    // Check if PWA was previously installed but validate it
    if (localStorage.getItem('pwa-installed') === 'true' && !isStandalone()) {
      // Validate installation by testing protocol handler
      testProtocolHandler().then(isRegistered => {
        if (!isRegistered) {
          console.log('🔄 PWA marked as installed but protocol handler not working, resetting status');
          setIsPWAInstalled(false);
          localStorage.removeItem('pwa-installed');
        } else {
          setIsPWAInstalled(true);
        }
      });
    } else if (isStandalone()) {
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
    
    // Listen for protocol handler events from index.html
    const handlePWAUrlOpened = (event: CustomEvent) => {
      console.log('🔗 PWA URL opened event received:', event.detail.url);
      const result = handleDeepLink(event.detail.url);
      if (result.route && result.route !== window.location.pathname) {
        console.log('🔗 Navigating to protocol handler route:', result.route);
        navigate(result.route, { replace: true });
      }
    };
    
    window.addEventListener('pwa-url-opened', handlePWAUrlOpened as EventListener);
    
    // Attempt auto-open after a short delay to ensure everything is initialized
    const autoOpenTimer = setTimeout(() => {
      autoOpenPWA();
    }, 1000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-url-opened', handlePWAUrlOpened as EventListener);
      clearTimeout(autoOpenTimer);
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

  // Test if protocol handler is actually registered
  const testProtocolHandler = (): Promise<boolean> => {
    return new Promise(async (resolve) => {
      // First check if we're already in PWA mode
      if (isPWA || isStandalone()) {
        resolve(true);
        return;
      }
      
      // Check if running in standalone mode
      if (window.matchMedia('(display-mode: standalone)').matches) {
        resolve(true);
        return;
      }
      
      // Try getInstalledRelatedApps if available
      if ('getInstalledRelatedApps' in navigator) {
        try {
          const relatedApps = await (navigator as any).getInstalledRelatedApps();
          if (relatedApps && relatedApps.length > 0) {
            // Check if our app is in the list
            const ourApp = relatedApps.find((app: any) => 
              app.id === 'buywhatsg_pwa' || 
              app.url?.includes('buywhatsg') ||
              app.platform === 'webapp'
            );
            if (ourApp) {
              resolve(true);
              return;
            }
          }
        } catch (error) {
          console.log('getInstalledRelatedApps not available or failed:', error);
        }
      }
      
      // For protocol handler testing, we need to check if the PWA is actually installed
      // The most reliable way is to check if localStorage indicates installation
      // and if the browser supports protocol handlers
      const isMarkedInstalled = localStorage.getItem('pwa-installed') === 'true';
      
      if (!isMarkedInstalled) {
        resolve(false);
        return;
      }
      
      // Check if protocol handlers are supported
      if (!('registerProtocolHandler' in navigator)) {
        console.log('Protocol handlers not supported in this browser');
        resolve(false);
        return;
      }
      
      // If PWA is marked as installed and protocol handlers are supported,
      // assume the protocol handler is registered
      resolve(true);
    });
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
      
      // Test if protocol handler is actually registered
      console.log('🧪 Testing protocol handler registration...');
      const isProtocolRegistered = await testProtocolHandler();
      
      if (!isProtocolRegistered) {
        console.warn('❌ Protocol handler not registered - PWA may not be truly installed');
        addToast({
          variant: 'warning',
          message: 'App not properly installed. Please reinstall the app from your browser menu.',
          duration: 5000
        });
        // Reset installation status since protocol handler isn't working
        setIsPWAInstalled(false);
        localStorage.removeItem('pwa-installed');
        return;
      }
      
      console.log('✅ Protocol handler is registered');
      
      // Get current path to preserve navigation state
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      // The manifest.json protocol handler expects: web+buywhatsg://path -> /?handler=path
      // So we need to encode the current path as the protocol parameter
      const encodedPath = encodeURIComponent(currentPath);
      const protocolUrl = `web+buywhatsg://${encodedPath}`;
      
      console.log('🔗 Attempting to open with protocol:', protocolUrl);

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