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
    
    // Handle protocol handler requests (/?handler=encodedPath)
    if (pathname === '/' && searchParams.handler) {
      try {
        const decodedPath = decodeURIComponent(searchParams.handler);
        console.log('🔗 Protocol handler received:', searchParams.handler, '-> decoded:', decodedPath);
        
        // Parse the decoded path
        const decodedUrl = new URL(decodedPath, window.location.origin);
        const decodedPathname = decodedUrl.pathname;
        const decodedSearchParams = Object.fromEntries(decodedUrl.searchParams.entries());
        
        // Handle different deep link patterns from decoded path
        if (decodedPathname.startsWith('/list/')) {
          const listId = decodedPathname.split('/list/')[1];
          return { route: `/list/${listId}`, params: { listId, ...decodedSearchParams } };
        }
        
        if (decodedPathname === '/me') {
          return { route: '/me', params: decodedSearchParams };
        }
        
        // Return the decoded path, defaulting to /lists if root
        const finalRoute = decodedPathname === '/' ? '/lists' : (decodedPathname || '/lists');
        return { route: finalRoute, params: decodedSearchParams };
      } catch (decodeError) {
        console.error('Failed to decode protocol handler path:', decodeError);
        // Fall through to normal handling
      }
    }
    
    // Handle normal deep link patterns
    if (pathname.startsWith('/list/')) {
      const listId = pathname.split('/list/')[1];
      return { route: `/list/${listId}`, params: { listId, ...searchParams } };
    }
    
    if (pathname === '/me') {
      return { route: '/me', params: searchParams };
    }
    
    // Default to lists page
    return { route: '/lists', params: searchParams };
  } catch (error) {
    console.error('Failed to parse deep link:', error);
    return { route: '/lists' };
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
