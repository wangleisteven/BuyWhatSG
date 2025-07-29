import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import Alert from '../components/ui/Alert';

type AlertType = 'info' | 'success' | 'warning' | 'error';

type AlertOptions = {
  type?: AlertType;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
};

type AlertContextType = {
  showAlert: (options: AlertOptions) => Promise<boolean>;
  showConfirm: (options: AlertOptions) => Promise<boolean>;
  hideAlert: () => void;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

type AlertState = {
  isVisible: boolean;
  options: AlertOptions;
  resolve?: (value: boolean) => void;
  isConfirm: boolean;
};

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alertState, setAlertState] = useState<AlertState>({
    isVisible: false,
    options: { message: '' },
    isConfirm: false
  });

  const showAlert = (options: AlertOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setAlertState({
        isVisible: true,
        options,
        resolve,
        isConfirm: false
      });
    });
  };

  const showConfirm = (options: AlertOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setAlertState({
        isVisible: true,
        options,
        resolve,
        isConfirm: true
      });
    });
  };

  const hideAlert = () => {
    setAlertState(prev => ({
      ...prev,
      isVisible: false
    }));
  };

  const handleConfirm = () => {
    if (alertState.resolve) {
      alertState.resolve(true);
    }
    hideAlert();
  };

  const handleCancel = () => {
    if (alertState.resolve) {
      alertState.resolve(false);
    }
    hideAlert();
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, hideAlert }}>
      {children}
      {alertState.isVisible && (
        <Alert
          type={alertState.options.type}
          title={alertState.options.title}
          message={alertState.options.message}
          confirmText={alertState.options.confirmText}
          cancelText={alertState.options.cancelText}
          onConfirm={handleConfirm}
          onCancel={alertState.isConfirm ? handleCancel : undefined}
        />
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};