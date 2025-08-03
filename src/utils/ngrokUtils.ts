// Utility functions for ngrok compatibility

// Add ngrok-skip-browser-warning header to requests
export const addNgrokHeaders = () => {
  // Add header to all fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    
    // Add ngrok skip warning header
    if (window.location.hostname.includes('ngrok-free.app')) {
      headers.set('ngrok-skip-browser-warning', 'true');
    }
    
    return originalFetch(input, {
      ...init,
      headers
    });
  };
};

// Check if running on ngrok and apply necessary configurations
export const configureForNgrok = () => {
  if (window.location.hostname.includes('ngrok-free.app')) {
    console.log('Configuring for ngrok environment');
    
    // Add ngrok headers
    addNgrokHeaders();
    
    // Ensure HTTPS is properly handled
    if (window.location.protocol !== 'https:') {
      console.warn('PWA requires HTTPS. Ngrok should provide HTTPS by default.');
    }
    
    return true;
  }
  return false;
};

// Force service worker registration for ngrok
export const ensureServiceWorkerForNgrok = async () => {
  if ('serviceWorker' in navigator && window.location.hostname.includes('ngrok-free.app')) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        console.log('Service worker not found on ngrok, attempting to register...');
        // The VitePWA plugin should handle this, but we can check
        const swUrl = '/sw.js';
        await navigator.serviceWorker.register(swUrl);
        console.log('Service worker registered for ngrok');
      }
    } catch (error) {
      console.error('Failed to register service worker on ngrok:', error);
    }
  }
};