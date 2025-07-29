import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import BottomNavigation from './BottomNavigation';
import OfflineIndicator from '../ui/OfflineIndicator';
import InstallPrompt from '../ui/InstallPrompt';
import './Layout.css';

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  
  // Determine if we're on a page that should show the header
  const showHeader = !location.pathname.includes('/auth') && 
                     location.pathname !== '/lists' && 
                     location.pathname !== '/me';
  
  // Determine if we're on a page that should show the bottom navigation
  const showBottomNav = !location.pathname.includes('/auth');

  return (
    <div className="layout">
      {showHeader && <Header />}
      
      <main className={showHeader ? 'main-content-list-detail' : 'main-content'}>
        {children}
      </main>
      
      {showBottomNav && <BottomNavigation />}
      
      <OfflineIndicator />
      <InstallPrompt />
    </div>
  );
};

export default Layout;