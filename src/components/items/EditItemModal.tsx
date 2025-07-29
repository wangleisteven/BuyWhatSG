import { useState, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { FiX, FiCamera } from 'react-icons/fi';
import { useShoppingList } from '../../context/ShoppingListContext';
import type { ShoppingItem } from '../../types/shopping';
import './Items.css';

type EditItemModalProps = {
  item: ShoppingItem;
  listId: string;
  onClose: () => void;
};

const EditItemModal = ({ item, listId, onClose }: EditItemModalProps) => {
  const { updateItem, deleteItem } = useShoppingList();
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [category, setCategory] = useState(item.category);
  const [photoURL, setPhotoURL] = useState(item.photoURL || '');
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
  
  // Handle item deletion
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteItem(listId, item.id);
        onClose();
      } catch (error) {
        console.error('Error deleting item:', error);
        // Error is already handled in the context with showAlert
      }
    }
  };
  
  // Handle photo upload
  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Maximum size is 5MB.');
      return;
    }
    
    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoURL(event.target?.result as string);
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert('Failed to read file.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle photo removal
  const handleRemovePhoto = () => {
    setPhotoURL('');
  };

  return (
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
            <label htmlFor="edit-item-name">Item Name</label>
            <input
              id="edit-item-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter item name"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="edit-item-quantity">Quantity</label>
            <input
              id="edit-item-quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="edit-item-category">Category</label>
            <select
              id="edit-item-category"
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
              className="button-outline danger"
              onClick={handleDelete}
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
  );
};

export default EditItemModal;