import { useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { FiX, FiCamera } from 'react-icons/fi';
import { useShoppingList } from '../../context/ShoppingListContext';
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

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      // Create a data URL for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoURL(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
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
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
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
    </div>
  );
};

export default AddItemForm;