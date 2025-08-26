import type { ReactNode } from 'react';
import { ThemeProvider } from './ThemeContext';
import { AuthProvider } from './AuthContext';
import { ShoppingListProvider } from './ShoppingListContext';
import { NotificationProvider } from './NotificationContext';
import { NotificationProvider as NotificationSystemProvider } from './NotificationSystemContext';
import { PWAProvider } from './PWAContext';

type AppProviderProps = {
  children: ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {
  return (
    <ThemeProvider>
      <NotificationSystemProvider>
        <PWAProvider>
          <AuthProvider>
            <NotificationProvider>
              <ShoppingListProvider>
                {children}
              </ShoppingListProvider>
            </NotificationProvider>
          </AuthProvider>
        </PWAProvider>
      </NotificationSystemProvider>
    </ThemeProvider>
  );
};