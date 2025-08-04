import { useState, useRef } from 'react';
import { FiX, FiLock } from 'react-icons/fi';
import { useShoppingList } from '../../context/ShoppingListContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { recommendCategory } from '../../utils/categoryRecommendation';
import GeminiService from '../../services/geminiService';
import { API_CONFIG } from '../../config/apiConfig';
import './ReadMyMessage.css';

type ReadMyMessageProps = {
  listId: string;
  onClose: () => void;
};

const ReadMyMessage = ({ listId, onClose }: ReadMyMessageProps) => {
  const { addItems } = useShoppingList();
  const { addToast } = useToast();
  const { isAuthenticated, loginWithGoogle } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MAX_CHARACTERS = 500;
  const remainingCharacters = MAX_CHARACTERS - message.length;

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARACTERS) {
      setMessage(value);
    }
  };

  const handleCreateItems = async () => {
    if (!message.trim()) {
      addToast({ message: 'Please enter a message', type: 'warning' });
      return;
    }

    if (!isAuthenticated) {
      addToast({ message: 'Please log in to use this feature', type: 'warning' });
      return;
    }

    setIsAnalyzing(true);

    try {
      const geminiService = new GeminiService(API_CONFIG.GEMINI_API_KEY);
      
      const result = await geminiService.parseItemsFromText(message);
      
      if (result && result.length > 0) {
        const extractedItems = result.map((item: any) => ({
          name: item.name || 'Unknown Item',
          quantity: item.quantity || 1,
          category: recommendCategory(item.name || 'Unknown Item'),
          completed: false
        }));
        
        await addItems(listId, extractedItems);
        addToast({ message: `Successfully added ${extractedItems.length} items from your message!`, type: 'success' });
        onClose();
      } else {
        addToast({ message: 'No items could be extracted from your message. Please try rephrasing.', type: 'warning' });
      }
    } catch (error) {
      console.error('Error processing message:', error);
      addToast({ message: 'Failed to process your message. Please try again.', type: 'error' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      addToast({ message: 'Successfully logged in!', type: 'success' });
    } catch (error) {
      console.error('Login failed:', error);
      addToast({ message: 'Login failed. Please try again.', type: 'error' });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content read-message-modal">
        <div className="modal-header">
          <h3>Read My Message</h3>
          <button 
            className="button-icon-small"
            onClick={onClose}
            disabled={isAnalyzing}
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="read-message-content">
          {!isAuthenticated ? (
            <div className="login-required-state">
              <FiLock size={48} className="lock-icon" />
              <h4>Login Required</h4>
              <p>You need to be logged in to use the feature.</p>
              <button 
                className="button-primary"
                onClick={handleLogin}
              >
                Login with Google
              </button>
            </div>
          ) : isAnalyzing ? (
            <div className="analyzing-state">
              <div className="loading-spinner"></div>
              <h4>Processing your message...</h4>
              <p>AI is extracting shopping items from your text</p>
            </div>
          ) : (
            <>
              <div className="message-input-section">
                <textarea
                  id="message-textarea"
                  ref={textareaRef}
                  value={message}
                  onChange={handleMessageChange}
                  placeholder="Type your shopping list message here... For example: 'I need to buy some apples, 2 bottles of milk, bread, and chicken for dinner tonight.'"
                  className="message-textarea"
                  rows={6}
                />
                <div className="character-counter">
                  <span className={remainingCharacters < 50 ? 'warning' : ''}>
                    {remainingCharacters} characters remaining
                  </span>
                </div>
              </div>
              
              <div className="message-tips">
                <h5>Tips for better results:</h5>
                <ul>
                  <li>Be specific about quantities (e.g., "2 apples" instead of "some apples")</li>
                  <li>Include brand names if important</li>
                  <li>Mention sizes or weights when relevant</li>
                  <li>Use natural language - write as you would speak</li>
                </ul>
              </div>
              
              <div className="modal-actions">
                <button 
                  className="button-primary"
                  onClick={handleCreateItems}
                  disabled={!message.trim()}
                >
                  Create Items
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReadMyMessage;