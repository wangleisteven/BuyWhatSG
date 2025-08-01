import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import { useShoppingList } from '../../context/ShoppingListContext';
import type { ShoppingItem } from '../../types/shopping';
import ShoppingListItem from '../items/ShoppingListItem';
import EditItemModal from '../items/EditItemModal';
import AddItemForm from '../items/AddItemForm';
import AddItemMenu from '../items/AddItemMenu';
import ImportFromPhoto from '../items/ImportFromPhoto';
import ListenToMe from '../items/ListenToMe';
import Toast from '../ui/Toast';
import { categories, getCategoryName, getCategoryById } from '../../config/categories';
import './ListDetail.css';



const ListDetail = () => {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const { 
    lists, 
    currentList, 
    setCurrentList,
    lastDeletedItem,
    undoDeleteItem
  } = useShoppingList();
  
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showImportFromPhoto, setShowImportFromPhoto] = useState(false);
  const [showListenToMe, setShowListenToMe] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  
  // Find the list by ID
  useEffect(() => {
    if (!listId) {
      navigate('/lists');
      return;
    }
    
    const list = lists.find(list => list.id === listId);
    if (list) {
      setCurrentList(list);
    } else {
      navigate('/lists');
    }
  }, [listId, lists, navigate, setCurrentList]);
  
  // Show undo toast when an item is deleted
  useEffect(() => {
    if (lastDeletedItem && lastDeletedItem.listId === listId) {
      setShowUndoToast(true);
      
      // Auto-hide toast after 5 seconds
      const timer = setTimeout(() => {
        setShowUndoToast(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [lastDeletedItem, listId]);
  

  
  // Handle list title update functionality removed as it's not being used
  
  // Handle undo delete
  const handleUndoDelete = () => {
    undoDeleteItem();
    setShowUndoToast(false);
  };

  // Handle add item menu actions
  const handleAddButtonClick = () => {
    setShowAddMenu(true);
  };

  const handleAddManually = () => {
    setShowAddMenu(false);
    setIsAddingItem(true);
  };

  const handleImportFromPhoto = () => {
    setShowAddMenu(false);
    setShowImportFromPhoto(true);
  };

  const handleListenToMe = () => {
    setShowAddMenu(false);
    setShowListenToMe(true);
  };

  const handleCloseAddMenu = () => {
    setShowAddMenu(false);
  };
  
  if (!currentList) {
    return <div className="container">Loading...</div>;
  }
  
  // Sort items by category -> status (todo > done) -> item last update time
  const sortedItems = [...currentList.items].sort((a, b) => {
    // First sort by completion status (uncompleted first)
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    
    // Then sort by category (for uncompleted items)
    if (!a.completed && !b.completed) {
      const categoryOrder = [
        'produce', 'dairy', 'meat', 'bakery', 'frozen', 
        'pantry', 'beverages', 'household', 'personal', 'default'
      ];
      
      const aCategoryIndex = categoryOrder.indexOf(a.category || 'general');
    const bCategoryIndex = categoryOrder.indexOf(b.category || 'general');
      
      if (aCategoryIndex !== bCategoryIndex) {
        return aCategoryIndex - bCategoryIndex;
      }
    }
    
    // Finally sort by last update time (most recent first)
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });
  
  // Separate completed and uncompleted items
  const uncompletedItems = sortedItems.filter(item => !item.completed);
  const completedItems = sortedItems.filter(item => item.completed);
  
  // Group uncompleted items by category
  const categoryOrder = categories.map(cat => cat.id);
  
  const groupedItems = categoryOrder.reduce((acc, categoryId) => {
    const categoryItems = uncompletedItems.filter(item => item.category === categoryId);
    if (categoryItems.length > 0) {
      acc[categoryId] = categoryItems;
    }
    return acc;
  }, {} as { [key: string]: typeof uncompletedItems });
  
  return (
    <div className="list-detail container">
      <div className="list-header">
        <button 
          className="floating-add-button"
          onClick={handleAddButtonClick}
          aria-label="Add new item"
        >
          <FiPlus size={24} />
        </button>
      </div>
      
      {isAddingItem && (
        <AddItemForm 
          listId={currentList.id}
          onClose={() => setIsAddingItem(false)}
        />
      )}

      {/* Add item menu */}
      {showAddMenu && (
        <AddItemMenu
          onAddManually={handleAddManually}
          onImportFromPhoto={handleImportFromPhoto}
          onListenToMe={handleListenToMe}
          onClose={handleCloseAddMenu}
        />
      )}

      {/* Import from photo modal */}
      {showImportFromPhoto && (
        <ImportFromPhoto
          listId={currentList.id}
          onClose={() => setShowImportFromPhoto(false)}
        />
      )}

      {/* Listen to me modal */}
      {showListenToMe && (
        <ListenToMe
          listId={currentList.id}
          onClose={() => setShowListenToMe(false)}
        />
      )}
      
      <div className="shopping-list">
        {uncompletedItems.length === 0 && completedItems.length === 0 ? (
          <div className="empty-list">
            <p>This list is empty.</p>
            <p>Tap the Add Item button to add your first item!</p>
          </div>
        ) : (
          <>
            {/* Uncompleted items grouped by category */}
            {Object.entries(groupedItems).map(([categoryId, categoryItems]) => (
              <div key={categoryId} className="category-group">
                <h4 className="category-heading">
                  <span className="category-heading-icon">{getCategoryById(categoryId)?.icon}</span>
                  <span className="category-heading-name">{getCategoryName(categoryId)}</span>
                </h4>
                {categoryItems.map((item) => (
                  <ShoppingListItem
                    key={item.id}
                    item={item}
                    listId={currentList.id}
                    onEdit={() => setEditingItem(item)}
                  />
                ))}
              </div>
            ))}
            
            {/* Completed items section */}
            {completedItems.length > 0 && (
              <div className="completed-section">
                <h3 className="completed-heading">
                  Completed ({completedItems.length})
                </h3>
                
                {completedItems.map((item) => (
                  <ShoppingListItem
                    key={item.id}
                    item={item}
                    listId={currentList.id}
                    onEdit={() => setEditingItem(item)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Edit item modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          listId={currentList.id}
          onClose={() => setEditingItem(null)}
        />
      )}
      
      {/* Undo delete toast */}
      {showUndoToast && lastDeletedItem && (
        <Toast
          message={`Deleted "${lastDeletedItem.item.name}"`}
          action="Undo"
          onAction={handleUndoDelete}
          onClose={() => setShowUndoToast(false)}
          type="info"
        />
      )}
    </div>
  );
};

export default ListDetail;