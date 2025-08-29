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
          // Auto-open the installed PWA
          autoOpenInstalledApp();
        }
      });
    } else if (isStandalone()) {
      setIsPWAInstalled(true);
    } else if (localStorage.getItem('pwa-installed') === 'true') {
      // If marked as installed, try to auto-open
      autoOpenInstalledApp();
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

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-url-opened', handlePWAUrlOpened as EventListener);
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

  // Auto-open installed PWA function
  const autoOpenInstalledApp = async (): Promise<void> => {
    console.log('🔄 Auto-opening installed PWA...');
    console.log('📱 PWA installed:', isPWAInstalled);
    console.log('🌐 Running in browser:', !isPWA);
    console.log('📍 Current URL:', window.location.href);
    
    // Don't auto-open if already in PWA mode
    if (isPWA) {
      console.log('✅ Already running in PWA mode');
      return;
    }

    // Don't auto-open if not marked as installed
    if (!isPWAInstalled && localStorage.getItem('pwa-installed') !== 'true') {
      console.log('❌ PWA not marked as installed');
      return;
    }

    try {
      // For iOS Safari, don't auto-open as it's not reliable
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        console.log('🍎 iOS detected - skipping auto-open');
        return;
      }
      
      // Test if protocol handler is actually registered
      console.log('🧪 Testing protocol handler registration...');
      const isProtocolRegistered = await testProtocolHandler();
      
      if (!isProtocolRegistered) {
        console.warn('❌ Protocol handler not registered - skipping auto-open');
        return;
      }
      
      // Get current path to preserve navigation state
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      // Remove leading slash to avoid double slashes in the protocol URL
      const cleanPath = currentPath.startsWith('/') ? currentPath.substring(1) : currentPath;
      const protocolUrl = `web+buywhatsg://${cleanPath}`;
      
      console.log('🔗 Auto-opening with protocol:', protocolUrl);
      
      // Try to open with protocol handler (no user feedback for auto-open)
      window.location.href = protocolUrl;
      
    } catch (error) {
      console.error('❌ Error auto-opening app:', error);
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
      
      // Try getInstalledRelatedApps if available (Chrome only)
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
      
      // Check if protocol handlers are supported
      if (!('registerProtocolHandler' in navigator)) {
        console.log('Protocol handlers not supported in this browser');
        resolve(false);
        return;
      }
      
      // For browsers that support protocol handlers, we need to be more conservative
      // Protocol handlers only work when the PWA is actually installed via the browser
      // Not just when we mark it as installed in localStorage
      
      // Check if we have a beforeinstallprompt event available
      // If we do, it means the PWA is not yet installed
      if (deferredPrompt || canInstall) {
        console.log('PWA not installed - beforeinstallprompt still available');
        resolve(false);
        return;
      }
      
      // If no install prompt is available and we're not in standalone mode,
      // it could mean the PWA was installed but we're running in a browser tab
      // In this case, we should test the protocol handler more carefully
      const isMarkedInstalled = localStorage.getItem('pwa-installed') === 'true';
      
      if (!isMarkedInstalled) {
        resolve(false);
        return;
      }
      
      // If marked as installed but we can't verify it's actually installed,
      // we should be conservative and assume it's not properly installed
      resolve(false);
    });
  };



  const value: PWAContextType = {
    deferredPrompt,
    canInstall,
    isPWA,
    showInstallPrompt,
    isPWAInstalled,
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
};