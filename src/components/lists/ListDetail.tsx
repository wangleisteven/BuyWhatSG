import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiPlus, FiX } from 'react-icons/fi';
import { FaKeyboard } from "react-icons/fa";
import { IoMdPhotos } from "react-icons/io";
import { RiVoiceAiFill } from "react-icons/ri";
import { LuMessageSquareMore } from "react-icons/lu";
import { useShoppingList } from '../../context/ShoppingListContext';
import type { ShoppingItem } from '../../types';
import ShoppingListItem from '../items/ShoppingListItem';
import EditItemModal from '../items/EditItemModal';
import AddItemForm from '../items/AddItemForm';
import SeeMyPicture from '../items/SeeMyPicture';
import ListenToMe from '../items/ListenToMe';
import ReadMyMessage from '../items/ReadMyMessage';
import { useToast } from '../../context/NotificationSystemContext';
import { categories, getCategoryName, getCategoryById } from '../../config/categories';
import emptyIcon from '../../assets/empty.svg';
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
  const [showSeeMyPicture, setShowSeeMyPicture] = useState(false);
  const [showListenToMe, setShowListenToMe] = useState(false);
  const [showReadMyMessage, setShowReadMyMessage] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const { addToast } = useToast();
  const [undoToastId, setUndoToastId] = useState<string | null>(null);
  
  // Find the list by ID and update currentList when lists change
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
      const toastId = addToast({
         message: `Deleted "${lastDeletedItem.item.name}"`,
         type: 'info',
         duration: 5000,
         action: 'Undo',
         onAction: handleUndoDelete
       });
      setUndoToastId(toastId);
    }
  }, [lastDeletedItem, listId, addToast]);
  

  
  // Handle list title update functionality removed as it's not being used
  
  // Handle undo delete
  const handleUndoDelete = () => {
    undoDeleteItem();
    setUndoToastId(null);
  };

  // Handle add item menu actions
  const handleAddButtonClick = () => {
    setShowAddMenu(!showAddMenu);
  };

  const handleAddManually = () => {
    setShowAddMenu(false);
    setIsAddingItem(true);
  };

  const handleSeeMyPicture = () => {
    setShowAddMenu(false);
    setShowSeeMyPicture(true);
  };

  const handleListenToMe = () => {
    setShowAddMenu(false);
    setShowListenToMe(true);
  };

  const handleReadMyMessage = () => {
    setShowAddMenu(false);
    setShowReadMyMessage(true);
  };
  
  if (!currentList) {
    return <div className="container">Loading...</div>;
  }
  
  // Sort items by category -> status (todo > done) -> item last update time
  const sortedItems = [...currentList.items].filter(item => !item.deleted).sort((a, b) => {
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
        {/* Animated Add Menu - Hidden for archived lists */}
        {!currentList?.archived && (
          <div className="animated-add-menu">
            <button
              className={`main-add-button ${showAddMenu ? 'rotated' : ''}`}
              onClick={handleAddButtonClick}
              aria-label={showAddMenu ? "Close menu" : "Add new item"}
            >
              {showAddMenu ? <FiX size={24} /> : <FiPlus size={24} />}
            </button>
            
            <div className={`menu-buttons ${showAddMenu ? 'visible' : ''}`}>
              <button
                className="menu-button"
                onClick={handleAddManually}
                aria-label="Add Manually"
              >
                <FaKeyboard size={20} />
              </button>
              
              <button
                className="menu-button"
                onClick={handleReadMyMessage}
                aria-label="Read My Message"
              >
                <LuMessageSquareMore size={20} />
              </button>
              
              <button
                className="menu-button"
                onClick={handleSeeMyPicture}
                aria-label="See My Picture"
              >
                <IoMdPhotos size={20} />
              </button>
              
              <button
                className="menu-button"
                onClick={handleListenToMe}
                aria-label="Listen to me"
              >
                <RiVoiceAiFill size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {isAddingItem && !currentList?.archived && (
        <AddItemForm 
          listId={currentList.id}
          onClose={() => setIsAddingItem(false)}
        />
      )}

      {/* See My Picture modal - disabled for archived lists */}
      {showSeeMyPicture && !currentList?.archived && (
          <SeeMyPicture
            listId={currentList.id}
            onClose={() => setShowSeeMyPicture(false)}
          />
        )}

      {/* Listen to me modal - disabled for archived lists */}
      {showListenToMe && !currentList?.archived && (
        <ListenToMe
          listId={currentList.id}
          onClose={() => setShowListenToMe(false)}
        />
      )}

      {/* Read my message modal - disabled for archived lists */}
      {showReadMyMessage && !currentList?.archived && (
        <ReadMyMessage
          listId={currentList.id}
          onClose={() => setShowReadMyMessage(false)}
        />
      )}
      
      <div className="shopping-list">
        {uncompletedItems.length === 0 && completedItems.length === 0 ? (
          <div className="empty-list">
            <img src={emptyIcon} alt="Empty list" className="empty-list-icon" />
            <p>This list is empty.</p>
            {!currentList?.archived ? (
              <p>Tap the + button to add your first item!</p>
            ) : (
              <p>Archive lists to keep it organized.</p>
            )}
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
                    onEdit={() => !currentList?.archived && setEditingItem(item)}
                    isArchived={currentList?.archived}
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
                    onEdit={() => !currentList?.archived && setEditingItem(item)}
                    isArchived={currentList?.archived}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Edit Item Modal - disabled for archived lists */}
      {editingItem && !currentList?.archived && (
        <EditItemModal
          item={editingItem}
          listId={currentList.id}
          onClose={() => setEditingItem(null)}
        />
      )}
      

    </div>
  );
};

export default ListDetail;