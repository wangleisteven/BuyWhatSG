// Consolidated type definitions for the application

// Shopping List Types
export type ShoppingItem = {
  id: string;
  name: string;
  quantity: number;
  completed: boolean;
  category: string;
  photoURL?: string;
  position: number;
  updatedAt?: number;
  firestoreId?: string; // ID of the document in Firestore, may be different from local id
  deleted?: boolean; // Soft deletion flag
};

export type ShoppingList = {
  id: string;
  name: string;
  items: ShoppingItem[];
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
  deleted?: boolean; // Soft deletion flag
};

// Toast Notification Types
export type ToastData = {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: string;
  onAction?: () => void;
};

// Alert Types
export type AlertType = 'info' | 'success' | 'warning' | 'error';

export type AlertOptions = {
  type?: AlertType;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
};

// Geolocation Types
export type GeolocationPosition = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export type FairPriceStore = {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  hours: string;
};

// API Service Types
export type GeminiItem = {
  name: string;
  quantity: number;
};

export type GeminiResponse = {
  items: GeminiItem[];
};

// Theme Types
export type Theme = 'light' | 'dark' | 'system';

// PWA Types
export type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
};