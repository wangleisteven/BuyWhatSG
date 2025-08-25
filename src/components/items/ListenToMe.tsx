import { useState, useRef, useEffect } from 'react';
import { FiX, FiMic, FiMicOff, FiLock } from 'react-icons/fi';
import { useShoppingList } from '../../context/ShoppingListContext';
import { useToast } from '../../context/NotificationSystemContext';
import { useAuth } from '../../context/AuthContext';
import { recommendCategory } from '../../utils/categoryClassifier';
import WhisperService from '../../services/whisperService';
import GeminiService from '../../services/geminiService';
import { API_CONFIG } from '../../config/apiConfig';
import './ListenToMe.css';

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
  const { addItems } = useShoppingList();
  const { addToast } = useToast();
  const { isAuthenticated, loginWithGoogle } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [frequencyData, setFrequencyData] = useState<number[]>(new Array(20).fill(0));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef<boolean>(false); // Ref to track recording state for timer

  const RECORDING_DURATION = 15000; // 15 seconds in milliseconds

  useEffect(() => {
    // Check if OpenAI API key is configured
    if (!API_CONFIG.OPENAI_API_KEY) {
      addToast({
        message: 'OpenAI API key not configured. Please set VITE_OPENAI_API_KEY environment variable.',
        type: 'error'
      });
    }
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
        addToast({
          message: 'Oops! Failed to recognize items, please try again later.',
          type: 'warning'
        });
      }
    }
    return [];
  };

  // Audio level analysis for sound wave visualization
  const analyzeAudioLevel = () => {
    if (!analyserRef.current || !isRecordingRef.current) {
      console.log('Audio analysis stopped:', { hasAnalyser: !!analyserRef.current, isRecording: isRecordingRef.current });
      return;
    }
    
    // Get both frequency and time domain data
    const frequencyArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    const timeDomainArray = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteFrequencyData(frequencyArray);
    analyserRef.current.getByteTimeDomainData(timeDomainArray);
    
    // Calculate RMS from time domain data for overall audio level
    let rms = 0;
    for (let i = 0; i < timeDomainArray.length; i++) {
      const normalized = (timeDomainArray[i] - 128) / 128;
      rms += normalized * normalized;
    }
    rms = Math.sqrt(rms / timeDomainArray.length);
    const normalizedLevel = Math.min(rms * 10, 1); // Increased amplification for better sensitivity
    
    // Apply lighter smoothing for more responsiveness
    const smoothedLevel = audioLevel * 0.3 + normalizedLevel * 0.7;
    setAudioLevel(smoothedLevel);
    
    // Create frequency data for individual bars (20 bars)
    const barCount = 20;
    const newFrequencyData = [];
    
    // Use logarithmic frequency distribution for more natural visualization
    // This gives more resolution to lower frequencies where most vocal energy is
    const maxFreqIndex = Math.floor(frequencyArray.length * 0.8); // Use only 80% of frequency range to avoid noise
    
    // Audio analysis running
    
    for (let i = 0; i < barCount; i++) {
      // Use exponential distribution for frequency ranges
      const startRatio = Math.pow(i / barCount, 1.5);
      const endRatio = Math.pow((i + 1) / barCount, 1.5);
      
      const startIndex = Math.floor(startRatio * maxFreqIndex);
      const endIndex = Math.floor(endRatio * maxFreqIndex);
      
      // Ensure we have at least one bin
      const actualEndIndex = Math.max(endIndex, startIndex + 1);
      
      // Calculate average for this frequency range
      let sum = 0;
      let count = 0;
      for (let j = startIndex; j < actualEndIndex && j < frequencyArray.length; j++) {
        sum += frequencyArray[j];
        count++;
      }
      
      if (count === 0) {
        newFrequencyData.push(0.05); // Minimum height
        continue;
      }
      
      const average = sum / count;
      
      // Apply frequency-dependent scaling (lower frequencies need less amplification)
      const frequencyWeight = 0.3 + (i / barCount) * 0.7; // Scale from 0.3 to 1.0
      let normalizedBar = Math.min((average * frequencyWeight) / 100, 1);
      
      // Apply lighter smoothing to each bar for more responsiveness
      const previousValue = frequencyData[i] || 0;
      const smoothedBar = previousValue * 0.15 + normalizedBar * 0.85;
      
      // Set minimum height but allow bars to go to near zero for natural effect
      newFrequencyData.push(Math.max(0.02, smoothedBar));
    }
    
    setFrequencyData(newFrequencyData);
    
    // Continue animation while recording
    if (isRecordingRef.current) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudioLevel);
    }
  };

  // Start audio recording for Whisper API
  const startRecording = async () => {
    try {
      // Requesting microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      // Microphone access granted
      
      // Set up audio analysis for sound wave visualization
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if it's suspended (required by some browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        // Audio context resumed
      }
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 1024; // Increased for better frequency resolution
      analyserRef.current.smoothingTimeConstant = 0.1; // Reduce smoothing for more responsive bars
      analyserRef.current.minDecibels = -100;
      analyserRef.current.maxDecibels = -30;
      source.connect(analyserRef.current);
      
      // Audio context set up
      
      // Try to use a compatible format for better transcription
      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Use the same type as the MediaRecorder
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        await transcribeWithWhisper(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Clean up audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      isRecordingRef.current = true; // Set ref for timer logic
      setRecordingProgress(0);
      
      // Start audio level analysis
      analyzeAudioLevel();
      
      // Set up 15-second timer with progress updates
      const startTime = Date.now();
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / RECORDING_DURATION, 1);
        
        // Timer update
        setRecordingProgress(progress);
        
        if (progress >= 1) {
          // Auto-stop recording after 15 seconds
          // 15 seconds reached, auto-stopping recording
          stopRecording();
          return;
        }
        
        // Only continue timer if still recording
        if (isRecordingRef.current) {
          recordingTimerRef.current = setTimeout(updateProgress, 100);
        }
      };
      
      // Start the progress timer immediately
      updateProgress();
      
      // Also set a hard timeout as backup
      setTimeout(() => {
        if (isRecordingRef.current) {
          // Backup timer triggered, force stopping recording
          stopRecording();
        }
      }, RECORDING_DURATION + 100);
      
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
    // stopRecording called
    
    // Clean up timers and animation frames first
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Reset recording states immediately
    setIsRecording(false);
    isRecordingRef.current = false; // Reset ref
    setRecordingProgress(0);
    setAudioLevel(0);
    setFrequencyData(new Array(20).fill(0));
    
    // Stop the media recorder if it exists and is in a valid state
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Stopping media recorder
      mediaRecorderRef.current.stop();
    } else {
      // Media recorder not available or already stopped
    }
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Transcribe audio using Whisper API
  const transcribeWithWhisper = async (audioBlob: Blob) => {
    if (!API_CONFIG.OPENAI_API_KEY) {
      addToast({
        message: 'OpenAI API key not configured. Please set VITE_OPENAI_API_KEY environment variable.',
        type: 'error'
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Starting transcription

      const whisperService = new WhisperService(API_CONFIG.OPENAI_API_KEY);
      const transcription = await whisperService.transcribeAudio(audioBlob);
      
      // Transcription completed
      
      if (!transcription || transcription.trim().length === 0) {
        addToast({
          message: 'No speech was detected. Please try speaking more clearly.',
          type: 'error'
        });
        setIsProcessing(false);
        return;
      }
      
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

      // Add all items to the list in batch
      const itemsToAdd = extractedItems.map(item => ({
        name: item.name || 'Unknown Item',
        quantity: item.quantity || 1,
        category: recommendCategory(item.name || 'Unknown Item'),
        completed: false
      }));
      
      await addItems(listId, itemsToAdd);

      setIsProcessing(false);
      addToast({
        message: `Successfully added ${itemsToAdd.length} items!`,
        type: 'success'
      });
      
      // Close modal after showing success
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error transcribing audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to transcribe audio. Please try again.';
      addToast({
        message: errorMessage,
        type: 'error'
      });
      setIsProcessing(false);
    }
  };

  const handleMicToggle = async () => {
    if (!API_CONFIG.OPENAI_API_KEY) {
      addToast({
        message: 'OpenAI API key not configured. Please set VITE_OPENAI_API_KEY environment variable.',
        type: 'error'
      });
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
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
            disabled={isRecording || isProcessing}
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="listen-content">
          {!isAuthenticated ? (
            <div className="login-required-state">
              <FiLock size={48} className="lock-icon" />
              <h4>Login Required</h4>
              <p>You need to be logged in to use the feature.</p>
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
              {/* Sound Wave Visualization */}
              <div className="sound-wave-container">
                <div className="sound-wave">
                  {frequencyData.map((frequency, i) => (
                    <div
                      key={i}
                      className="wave-bar"
                      style={{
                        height: `${Math.max(10, frequency * 100)}%`,
                        opacity: isRecording ? 1 : 0.3,
                        transition: isRecording ? 'height 0.05s ease' : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Microphone Controls with Progress Donut */}
              <div className="mic-controls">
                <div className="mic-button-container">
                  {/* Progress Donut */}
                  <svg className="progress-donut" width="100" height="100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="rgba(0, 0, 0, 0.1)"
                      strokeWidth="4"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={isRecording ? "#ef4444" : "transparent"}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * (1 - recordingProgress)}`}
                      transform="rotate(-90 50 50)"
                      style={{
                        transition: isRecording ? 'none' : 'stroke 0.3s ease'
                      }}
                    />
                  </svg>
                  
                  {/* Microphone Button */}
                  <button
                    className={`mic-button ${isRecording ? 'listening' : ''}`}
                    onClick={handleMicToggle}
                    disabled={isProcessing}
                  >
                    {isRecording ? (
                      <FiMicOff size={32} />
                    ) : (
                      <FiMic size={32} />
                    )}
                  </button>
                </div>
                
                <p className="mic-instruction">
                  {isRecording 
                    ? `Recording... ${Math.ceil((1 - recordingProgress) * 15)}s remaining` 
                    : 'Click to start recording (15s max)'
                  }
                </p>
              </div>

              <div className="speech-tips">
                <h5>Tips for better recognition:</h5>
                <ul>
                  <li>Speak clearly and at a normal pace</li>
                  <li>Include quantities: "two apples, three bananas"</li>
                  <li>Separate items with "and" or pauses</li>
                  <li>Use simple item names</li>
                </ul>
                {!API_CONFIG.OPENAI_API_KEY && (
                  <p className="api-warning">⚠️ OpenAI API key not configured. Please set VITE_OPENAI_API_KEY environment variable.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListenToMe;