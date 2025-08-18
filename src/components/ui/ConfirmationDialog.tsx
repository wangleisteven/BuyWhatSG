import { FiX } from 'react-icons/fi';
import { FiTrash2 } from "react-icons/fi";
import './ConfirmationDialog.css';

type ConfirmationDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'danger' | 'info';
};

const ConfirmationDialog = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'warning'
}: ConfirmationDialogProps) => {
  if (!isOpen) return null;

  return (
    <div className="confirmation-dialog-overlay" onClick={onCancel}>
      <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-dialog-header">
          <div className="confirmation-dialog-title-section">
            <div className={`confirmation-dialog-icon ${type}`}>
              <FiTrash2 size={20} />
            </div>
            <h3 className="confirmation-dialog-title">{title}</h3>
          </div>
          <button className="confirmation-dialog-close" onClick={onCancel}>
            <FiX size={20} />
          </button>
        </div>
        
        <div className="confirmation-dialog-content">
          <p className="confirmation-dialog-message">{message}</p>
        </div>
        
        <div className="confirmation-dialog-actions">
          <button 
            className="confirmation-dialog-button cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className={`confirmation-dialog-button confirm ${type}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;