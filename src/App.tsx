import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppProvider';
import { PWAProvider } from './context/PWAContext';
import Layout from './components/layout/Layout';
import ListsPage from './components/lists/ListsPage';
import ListDetail from './components/lists/ListDetail';
import MePage from './components/me/MePage';
import { NotificationContainer } from './components/ui/NotificationSystem';
import { useNotificationSystem } from './context/NotificationSystemContext';
import OnboardingModal from './components/onboarding/OnboardingModal';
import { safeLocalStorage } from './utils/errorHandling';
import './App.css';

// Notification container wrapper that uses the unified notification system
const NotificationWrapper = () => {
  const { notifications, removeNotification } = useNotificationSystem();
  return <NotificationContainer notifications={notifications} removeNotification={removeNotification} />;
};

function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const onboardingCompleted = safeLocalStorage.getItem('onboarding_completed');
    if (!onboardingCompleted) {
      // Small delay to ensure app is fully loaded
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
  };

  return (
    <Router>
      <AppProvider>
        <PWAProvider>
          <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/lists" replace />} />
            <Route path="/lists" element={<ListsPage />} />
            <Route path="/list/:listId" element={<ListDetail />} />
            <Route path="/me" element={<MePage />} />
            <Route path="*" element={<Navigate to="/lists" replace />} />
          </Routes>
          </Layout>
          <NotificationWrapper />
          <OnboardingModal 
            isOpen={showOnboarding} 
            onClose={handleCloseOnboarding} 
          />
        </PWAProvider>
      </AppProvider>
    </Router>
  )
}

export default App
