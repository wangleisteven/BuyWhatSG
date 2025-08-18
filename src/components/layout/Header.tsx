import { useState } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiPlus, FiArrowLeft, FiEdit2 } from 'react-icons/fi';
import { useShoppingList } from '../../context/ShoppingListContext';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentList, createList, updateList } = useShoppingList();
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  // Determine if we're on the lists page or a specific list page
  const isListsPage = location.pathname === '/lists';
  const isListPage = location.pathname.startsWith('/list/');
  const isMePage = location.pathname === '/me';

  // Handle back button click
  const handleBack = () => {
    navigate(-1);
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
      // Show error message to user
      alert(error instanceof Error ? error.message : 'Failed to create list');
    } finally {
      setIsCreatingList(false);
    }
  };

  // Handle list title update
  const handleUpdateTitle = () => {
    if (!currentList || newTitle.trim() === '') {
      setIsEditingTitle(false);
      return;
    }
    
    // Only update if the title actually changed
    if (newTitle.trim() !== currentList.name) {
      updateList(currentList.id, { name: newTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  // Handle edit title click
  const handleEditTitle = () => {
    if (currentList) {
      setNewTitle(currentList.name);
      setIsEditingTitle(true);
    }
  };

  // Determine the title based on the current route
  const getTitle = () => {
    if (isListsPage) return 'My Lists';
    if (isListPage) return currentList?.name || 'Shopping List';
    if (isMePage) return 'Me';
    return 'BuyWhatSG';
  };

  return (
    <header className="header">
      <div className="container">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-sm">
            {!isListsPage && !isMePage && (
              <button 
                className="button-icon" 
                onClick={handleBack}
                aria-label="Go back"
              >
                <FiArrowLeft size={28} />
              </button>
            )}
            {isListPage && isEditingTitle ? (
              <div className="edit-title-form flex items-center gap-sm">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)}
                  autoFocus
                  onBlur={handleUpdateTitle}
                  onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && handleUpdateTitle()}
                  className="header-title-input"
                />
                <button 
                  className="button-icon"
                  onClick={handleUpdateTitle}
                  aria-label="Save title"
                >
                  <FiEdit2 size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-sm">
                <h1 className="header-title">{getTitle()}</h1>
                {isListPage && currentList && !currentList.archived && (
                  <button 
                    className="button-icon"
                    onClick={handleEditTitle}
                    aria-label="Edit list name"
                  >
                    <FiEdit2 size={20} />
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-sm">
            {isListsPage && (
              <button 
                className="button-icon"
                onClick={handleCreateList}
                disabled={isCreatingList}
                aria-label="Create new list"
              >
                <FiPlus size={36} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;