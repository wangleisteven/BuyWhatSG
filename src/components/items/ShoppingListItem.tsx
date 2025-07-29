import { FiTrash2, FiEdit2, FiMenu } from 'react-icons/fi';
import { useShoppingList } from '../../context/ShoppingListContext';
import type { ShoppingItem } from '../../types/shopping';
import { useSwipe } from '../../hooks/useSwipe';
import './Items.css';

type ShoppingListItemProps = {
  item: ShoppingItem;
  listId: string;
  onEdit: () => void;
  isDraggable?: boolean;
};

const ShoppingListItem = ({ 
  item, 
  listId, 
  onEdit,
  isDraggable = true 
}: ShoppingListItemProps) => {
  const { toggleItemCompletion, deleteItem } = useShoppingList();
  
  // Handle swipe to delete
  const { 
    onTouchStart, 
    onTouchMove, 
    onTouchEnd, 
    swipeDirection, 
    swipeDistance,
    resetSwipe 
  } = useSwipe(
    75, // threshold
    () => handleDelete(), // onSwipeLeft
    undefined // onSwipeRight
  );
  
  // Handle item completion toggle
  const handleToggleCompletion = async () => {
    try {
      await toggleItemCompletion(listId, item.id);
    } catch (error) {
      console.error('Error toggling item completion:', error);
      // Error is already handled in the context with showAlert
    }
  };
  
  // Handle item deletion
  const handleDelete = async () => {
    try {
      await deleteItem(listId, item.id);
      resetSwipe();
    } catch (error) {
      console.error('Error deleting item:', error);
      // Error is already handled in the context with showAlert
    }
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
    <div 
      className={`shopping-list-item ${item.completed ? 'completed' : ''}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div 
        className="shopping-list-item-content"
        style={getSwipeStyle()}
      >
        {isDraggable && (
          <div className="drag-handle">
            <FiMenu size={16} />
          </div>
        )}
        
        <div 
          className="shopping-list-item-checkbox"
          onClick={handleToggleCompletion}
        >
          <div className={`checkbox ${item.completed ? 'checked' : ''}`}></div>
        </div>
        
        <div 
          className="shopping-list-item-details"
          onClick={onEdit}
        >
          <div className="shopping-list-item-name">{item.name}</div>
          
          {item.quantity > 1 && (
            <div className="shopping-list-item-quantity">
              Qty: {item.quantity}
            </div>
          )}
          
          {item.category && item.category !== 'default' && (
            <div className="shopping-list-item-category">
              {item.category}
            </div>
          )}
        </div>
        
        <div className="shopping-list-item-actions">
          <button 
            className="button-icon-small"
            onClick={onEdit}
            aria-label="Edit item"
          >
            <FiEdit2 size={18} />
          </button>
          
          <button 
            className="button-icon-small danger"
            onClick={handleDelete}
            aria-label="Delete item"
          >
            <FiTrash2 size={18} />
          </button>
        </div>
      </div>
      
      {/* Delete button that appears when swiping */}
      <div 
        className="shopping-list-item-delete-button"
        style={getDeleteButtonStyle()}
        onClick={handleDelete}
      >
        <FiTrash2 size={20} />
      </div>
    </div>
  );
};

export default ShoppingListItem;