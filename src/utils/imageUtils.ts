/**
 * Utility functions for image processing
 */

/**
 * Compress an image file to be under the specified size limit
 * @param file - The image file to compress
 * @param maxSizeBytes - Maximum size in bytes (default: 1MB)
 * @param quality - Compression quality (0-1, default: 0.8)
 * @returns Promise<string> - Base64 data URL of compressed image
 */
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
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Try different quality levels until we get under the size limit
      let currentQuality = quality;
      let compressedDataUrl: string;
      
      const tryCompress = () => {
        compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
        
        // Convert data URL to approximate byte size
        const base64Length = compressedDataUrl.split(',')[1].length;
        const sizeInBytes = (base64Length * 3) / 4;
        
        if (sizeInBytes <= maxSizeBytes || currentQuality <= 0.1) {
          resolve(compressedDataUrl);
        } else {
          currentQuality -= 0.1;
          tryCompress();
        }
      };
      
      tryCompress();
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    // Create object URL for the image
    const objectUrl = URL.createObjectURL(file);
    
    // Store the original onload handler
    const originalOnload = img.onload;
    
    // Override onload to clean up object URL
    img.onload = (event) => {
      URL.revokeObjectURL(objectUrl);
      if (originalOnload) {
        originalOnload.call(img, event);
      }
    };
    
    img.src = objectUrl;
  });
};

/**
 * Get the size of a base64 data URL in bytes
 * @param dataUrl - Base64 data URL
 * @returns Size in bytes
 */
export const getDataUrlSize = (dataUrl: string): number => {
  const base64Length = dataUrl.split(',')[1].length;
  return (base64Length * 3) / 4;
};

/**
 * Check if a file is an image
 * @param file - File to check
 * @returns boolean
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};