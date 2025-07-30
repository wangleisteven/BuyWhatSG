import type { ReactNode } from 'react';
import { ThemeProvider } from './ThemeContext';
import { AuthProvider } from './AuthContext';
import { ShoppingListProvider } from './ShoppingListContext';
import { NotificationProvider } from './NotificationContext';
import { ToastProvider } from './ToastContext';
import { AlertProvider } from './AlertContext';

type AppProviderProps = {
  children: ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <AlertProvider>
              <ShoppingListProvider>
                {children}
              </ShoppingListProvider>
            </AlertProvider>
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};