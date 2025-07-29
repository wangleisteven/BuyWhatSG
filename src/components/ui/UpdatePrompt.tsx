import { useState, useEffect } from 'react';
import { FiRefreshCw, FiX } from 'react-icons/fi';
import './UpdatePrompt.css';

type UpdatePromptProps = {
  updateAvailable: boolean;
  onUpdate: () => void;
};

const UpdatePrompt = ({ updateAvailable, onUpdate }: UpdatePromptProps) => {
  const [show, setShow] = useState(false);
  
  // Show the prompt when update is available
  useEffect(() => {
    if (updateAvailable) {
      setShow(true);
    }
  }, [updateAvailable]);
  
  // Handle update click
  const handleUpdate = () => {
    onUpdate();
    setShow(false);
  };
  
  // Handle dismiss click
  const handleDismiss = () => {
    setShow(false);
  };
  
  if (!show) return null;
  
  return (
    <div className="update-prompt">
      <div className="update-prompt-content">
        <div className="update-prompt-icon">
          <FiRefreshCw size={20} />
        </div>
        <span>New version available!</span>
      </div>
      
      <div className="update-prompt-actions">
        <button 
          className="button-primary button-sm"
          onClick={handleUpdate}
        >
          Update
        </button>
        <button 
          className="update-prompt-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <FiX size={16} />
        </button>
      </div>
    </div>
  );
};

export default UpdatePrompt;