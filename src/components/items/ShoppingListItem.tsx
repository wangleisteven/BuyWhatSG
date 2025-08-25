import { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { useShoppingList } from '../../context/ShoppingListContext';
import type { ShoppingItem } from '../../types';
import { useSwipe } from '../../hooks/useSwipe';
import ConfirmationDialog from '../ui/ConfirmationDialog';
import './Items.css';

type ShoppingListItemProps = {
  item: ShoppingItem;
  listId: string;
  onEdit: () => void;
  isArchived?: boolean;
};

const ShoppingListItem = ({ 
  item, 
  listId, 
  onEdit,
  isArchived = false
}: ShoppingListItemProps) => {
  const { toggleItemCompletion, deleteItem } = useShoppingList();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Handle swipe to delete (disabled for archived lists)
  const { 
    onTouchStart, 
    onTouchMove, 
    onTouchEnd, 
    swipeDirection, 
    swipeDistance,
    resetSwipe 
  } = useSwipe(
    75, // threshold
    isArchived ? undefined : () => setShowDeleteConfirm(true), // onSwipeLeft disabled for archived
    undefined // onSwipeRight
  );
  
  // Handle item completion toggle (disabled for archived lists)
  const handleToggleCompletion = async () => {
    if (isArchived) return; // Prevent completion toggle for archived lists
    
    try {
      await toggleItemCompletion(listId, item.id);
    } catch (error) {
      console.error('Error toggling item completion:', error);
      // Error is already handled in the context with showAlert
    }
  };
  
  // Handle item deletion confirmation
  const handleDeleteConfirm = async () => {
    try {
      await deleteItem(listId, item.id);
      setShowDeleteConfirm(false);
      resetSwipe();
    } catch (error) {
      console.error('Error deleting item:', error);
      // Error is already handled in the context with showAlert
    }
  };

  // Handle delete confirmation cancel
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    resetSwipe();
  };
  
  // Calculate transform style based on swipe
  const getSwipeStyle = () => {
    if (swipeDirection === 'left') {
      return { transform: `translateX(-${swipeDistance}px)` };
    }
    return {};
  };
  
  // Calculate delete button visibility based on swipe
  const getDeleteButtonStyle = () => {
    if (swipeDirection === 'left') {
      const opacity = Math.min(swipeDistance / 75, 1);
      return { 
        opacity,
        width: `${Math.min(swipeDistance, 80)}px`,
        right: 0
      };
    }
    return { opacity: 0, width: 0 };
  };

  return (
    <>
      <div 
        className={`shopping-list-item ${item.completed ? 'completed' : ''} ${isArchived ? 'archived' : ''}`}
        onTouchStart={isArchived ? undefined : onTouchStart}
        onTouchMove={isArchived ? undefined : onTouchMove}
        onTouchEnd={isArchived ? undefined : onTouchEnd}
      >
        <div 
          className="shopping-list-item-content"
          style={isArchived ? {} : getSwipeStyle()}
        >
          {/* Hide checkbox for archived lists */}
          {!isArchived && (
            <div 
              className="shopping-list-item-checkbox"
              onClick={handleToggleCompletion}
            >
              <div className={`checkbox ${item.completed ? 'checked' : ''}`}></div>
            </div>
          )}
          
          <div 
            className="shopping-list-item-details"
            onClick={isArchived ? undefined : onEdit}
            style={isArchived ? { cursor: 'default' } : {}}
          >
            <div className="shopping-list-item-text">
              {item.quantity > 1 && (
                <div className="shopping-list-item-name"><span className="shopping-list-item-quantity">[x {item.quantity}]</span> {item.name}</div>
              )}
              {item.quantity == 1 && (
                <div className="shopping-list-item-name">{item.name}</div>
              )}
            </div>
            
            {/* Thumbnail image */}
            {item.photoURL && (
              <div className="shopping-list-item-thumbnail">
                <img src={item.photoURL} alt={item.name} />
              </div>
            )}
          </div>
          
          {/* Actions removed - edit by tapping item, delete by swiping left */}
        </div>
        
        {/* Delete button that appears when swiping (hidden for archived lists) */}
        {!isArchived && (
          <div 
            className="shopping-list-item-delete-button"
            style={getDeleteButtonStyle()}
            onClick={() => setShowDeleteConfirm(true)}
          >
            <FiTrash2 size={20} />
          </div>
        )}
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

export default ShoppingListItem;