import { useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { FiX, FiCamera } from 'react-icons/fi';
import { useShoppingList } from '../../context/ShoppingListContext';
import { compressImage, isImageFile } from '../../utils';
import { recommendCategoryAsync } from '../../utils/categoryClassifier';
import { useToast } from '../../context/NotificationSystemContext';
import CategoryTags from '../ui/CategoryTags';
import QuantityInput from '../ui/QuantityInput';

import './Items.css';

type AddItemFormProps = {
  listId: string;
  onClose: () => void;
};

const AddItemForm = ({ listId, onClose }: AddItemFormProps) => {
  const { addItem } = useShoppingList();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState('general');
  const [photoURL, setPhotoURL] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { addToast } = useToast();
  // const [errorMessage, setErrorMessage] = useState(''); // Commented out as not currently used
  
  // Handle auto-recommendation when item name loses focus
  const handleItemNameBlur = async () => {
    if (name.trim()) {
      try {
        const recommendedCategory = await recommendCategoryAsync(name.trim());
        setCategory(recommendedCategory);
      } catch (error) {
        console.error('Failed to get category recommendation:', error);
        // Keep current category on error
      }
    }
  };

  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (name.trim() === '') return;
    
    try {
      await addItem(listId, {
        name: name.trim(),
        quantity,
        category,
        completed: false,
        photoURL: photoURL || undefined
      });
      
      // Reset form
      setName('');
      setQuantity(1);
      setCategory('general');
      
      // Close form
      onClose();
    } catch (error) {
      console.error('Error adding item:', error);
      // Error is already handled in the context with showAlert
    }
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image file
    if (!isImageFile(file)) {
      addToast({ message: 'Please select a valid image file.', type: 'error' });
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast({ message: 'File size must be less than 5MB. Please choose a smaller photo.', type: 'error' });
      return;
    }

    setIsUploading(true);
    try {
      let finalDataUrl: string;
      
      // If file is larger than 1MB, compress it
      if (file.size > 1024 * 1024) {
        finalDataUrl = await compressImage(file, 1024 * 1024, 0.8);
      } else {
        // File is already under 1MB, convert to data URL directly
        finalDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve(event.target?.result as string);
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
      }
      
      setPhotoURL(finalDataUrl);
    } catch (error) {
      console.error('Error processing photo:', error);
      addToast({ message: 'Failed to process photo. Please try again.', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoURL('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add New Item</h3>
          <button 
            className="button-icon-small"
            onClick={onClose}
            aria-label="Close form"
          >
            <FiX size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="edit-item-form">
          <div className="form-group-horizontal">
            <div className="form-field">
              <label htmlFor="item-name">Item Name</label>
              <input
                id="item-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleItemNameBlur}
                placeholder="Enter item name"
                autoFocus
                required
              />
            </div>
            
            <div className="form-field form-field-quantity">
              <label htmlFor="item-quantity">Quantity</label>
              <QuantityInput
                id="item-quantity"
                value={quantity}
                onChange={setQuantity}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Category</label>
            <CategoryTags
              value={category}
              onChange={setCategory}
            />
          </div>

          {/* Photo upload section */}
          <div className="photo-upload-section">
            {photoURL ? (
              <div className="photo-preview">
                <img 
                  src={photoURL} 
                  alt={name}
                />
                <button 
                  type="button"
                  className="button-icon-small remove-photo"
                  onClick={handleRemovePhoto}
                  aria-label="Remove photo"
                >
                  <FiX size={20} />
                </button>
              </div>
            ) : (
              <div className="photo-upload">
                <label htmlFor="photo-upload" className="photo-upload-label">
                  <FiCamera size={24} />
                  <span>{isUploading ? 'Uploading...' : 'Add Photo'}</span>
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={isUploading}
                  className="photo-upload-input"
                />
              </div>
            )}
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="button-outline"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="button-primary"
              disabled={name.trim() === ''}
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
      

    </div>
  );
};

export default AddItemForm;