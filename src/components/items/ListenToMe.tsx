import { useState, useRef, useEffect } from 'react';
import { FiX, FiMic, FiMicOff, FiLock } from 'react-icons/fi';
import { useShoppingList } from '../../context/ShoppingListContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { recommendCategory } from '../../utils/categoryRecommendation';
import WhisperService from '../../services/whisperService';
import GeminiService from '../../services/geminiService';
import { API_CONFIG } from '../../config/apiConfig';
import './ListenToMe.css';

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type ListenToMeProps = {
  listId: string;
  onClose: () => void;
};

type ExtractedItem = {
  name: string;
  quantity: number;
  category: string;
};

const ListenToMe = ({ listId, onClose }: ListenToMeProps) => {
  const { addItem } = useShoppingList();
  const { addToast } = useToast();
  const { isAuthenticated, loginWithGoogle } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [useWhisper, setUseWhisper] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Check if speech recognition is supported
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      addToast({
        message: 'Speech recognition is not supported in this browser.',
        type: 'error'
      });
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscribedText(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      addToast({
        message: 'Speech recognition error. Please try again.',
        type: 'error'
      });
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [addToast]);

  // Parse transcribed text to identify items with quantities using Gemini AI
  const parseItemsFromText = async (text: string): Promise<ExtractedItem[]> => {
    // Try Gemini API first if configured
    if (API_CONFIG.GEMINI_API_KEY) {
      try {
        const geminiService = new GeminiService(API_CONFIG.GEMINI_API_KEY);
        const geminiItems = await geminiService.parseItemsFromText(text);
        
        // Convert Gemini items to ExtractedItem format
        return geminiItems.map(item => ({
          name: item.name,
          quantity: item.quantity || 1,
          category: recommendCategory(item.name)
        }));
      } catch (error) {
        console.warn('Gemini parsing failed, falling back to basic parsing:', error);
        // Fall through to basic parsing
      }
    }

    // Fallback to basic parsing
    const items: ExtractedItem[] = [];
    
    // Split by common separators and clean up
    const segments = text
      .toLowerCase()
      .split(/[,\.\n]|and|also|plus|then|next/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const segment of segments) {
      // Skip common filler words
      if (/^(i need|i want|get|buy|purchase|add|put)$/i.test(segment.trim())) {
        continue;
      }

      let quantity = 1;
      let itemName = segment;

      // Pattern 1: "two apples" or "three bananas"
      const numberWords: { [key: string]: number } = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'eleven': 11, 'twelve': 12, 'dozen': 12, 'half dozen': 6
      };

      for (const [word, num] of Object.entries(numberWords)) {
        if (segment.startsWith(word + ' ')) {
          quantity = num;
          itemName = segment.substring(word.length + 1);
          break;
        }
      }

      // Pattern 2: "2 apples" or "3 bananas"
      const digitMatch = segment.match(/^(\d+)\s+(.+)$/);
      if (digitMatch) {
        quantity = parseInt(digitMatch[1]);
        itemName = digitMatch[2];
      }

      // Clean up item name
      itemName = itemName
        .replace(/^(some|a|an|the)\s+/i, '')
        .replace(/\s+(please|thanks|thank you)$/i, '')
        .trim();

      if (itemName && itemName.length > 1) {
        const category = recommendCategory(itemName);
        items.push({
          name: itemName,
          quantity: Math.max(1, quantity),
          category
        });
      }
    }

    return items;
  };

  // Start audio recording for Whisper API
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await transcribeWithWhisper(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      addToast({
        message: 'Failed to access microphone. Please check permissions.',
        type: 'error'
      });
    }
  };

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Transcribe audio using Whisper API
  const transcribeWithWhisper = async (audioBlob: Blob) => {
    if (!API_CONFIG.OPENAI_API_KEY) {
      addToast({
        message: 'OpenAI API key not configured. Using Web Speech API instead.',
        type: 'warning'
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const whisperService = new WhisperService(API_CONFIG.OPENAI_API_KEY);
      const transcription = await whisperService.transcribeAudio(audioBlob);
      
      setTranscribedText(transcription);
      
      // Parse and add items
      const extractedItems = await parseItemsFromText(transcription);
      
      if (extractedItems.length === 0) {
        addToast({
          message: 'No items could be detected from your speech. Please try again.',
          type: 'error'
        });
        setIsProcessing(false);
        return;
      }

      // Add all items to the list
      for (const item of extractedItems) {
        await addItem(listId, {
          name: item.name,
          quantity: item.quantity,
          category: item.category,
          completed: false,
          photoURL: ''
        });
      }

      setIsProcessing(false);
      addToast({
        message: 'Items added successfully!',
        type: 'success'
      });
      
      // Close modal after showing success
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error transcribing audio:', error);
      addToast({
        message: 'Failed to transcribe audio. Please try again.',
        type: 'error'
      });
      setIsProcessing(false);
    }
  };

  const handleMicToggle = async () => {
    if (useWhisper) {
      // Use Whisper API mode
      if (isRecording) {
        stopRecording();
      } else {
        await startRecording();
      }
    } else {
      // Use Web Speech API mode
      if (!recognitionRef.current) {
        addToast({
          message: 'Speech recognition is not available.',
          type: 'error'
        });
        return;
      }

      if (isListening) {
        // Stop listening and process
        recognitionRef.current.stop();
        setIsListening(false);
        
        if (transcribedText.trim()) {
          setIsProcessing(true);
          
          try {
            // Parse items from transcribed text
            const extractedItems = await parseItemsFromText(transcribedText);
            
            if (extractedItems.length === 0) {
              addToast({
                message: 'No items could be detected from your speech. Please try again.',
                type: 'error'
              });
              setIsProcessing(false);
              return;
            }

            // Add all items to the list
            for (const item of extractedItems) {
              await addItem(listId, {
                name: item.name,
                quantity: item.quantity,
                category: item.category,
                completed: false,
                photoURL: ''
              });
            }

            setIsProcessing(false);
            addToast({
              message: 'Items added successfully!',
              type: 'success'
            });
            
            // Close modal after showing success
            setTimeout(() => {
              onClose();
            }, 1500);

          } catch (error) {
            console.error('Error processing speech:', error);
            addToast({
              message: 'Failed to process your speech. Please try again.',
              type: 'error'
            });
            setIsProcessing(false);
          }
        }
      } else {
        // Start listening
        setTranscribedText('');
        setIsListening(true);
        recognitionRef.current.start();
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content listen-to-me-modal">
        <div className="modal-header">
          <h3>Listen to me</h3>
          <button 
            className="button-icon-small"
            onClick={onClose}
            disabled={isListening || isProcessing}
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="listen-content">
          {!isAuthenticated ? (
            <div className="login-required-state">
              <FiLock size={48} className="lock-icon" />
              <h4>Login Required</h4>
              <p>You need to be logged in to use the Listen to me feature.</p>
              <button 
                className="button-primary"
                onClick={loginWithGoogle}
              >
                Login with Google
              </button>
            </div>
          ) : isProcessing ? (
            <div className="processing-state">
              <div className="loading-spinner"></div>
              <h4>Processing your speech...</h4>
              <p>We're analyzing what you said and adding items to your list.</p>
            </div>
          ) : (
            <>

              <div className="transcription-area">
                <div className="transcription-text">
                  {transcribedText || (
                    isListening ? 'Listening...' : 
                    isRecording ? 'Recording...' : 
                    'Click the microphone to start speaking'
                  )}
                </div>
              </div>

              <div className="mic-controls">
                <button
                  className={`mic-button ${(isListening || isRecording) ? 'listening' : ''}`}
                  onClick={handleMicToggle}
                  disabled={isProcessing}
                >
                  {(isListening || isRecording) ? (
                    <FiMicOff size={32} />
                  ) : (
                    <FiMic size={32} />
                  )}
                </button>
                <p className="mic-instruction">
                  {isListening ? 'Click to stop and add items' : 
                   isRecording ? 'Click to stop recording' :
                   'Click to start speaking'}
                </p>
              </div>

              <div className="speech-tips">
                <h5>Tips for better recognition:</h5>
                <ul>
                  <li>Speak clearly and at a normal pace</li>
                  <li>Include quantities: "two apples, three bananas"</li>
                  <li>Separate items with "and" or pauses</li>
                  <li>Use simple item names</li>
                  {useWhisper && <li>Whisper API provides more accurate transcription</li>}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListenToMe;