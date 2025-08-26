/**
 * Consolidated utility functions for the application
 */

// Date and Time Utilities
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-SG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Array and Object Utilities
export const groupByCategory = <T extends { category: string }>(
  items: T[]
): Record<string, T[]> => {
  return items.reduce((acc, item) => {
    const category = item.category || 'uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, T[]>);
};

// Function Utilities
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
};

// PWA Utilities
export const isStandalone = (): boolean => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
};

// String Utilities
export const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const truncate = (str: string, length: number): string => {
  return str.length <= length ? str : str.slice(0, length) + '...';
};

// Image Processing Utilities
export const compressImage = async (
  file: File,
  maxSizeBytes: number = 1024 * 1024, // 1MB
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      const maxDimension = 1200; // Max width or height
      
      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      // Try different quality levels until we get under the size limit
      let currentQuality = quality;
      let dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
      
      while (getDataUrlSize(dataUrl) > maxSizeBytes && currentQuality > 0.1) {
        currentQuality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
      }
      
      resolve(dataUrl);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

export const getDataUrlSize = (dataUrl: string): number => {
  return Math.round((dataUrl.length * 3) / 4);
};

export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

// Manifest Utilities
export const generateManifestForDomain = () => {
  const currentOrigin = window.location.origin;
  
  return {
    name: "BuyWhatSG - Shopping List App",
    short_name: "BuyWhatSG",
    description: "A simple shopping list app to help you organize your shopping",
    start_url: `${currentOrigin}/`,
    scope: `${currentOrigin}/`,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#4caf50",
    icons: [
      {
        src: `${currentOrigin}/apple-touch-icon.svg`,
        sizes: "180x180",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: `${currentOrigin}/masked-icon.svg`,
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable"
      },
      {
        src: `${currentOrigin}/pwa-192x192.svg`,
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: `${currentOrigin}/pwa-512x512.svg`,
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any"
      }
    ],
    categories: ["shopping", "productivity", "lifestyle"],
    lang: "en-SG",
    dir: "ltr"
  };
};

export const updateManifestForCurrentDomain = () => {
  const manifest = generateManifestForDomain();
  const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], {
    type: 'application/json'
  });
  const manifestURL = URL.createObjectURL(manifestBlob);
  
  // Update or create manifest link
  let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }
  manifestLink.href = manifestURL;
};

// Deep Link Utilities
export const handleDeepLink = (url: string): { route: string; params?: Record<string, string> } => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const searchParams = Object.fromEntries(urlObj.searchParams.entries());
    
    // Handle different deep link patterns
    if (pathname.startsWith('/list/')) {
      const listId = pathname.split('/list/')[1];
      return { route: `/list/${listId}`, params: { listId, ...searchParams } };
    }
    
    if (pathname === '/me') {
      return { route: '/me', params: searchParams };
    }
    
    // Default to home
    return { route: '/', params: searchParams };
  } catch (error) {
    console.error('Failed to parse deep link:', error);
    return { route: '/' };
  }
};

export const createShareableLink = (listId: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/?list=${listId}`;
};

// Deep Link Handler Utilities
export const registerUrlHandler = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'URL_OPENED') {
        console.log('URL opened in PWA:', event.data.url);
        // Handle the URL opening in the PWA
        handleDeepLink(event.data.url);
      }
    });
  }
};

export const markPWAAsInstalled = () => {
  localStorage.setItem('pwa-installed', 'true');
};

export const showOpenInAppPrompt = async (addToast?: (toast: { variant: 'success' | 'error' | 'warning' | 'info'; message: string; duration?: number; title?: string; action?: string; onAction?: () => void; isModal?: boolean; confirmText?: string; cancelText?: string; onConfirm?: () => void; onCancel?: () => void; }) => string) => {
  // Check if PWA is installed and we're running in browser
  const isPWAInstalled = localStorage.getItem('pwa-installed') === 'true';
  const isRunningInBrowser = !isStandalone();
  
  // Check if we should skip retry today
  const today = new Date().toDateString();
  const lastFailedDate = localStorage.getItem('pwa-redirect-failed-date');
  
  if (lastFailedDate === today) {
    // Already failed today, don't retry
    return;
  }
  
  if (isPWAInstalled && isRunningInBrowser) {
    // For iOS Safari, we can't directly launch the PWA
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      // Show a toast notification if available, otherwise log to console
      if (addToast) {
        addToast({
          variant: 'info',
          message: 'Please use the BuyWhatSG app icon on your home screen for the best experience.',
          duration: 5000
        });
      } else {
        console.log('PWA detected on iOS - user should use home screen app icon');
      }
      return;
    }
    
    // For other platforms, try to redirect to PWA
    try {
      // Get current path to preserve navigation state
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      
      // Try to use the custom protocol handler with proper format
      const protocolUrl = `web+buywhatsg://${currentPath.startsWith('/') ? currentPath.slice(1) : currentPath}`;
      
      // Set a flag to detect if redirection worked
      let redirectWorked = false;
      let timeoutId: NodeJS.Timeout;
      
      // Clean up function
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('blur', handleBlur);
      };
      
      // Listen for page visibility change to detect if app opened
      const handleVisibilityChange = () => {
        if (document.hidden && !redirectWorked) {
          // Page became hidden, likely due to app opening
          redirectWorked = true;
          cleanup();
          console.log('PWA appears to have opened successfully');
        }
      };
      
      // Listen for window blur as additional detection
      const handleBlur = () => {
        if (!redirectWorked) {
          // Window lost focus, might indicate app opening
          setTimeout(() => {
            // Check if we're still blurred after a short delay
            if (document.hidden || !document.hasFocus()) {
              redirectWorked = true;
              cleanup();
              console.log('PWA appears to have opened successfully (blur detection)');
            }
          }, 100);
        }
      };
      
      // Set up event listeners
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleBlur);
      
      // Set timeout to mark as failed if no successful detection
      timeoutId = setTimeout(() => {
        if (!redirectWorked) {
          cleanup();
          localStorage.setItem('pwa-redirect-failed-date', today);
          console.log('PWA protocol handler failed, will not retry today');
          
          // Show fallback toast if available
          if (addToast) {
            addToast({
              variant: 'info',
              message: 'Unable to open the app. Please use the app icon on your home screen.',
              duration: 4000
            });
          }
        }
      }, 3000); // Increased timeout to 3 seconds
      
      // Try to open with protocol handler
      try {
        window.location.href = protocolUrl;
      } catch (error) {
        // If the protocol handler fails immediately
        cleanup();
        throw error;
      }
      
    } catch (error) {
      console.log('Could not redirect to PWA:', error);
      // Mark as failed for today
      localStorage.setItem('pwa-redirect-failed-date', today);
    }
  }
};