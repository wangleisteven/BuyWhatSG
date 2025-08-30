import { useState, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { FiX, FiCamera } from 'react-icons/fi';
import { useShoppingList } from '../../context/ShoppingListContext';
import type { ShoppingItem } from '../../types';
import { compressImage, isImageFile } from '../../utils';
import { recommendCategoryAsync } from '../../utils/categoryClassifier';
import { useToast } from '../../context/NotificationSystemContext';
import CategoryTags from '../ui/CategoryTags';
import ConfirmationDialog from '../ui/ConfirmationDialog';
import QuantityInput from '../ui/QuantityInput';

import './Items.css';

type EditItemModalProps = {
  item: ShoppingItem;
  listId: string;
  onClose: () => void;
};
const EditItemModal = ({ item, listId, onClose }: EditItemModalProps) => {
  const { updateItem, deleteItem } = useShoppingList();
  const { addToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [category, setCategory] = useState(item.category);
  const [photoURL, setPhotoURL] = useState(item.photoURL || '');
  const [isUploading, setIsUploading] = useState(false);

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

  
  // Update state when item changes
  useEffect(() => {
    setName(item.name);
    setQuantity(item.quantity);
    setCategory(item.category);
    setPhotoURL(item.photoURL || '');
  }, [item]);
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (name.trim() === '') return;
    
    try {
      await updateItem(listId, item.id, {
        name: name.trim(),
        quantity,
        category,
        photoURL: photoURL || undefined,
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating item:', error);
      // Error is already handled in the context with showAlert
    }
  };
  
  // Handle item deletion confirmation
  const handleDeleteConfirm = async () => {
    try {
      await deleteItem(listId, item.id);
      setShowDeleteConfirm(false);
      onClose(); // Dismiss the popup
    } catch (error) {
      console.error('Error deleting item:', error);
      // Error is already handled in the context with showAlert
    }
  };

  // Handle delete confirmation cancel
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };
  
  // Handle photo upload
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
  
  // Handle photo removal
  const handleRemovePhoto = () => {
    setPhotoURL('');
  };

  return (
    <>
      <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Edit Item</h3>
          <button 
            className="button-icon-small"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FiX size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="edit-item-form">
          <div className="form-group-horizontal">
            <div className="form-field">
              <label htmlFor="edit-item-name">Item Name</label>
              <input
                id="edit-item-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleItemNameBlur}
                placeholder="Enter item name"
                required
              />
            </div>
            
            <div className="form-field form-field-quantity">
              <label htmlFor="edit-item-quantity">Quantity</label>
              <QuantityInput
                id="edit-item-quantity"
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
              className="button-outline danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </button>
            <div>
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
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
      

      </div>
      

      
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Delete Item"
        message={`Are you sure you want to delete "${item.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
};

export default EditItemModal;