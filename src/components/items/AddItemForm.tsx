import { useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { FiX, FiCamera } from 'react-icons/fi';
import { useShoppingList } from '../../context/ShoppingListContext';
import { compressImage, getDataUrlSize, isImageFile } from '../../utils/imageUtils';
import Toast from '../ui/Toast';
import './Items.css';

type AddItemFormProps = {
  listId: string;
  onClose: () => void;
};

const AddItemForm = ({ listId, onClose }: AddItemFormProps) => {
  const { addItem } = useShoppingList();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState('default');
  const [photoURL, setPhotoURL] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Common categories for shopping items
  const categories = [
    { id: 'default', name: 'General' },
    { id: 'produce', name: 'Produce' },
    { id: 'dairy', name: 'Dairy' },
    { id: 'meat', name: 'Meat' },
    { id: 'bakery', name: 'Bakery' },
    { id: 'frozen', name: 'Frozen' },
    { id: 'pantry', name: 'Pantry' },
    { id: 'beverages', name: 'Beverages' },
    { id: 'household', name: 'Household' },
    { id: 'personal', name: 'Personal Care' },
  ];
  
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
      setCategory('default');
      
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
      setErrorMessage('Please select a valid image file.');
      setShowErrorToast(true);
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size must be less than 5MB. Please choose a smaller photo.');
      setShowErrorToast(true);
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
      setErrorMessage('Failed to process photo. Please try again.');
      setShowErrorToast(true);
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
          {/* Photo upload section */}
          <div className="photo-upload-section">
            {photoURL ? (
              <div className="photo-preview">
                <img src={photoURL} alt={name} />
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

              <div className="form-group">
                <label htmlFor="item-name">Item Name</label>
                <input
                  id="item-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter item name"
                  autoFocus
                  required
                />
              </div>
          
          <div className="form-group">
            <label htmlFor="item-quantity">Quantity</label>
            <input
              id="item-quantity"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={quantity.toString()}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^[1-9][0-9]*$/.test(value)) {
                  setQuantity(value === '' ? 1 : parseInt(value));
                }
              }}
              onBlur={(e) => {
                if (e.target.value === '' || parseInt(e.target.value) < 1) {
                  setQuantity(1);
                }
              }}
              placeholder="1"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="item-category">Category</label>
            <select
              id="item-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
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
      
      {/* Error toast */}
      {showErrorToast && (
        <Toast
          message={errorMessage}
          type="error"
          onClose={() => setShowErrorToast(false)}
        />
      )}
    </div>
  );
};

export default AddItemForm;