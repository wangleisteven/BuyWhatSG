import { useState, useRef } from 'react';
import { createWorker } from 'tesseract.js';
import { FiX, FiUpload, FiLock } from 'react-icons/fi';
import { useShoppingList } from '../../context/ShoppingListContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { recommendCategory } from '../../utils/categoryRecommendation';
import GeminiService from '../../services/geminiService';
import { API_CONFIG } from '../../config/apiConfig';
import './ImportFromPhoto.css';

type ImportFromPhotoProps = {
  listId: string;
  onClose: () => void;
};

type ExtractedItem = {
  name: string;
  quantity: number;
  category: string;
};

const ImportFromPhoto = ({ listId, onClose }: ImportFromPhotoProps) => {
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
    // Check if Gemini API key is configured
    if (!API_CONFIG.GEMINI_API_KEY) {
      // Fallback to basic parsing if no API key
      return parseItemsBasic(text);
    }

    try {
      const geminiService = new GeminiService(API_CONFIG.GEMINI_API_KEY);
      const geminiItems = await geminiService.parseItemsFromText(text);
      
      return geminiItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        category: recommendCategory(item.name)
      }));
    } catch (error) {
      console.error('Gemini parsing failed, falling back to basic parsing:', error);
      // Fallback to basic parsing if Gemini fails
      return parseItemsBasic(text);
    }
  };

  // Basic fallback parsing function
  const parseItemsBasic = (text: string): ExtractedItem[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const items: ExtractedItem[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Try to extract quantity and item name
      let quantity = 1;
      let itemName = trimmedLine;

      // Pattern 1: "2 apples" or "3 bananas"
      const pattern1 = /^(\d+)\s+(.+)$/;
      const match1 = trimmedLine.match(pattern1);
      if (match1) {
        quantity = parseInt(match1[1]);
        itemName = match1[2];
      } else {
        // Pattern 2: "tomatoes - 3" or "rice 1kg"
        const pattern2 = /^(.+?)\s*[-–]\s*(\d+)$/;
        const match2 = trimmedLine.match(pattern2);
        if (match2) {
          quantity = parseInt(match2[2]);
          itemName = match2[1];
        } else {
          // Pattern 3: "1kg rice" or "500g chicken"
          const pattern3 = /^(\d+(?:\.\d+)?)\s*(kg|g|lbs?|oz|dozen|gallon|loaves?)\s+(.+)$/i;
          const match3 = trimmedLine.match(pattern3);
          if (match3) {
            quantity = parseFloat(match3[1]);
            const unit = match3[2];
            itemName = match3[3];
            
            // Convert units to more readable format
            if (unit.toLowerCase() === 'dozen') {
              quantity = quantity * 12;
            } else if (unit.toLowerCase().includes('loav')) {
              quantity = Math.round(quantity);
            }
          }
        }
      }

      // Clean up item name
      itemName = itemName.replace(/[^\w\s]/g, '').trim();
      
      if (itemName) {
        const category = recommendCategory(itemName);
        items.push({
          name: itemName,
          quantity: Math.max(1, Math.round(quantity)),
          category
        });
      }
    }

    return items;
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

      // Add all items to the shopping list in batch
        const itemsToAdd = extractedItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          category: item.category,
          completed: false
        }));
        
        await addItems(listId, itemsToAdd);

      setIsAnalyzing(false);
      addToast({
        message: 'Items imported successfully!',
        type: 'success'
      });
      
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
      <div className="modal-content import-photo-modal">
        <div className="modal-header">
          <h3>Import from Photo</h3>
          <button 
            className="button-icon-small"
            onClick={onClose}
            disabled={isAnalyzing}
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="import-photo-content">
          {!isAuthenticated ? (
            <div className="login-required-state">
              <FiLock size={48} className="lock-icon" />
              <h4>Login Required</h4>
              <p>You need to be logged in to use the Import from Photo feature.</p>
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
                <h4>Select a photo</h4>
                <p>Choose an image containing your shopping list or grocery items</p>
                <button className="button-primary">
                  Choose Photo
                </button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              
              <div className="import-tips">
                <h5>Tips for better results:</h5>
                <div className="sample-image-container">
                  <img 
                    src="/src/assets/shopping_list_sample.jpg" 
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

export default ImportFromPhoto;