import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppProvider';
import Layout from './components/layout/Layout';
import ListsPage from './components/lists/ListsPage';
import ListDetail from './components/lists/ListDetail';
import MePage from './components/me/MePage';
import ToastContainer from './components/ui/ToastContainer';
import { useToast } from './context/ToastContext';
import './App.css';

// Toast container wrapper that uses the toast context
const ToastWrapper = () => {
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} removeToast={removeToast} />;
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
        <ToastWrapper />
      </Router>
    </AppProvider>
  )
}

export default App
