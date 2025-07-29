import { useState, useEffect } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiMenu } from 'react-icons/fi';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { DropResult } from 'react-beautiful-dnd';
import { useShoppingList } from '../../context/ShoppingListContext';
import type { ShoppingItem } from '../../types/shopping';
import ShoppingListItem from '../items/ShoppingListItem';
import EditItemModal from '../items/EditItemModal';
import AddItemForm from '../items/AddItemForm';
import Toast from '../ui/Toast';
import './ListDetail.css';

// Helper function to sanitize IDs for react-beautiful-dnd
const sanitizeId = (id: string): string => {
  // Remove emojis and special characters, keep only alphanumeric, hyphens, and underscores
  return id.replace(/[^a-zA-Z0-9\-_]/g, '');
};

const ListDetail = () => {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const { 
    lists, 
    currentList, 
    setCurrentList, 
    updateList,
    reorderItems,
    lastDeletedItem,
    undoDeleteItem
  } = useShoppingList();
  
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
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
      setNewTitle(list.name);
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
  
  // Handle drag and drop reordering
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !currentList) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    try {
      await reorderItems(currentList.id, sourceIndex, destinationIndex);
    } catch (error) {
      console.error('Error reordering items:', error);
      // Error is already handled in the context with showAlert
    }
  };
  
  // Handle list title update
  const handleUpdateTitle = async () => {
    if (!currentList || newTitle.trim() === '') return;
    
    try {
      await updateList(currentList.id, { name: newTitle.trim() });
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Error updating list title:', error);
      // Error is already handled in the context with showAlert
    }
  };
  
  // Handle undo delete
  const handleUndoDelete = () => {
    undoDeleteItem();
    setShowUndoToast(false);
  };
  
  if (!currentList) {
    return <div className="container">Loading...</div>;
  }
  
  // Separate completed and uncompleted items
  const uncompletedItems = currentList.items.filter(item => !item.completed);
  const completedItems = currentList.items.filter(item => item.completed);
  
  return (
    <div className="list-detail container">
      <div className="list-header">
        <button 
          className="floating-add-button"
          onClick={() => setIsAddingItem(true)}
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
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="shopping-list" isDropDisabled={false} isCombineEnabled={false} ignoreContainerClipping={false}>
          {(provided) => (
            <div
              className="shopping-list"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {uncompletedItems.length === 0 && completedItems.length === 0 ? (
                <div className="empty-list">
                  <p>This list is empty.</p>
                  <p>Tap the Add Item button to add your first item!</p>
                </div>
              ) : (
                <>
                  {/* Uncompleted items */}
                  {uncompletedItems.map((item, index) => {
                    const sanitizedId = sanitizeId(item.id);
                    return (
                    <Draggable 
                      key={`draggable-${sanitizedId}`} 
                      draggableId={`draggable-${sanitizedId}`} 
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`draggable-item ${snapshot.isDragging ? 'dragging' : ''}`}
                        >
                          <ShoppingListItem
                            item={item}
                            listId={currentList.id}
                            onEdit={() => setEditingItem(item)}
                            isDraggable={true}
                          />
                        </div>
                      )}
                    </Draggable>
                    );
                  })}
                  
                  {/* Completed items section */}
                  {completedItems.length > 0 && (
                    <div className="completed-section">
                      <h3 className="completed-heading">
                        Completed ({completedItems.length})
                      </h3>
                      
                      {completedItems.map((item, index) => (
                        <ShoppingListItem
                          key={item.id}
                          item={item}
                          listId={currentList.id}
                          onEdit={() => setEditingItem(item)}
                          isDraggable={false}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
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