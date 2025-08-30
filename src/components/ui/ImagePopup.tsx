import { useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import './ImagePopup.css';

type ImagePopupProps = {
  imageUrl: string;
  altText: string;
  onClose: () => void;
};

const ImagePopup = ({ imageUrl, altText, onClose }: ImagePopupProps) => {
  // Close popup on Escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Prevent body scroll when popup is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="image-popup-overlay" onClick={onClose}>
      <div className="image-popup-content" onClick={(e) => e.stopPropagation()}>
        <button 
          className="image-popup-close"
          onClick={onClose}
          aria-label="Close image"
        >
          <FiX size={24} />
        </button>
        <div className="image-popup-container">
          <img 
            src={imageUrl} 
            alt={altText}
            className="image-popup-image"
          />
        </div>
      </div>
    </div>
  );
};

export default ImagePopup;