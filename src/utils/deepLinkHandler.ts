// Deep link handler for PWA

// Handle URL interception when app is installed
export const handleDeepLink = () => {
  // Check if app is running in standalone mode (installed)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true;

  if (isStandalone) {
    console.log('App is running in standalone mode');
    
    // Handle any special URL parameters or routing
    const urlParams = new URLSearchParams(window.location.search);
    const handler = urlParams.get('handler');
    
    if (handler) {
      console.log('Deep link handler:', handler);
      // Handle specific deep link actions here
    }
  }
};

// Register URL handler for installed PWA
export const registerUrlHandler = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'URL_OPENED') {
        console.log('URL opened in PWA:', event.data.url);
        // Handle the URL opening in the PWA
        handleDeepLink();
      }
    });
  }
};

// Check if the current page should be handled by the installed app
export const shouldRedirectToApp = (): boolean => {
  // Don't redirect if already in standalone mode
  if (window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true) {
    return false;
  }

  // Check if PWA is installed (this is a heuristic)
  const isInstalled = localStorage.getItem('pwa-installed') === 'true';
  
  return isInstalled;
};

// Mark PWA as installed
export const markPWAAsInstalled = () => {
  localStorage.setItem('pwa-installed', 'true');
};

// Show prompt to open in app if installed
export const showOpenInAppPrompt = () => {
  if (shouldRedirectToApp()) {
      const appUrl = `web+buywhatsg://${window.location.pathname}${window.location.search}`;
      window.location.href = appUrl;
  }
};