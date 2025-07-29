import { useState, useEffect } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';
import { isStandalone } from '../../utils/helpers';
import './InstallPrompt.css';

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Check if app is already installed as PWA
  const isPWA = isStandalone();
  
  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install prompt after a delay
      setTimeout(() => {
        if (!localStorage.getItem('installPromptDismissed')) {
          setShowPrompt(true);
        }
      }, 3000);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  // Handle install button click
  const handleInstall = () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      // Clear the saved prompt
      setDeferredPrompt(null);
      setShowPrompt(false);
    });
  };
  
  // Handle dismiss button click
  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };
  
  // Don't show if already installed or no prompt available
  if (isPWA || !showPrompt) return null;
  
  return (
    <div className="install-prompt-container">
      <div className="install-prompt-content">
        <div className="install-prompt-icon">
          <FiDownload size={24} />
        </div>
        <div className="install-prompt-text">
          <h3>Install BuyWhatSG</h3>
          <p>Add to home screen for a better experience!</p>
        </div>
      </div>
      <div className="install-prompt-actions">
        <button 
          className="button-primary"
          onClick={handleInstall}
        >
          Install
        </button>
        <button 
          className="install-prompt-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <FiX size={20} />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;