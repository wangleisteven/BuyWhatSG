import { useState, useEffect } from 'react';
import { FiX } from "react-icons/fi";
import { usePWA } from '../../context/PWAContext';
import './InstallPrompt.css';

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const { canInstall, isPWA, showInstallPrompt } = usePWA();
  
  // Show the install prompt after a delay when it becomes available
  useEffect(() => {
    if (canInstall && !localStorage.getItem('installPromptDismissed')) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [canInstall]);
  
  // Handle install button click
  const handleInstall = async () => {
    if (!canInstall) return;
    
    try {
      await showInstallPrompt();
      setShowPrompt(false);
    } catch (error) {
      console.error('Failed to show install prompt:', error);
    }
  };
  
  // Handle dismiss button click
  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };
  
  // Don't show if already installed, no prompt available, or not ready to install
  if (isPWA || !showPrompt || !canInstall) return null;
  
  return (
    <div className="install-prompt-container">
      <div className="install-prompt-content">
        
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
          ×
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;