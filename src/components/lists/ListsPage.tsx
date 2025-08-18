import { useState } from 'react';
import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiTrash2, FiCopy, FiArchive, FiRotateCcw, FiPlus } from 'react-icons/fi';
import { useShoppingList } from '../../context/ShoppingListContext';
import { useAlert } from '../../context/NotificationSystemContext';
import { formatDate } from '../../utils';
import emptyIcon from '../../assets/empty.svg';
import ConfirmationDialog from '../ui/ConfirmationDialog';
import './Lists.css';

const ListsPage = () => {
  const { lists, deleteList, duplicateList, archiveList, unarchiveList, setCurrentList, createList } = useShoppingList();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const [showArchived, setShowArchived] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [listToDelete, setListToDelete] = useState<string | null>(null);

  // Filter and sort lists based on archive status, excluding deleted lists
  const filteredLists = lists.filter(list => 
    !list.deleted && (showArchived ? list.archived : !list.archived)
  );
  const sortedLists = [...filteredLists].sort((a, b) => b.updatedAt - a.updatedAt);

  // Handle list click
  const handleListClick = (listId: string) => {
    const list = lists.find(list => list.id === listId);
    if (list) {
      setCurrentList(list);
      navigate(`/list/${listId}`);
    }
  };

  // Handle list deletion
  const handleDeleteList = (e: MouseEvent, listId: string) => {
    e.stopPropagation(); // Prevent triggering the list click
    setListToDelete(listId);
    setShowDeleteConfirm(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (listToDelete) {
      await deleteList(listToDelete);
      setShowDeleteConfirm(false);
      setListToDelete(null);
    }
  };

  // Handle delete confirmation cancel
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setListToDelete(null);
  };

  // Handle list archiving
  const handleArchiveList = (e: MouseEvent, listId: string) => {
    e.stopPropagation();
    archiveList(listId);
  };

  // Handle list unarchiving
  const handleUnarchiveList = (e: MouseEvent, listId: string) => {
    e.stopPropagation();
    unarchiveList(listId);
  };

  // Handle list duplication
  const handleDuplicateList = async (e: MouseEvent, listId: string) => {
    e.stopPropagation(); // Prevent triggering the list click
    
    try {
      await duplicateList(listId);
    } catch (error) {
      console.error('Error duplicating list:', error);
      await showAlert({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to duplicate list'
      });
    }
  };

  // Handle create new list
  const handleCreateList = async () => {
    try {
      setIsCreatingList(true);
      // Format current date as DD-MMM-YYYY
      const today = new Date();
      const day = today.getDate().toString().padStart(2, '0');
      const month = today.toLocaleDateString('en-US', { month: 'short' });
      const year = today.getFullYear();
      const defaultListName = `${day}-${month}-${year}`;
      
      const newList = await createList(defaultListName);
      if (newList) {
        navigate(`/list/${newList.id}`);
      }
    } catch (error) {
      console.error('Error creating list:', error);
      await showAlert({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create list'
      });
    } finally {
      setIsCreatingList(false);
    }
  };

  // Calculate list statistics
  const getListStats = (listId: string) => {
    const list = lists.find(list => list.id === listId);
    if (!list) return { total: 0, completed: 0 };
    
    const total = list.items.length;
    const completed = list.items.filter(item => item.completed).length;
    
    return { total, completed };
  };

  return (
    <div className="lists-page">
      <div className="lists-sticky-header">
        <div className="container">
          <div className="archive-toggle">
            <button 
              className={`toggle-button ${!showArchived ? 'active' : ''}`}
              onClick={() => setShowArchived(false)}
            >
              Active Lists
            </button>
            <button 
              className={`toggle-button ${showArchived ? 'active' : ''}`}
              onClick={() => setShowArchived(true)}
            >
              Archived Lists
            </button>
          </div>
        </div>
      </div>
      
      <div className="container">
        <div className="lists-container">
          {sortedLists.length === 0 ? (
            <div className="empty-state">
              <img src={emptyIcon} alt="Empty lists" className="empty-state-icon" />
              {showArchived ? (
                <>
                  <p>No archived lists.</p>
                  <p>Archive lists to keep them organized!</p>
                </>
              ) : (
                <>
                  <p>You don't have any shopping lists yet.</p>
                  <p>Tap the + button to create your first list!</p>
                </>
              )}
            </div>
          ) : (
            sortedLists.map(list => {
              const { total, completed } = getListStats(list.id);
              
              return (
                <div 
                  key={list.id} 
                  className="list-card" 
                  onClick={() => handleListClick(list.id)}
                >
                  <div className="list-card-content">
                    <h3 className="list-card-title">{list.name}</h3>
                    
                    <div className="list-card-stats">
                      <span className="list-card-progress">
                        {showArchived ? total : `${completed}/${total}`} items
                      </span>
                      
                      <div className="list-card-date">
                        <FiClock size={16} />
                        <span>{formatDate(list.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="list-card-actions">
                    <button 
                      className="button-icon-small"
                      onClick={(e) => handleDuplicateList(e, list.id)}
                      aria-label="Duplicate list"
                    >
                      <FiCopy size={28} />
                    </button>
                    
                    {showArchived ? (
                      <button 
                        className="button-icon-small"
                        onClick={(e) => handleUnarchiveList(e, list.id)}
                        aria-label="Unarchive list"
                      >
                        <FiRotateCcw size={28} />
                      </button>
                    ) : (
                      <button 
                        className="button-icon-small"
                        onClick={(e) => handleArchiveList(e, list.id)}
                        aria-label="Archive list"
                      >
                        <FiArchive size={28} />
                      </button>
                    )}
                    
                    <button 
                      className="button-icon-small danger"
                      onClick={(e) => handleDeleteList(e, list.id)}
                      aria-label="Delete list"
                    >
                      <FiTrash2 size={28} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Floating Add Button */}
      <button 
        className="floating-add-button"
        onClick={handleCreateList}
        disabled={isCreatingList}
        aria-label="Create new list"
        style={{ display: showArchived ? 'none' : 'block' }}
      >
        <FiPlus size={24} />
      </button>
      
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Delete List"
        message={`Are you sure you want to delete "${listToDelete ? lists.find(list => list.id === listToDelete)?.name || 'this list' : 'this list'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

export default ListsPage;