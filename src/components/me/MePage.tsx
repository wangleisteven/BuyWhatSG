import { useState, useEffect } from 'react';
import { FiUser, FiMoon, FiSun, FiLogOut, FiDownload } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { isStandalone } from '../../utils/helpers';
import './Me.css';

const MePage = () => {
  const { user, logout, loginWithGoogle, loading } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  
  // Check if app is already installed as PWA
  const isPWA = isStandalone();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle install PWA
  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setShowInstallPrompt(true);
      setTimeout(() => setShowInstallPrompt(false), 3000);
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  return (
    <div className="me-page">
      <div className="profile-section">
        <div className="profile-icon">
          <FiUser size={40} />
        </div>
        {loading ? (
          <div className="loading-indicator">Loading...</div>
        ) : user ? (
          <>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </>
        ) : (
          <>
            <h2>Guest</h2>
            <p>Not signed in</p>
            <button 
              className="button-primary"
              onClick={() => loginWithGoogle()}
              style={{ marginTop: 'var(--spacing-md)' }}
            >
              Sign In with Google
            </button>
          </>
        )}
      </div>

      <div className="settings-section">
        <h3>Settings</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-icon">
              {darkMode ? <FiMoon /> : <FiSun />}
            </span>
            <span>Dark Mode</span>
          </div>
          <button 
            className="toggle-button"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Disable dark mode' : 'Enable dark mode'}
          >
            <div className={`toggle-slider ${darkMode ? 'active' : ''}`}>
              <div className="toggle-knob"></div>
            </div>
          </button>
        </div>



        {!isPWA && canInstall && (
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-icon">
                <FiDownload />
              </span>
              <span>Install App</span>
            </div>
            <button 
              className="button-primary"
              onClick={handleInstallClick}
            >
              Install
            </button>
          </div>
        )}
      </div>

      {showInstallPrompt && (
        <div className="install-prompt">
          Add this app to your home screen for a better experience!
        </div>
      )}

      {user && (
        <div className="account-section">
          <button 
            className="button-outline danger full-width"
            onClick={() => logout()}
          >
            <FiLogOut /> Sign Out
          </button>
        </div>
      )}

      <div className="app-info">
        <h3>About</h3>
        <p>BuyWhatSG - Shopping List App</p>
        <p>Version 1.0.0</p>
        <p className="copyright">© 2025 BuyWhatSG</p>
      </div>
    </div>
  );
};

export default MePage;