import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppProvider';
import Layout from './components/layout/Layout';
import ListsPage from './components/lists/ListsPage';
import ListDetail from './components/lists/ListDetail';
import MePage from './components/me/MePage';
import { NotificationContainer } from './components/ui/NotificationSystem';
import { useNotificationSystem } from './context/NotificationSystemContext';
import './App.css';

// Notification container wrapper that uses the unified notification system
const NotificationWrapper = () => {
  const { notifications, removeNotification } = useNotificationSystem();
  return <NotificationContainer notifications={notifications} removeNotification={removeNotification} />;
};

function App() {
  return (
    <AppProvider>
      <Router>
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
      </Router>
    </AppProvider>
  )
}

export default App
