import { useState, useRef } from 'react';
import { createWorker } from 'tesseract.js';
import { FiX, FiUpload, FiLock } from 'react-icons/fi';
import { useShoppingList } from '../../context/ShoppingListContext';
import { useToast } from '../../context/NotificationSystemContext';
import { useAuth } from '../../context/AuthContext';
import { recommendCategoryAsync } from '../../utils/categoryClassifier';
import GeminiService from '../../services/geminiService';
import shoppingListSample from '../../assets/shopping_list_sample.jpg';
import './SeeMyPicture.css';

type SeeMyPictureProps = {
  listId: string;
  onClose: () => void;
};

type ExtractedItem = {
  name: string;
  quantity: number;
  category: string;
};

const SeeMyPicture = ({ listId, onClose }: SeeMyPictureProps) => {
  const { addItems } = useShoppingList();
  const { addToast } = useToast();
  const { isAuthenticated, loginWithGoogle } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real OCR function using Tesseract.js
  const extractTextFromImage = async (file: File): Promise<string> => {
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          setProgress(Math.round(m.progress * 100));
        }
      }
    });
    
    try {
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      return text.trim();
    } catch (error) {
      await worker.terminate();
      throw error;
    }
  };

  // Parse extracted text using Gemini AI
  const parseItemsFromText = async (text: string): Promise<ExtractedItem[]> => {
    try {
      const geminiService = new GeminiService();
      const geminiItems = await geminiService.parseItemsFromText(text);
      
      const itemsWithCategories = await Promise.all(
        geminiItems.map(async item => ({
          name: item.name || 'Unknown Item',
          quantity: item.quantity || 1,
          category: await recommendCategoryAsync(item.name || 'Unknown Item').catch(() => 'general'),
          completed: false
        }))
      );
      return itemsWithCategories;
    } catch (error) {
      console.error('Gemini parsing failed:', error);
      return [];
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast({
        message: 'Please select a valid image file.',
        type: 'error'
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      // Extract text from image
      const extractedText = await extractTextFromImage(file);
      
      // Parse items from text
      const extractedItems = await parseItemsFromText(extractedText);
      
      if (extractedItems.length === 0) {
        addToast({
          message: 'No items could be detected in the image. Please try a clearer photo.',
          type: 'error'
        });
        setIsAnalyzing(false);
        return;
      }

      // Add all items to the shopping list in batch with async category classification
      const itemsToAdd = await Promise.all(
        extractedItems.map(async item => ({
          name: item.name || 'Unknown Item',
          quantity: item.quantity || 1,
          category: await recommendCategoryAsync(item.name || 'Unknown Item').catch(() => 'general'),
          completed: false
        }))
      );
      
      await addItems(listId, itemsToAdd);

      setIsAnalyzing(false);
      addToast({ message: `Successfully added ${itemsToAdd.length} items!`, type: 'success' });
      
      // Close modal immediately after success
      onClose();

    } catch (error) {
      console.error('Error processing image:', error);
      addToast({
        message: 'Failed to process the image. Please try again.',
        type: 'error'
      });
      setIsAnalyzing(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content see-my-picture-modal">
        <div className="modal-header">
          <h3>See My Picture</h3>
          <button 
            className="button-icon-small"
            onClick={onClose}
            disabled={isAnalyzing}
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="see-my-picture-content">
          {!isAuthenticated ? (
            <div className="login-required-state">
              <FiLock size={48} className="lock-icon" />
              <h4>Login Required</h4>
              <p>You need to be logged in to use the See My Picture feature.</p>
              <button 
                className="button-primary"
                onClick={loginWithGoogle}
              >
                Login with Google
              </button>
            </div>
          ) : isAnalyzing ? (
            <div className="analyzing-state">
              <div className="loading-spinner"></div>
              <h4>Analyzing your photo...</h4>
              <p>We're extracting items from your image. This may take a moment.</p>
            </div>
          ) : (
            <div className="upload-state">
              <div className="upload-area" onClick={handleUploadClick}>
                <FiUpload size={48} className="upload-icon" />
                <h4>Select a picture</h4>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              
              <div className="picture-tips">
                <h5>Tips for better results:</h5>
                <div className="sample-image-container">
                  <img 
                    src={shoppingListSample} 
                    alt="Example of a good quality shopping list photo"
                    className="sample-image"
                  />
                  <p className="sample-caption">Example of a clear, readable shopping list</p>
                </div>
                <ul>
                  <li>Use clear, well-lit photo showing the shopping list</li>
                  <li>Ensure text is readable and not blurry</li>
                  <li>Include quantities when possible (e.g., "2 apples")</li>
                  <li>Hold camera steady to avoid motion blur</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeeMyPicture;