// Define types for toast notifications
export type ToastData = {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: string;
  onAction?: () => void;
};