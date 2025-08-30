import React, { useState, useEffect } from 'react';
import { PiX, PiCaretLeft, PiCaretRight } from 'react-icons/pi';
import './OnboardingModal.css';
import { safeLocalStorage } from '../../utils/errorHandling';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OnboardingScreen {
  id: number;
  title: string;
  description: string;
  gifUrl: string;
  altText: string;
}

const onboardingScreens: OnboardingScreen[] = [
  {
    id: 1,
    title: "Extract Shopping Lists from Photos",
    description: "Snap a photo of your handwritten list or screenshot chat conversations with your family. Our AI instantly converts them into organized digital shopping lists - no more paper lists or scrolling through chat history!",
    gifUrl: "/onboarding_imgs/see_my_picture.png",
    altText: "Photo extraction demo"
  },
  {
    id: 2,
    title: "Voice-to-List Magic",
    description: "Simply speak your shopping needs and watch them appear on your list instantly. Perfect for when your hands are busy or when your family is telling you what to buy - never forget an item again!",
    gifUrl: "/onboarding_imgs/listen_to_me.png",
    altText: "Voice input demo"
  },
  {
    id: 3,
    title: "Smart Category Organization",
    description: "Items are automatically grouped by categories like fruits, dairy, and household items. Shop efficiently by visiting each supermarket section once - no more running back and forth!",
    gifUrl: "/onboarding_imgs/auto_categorization.png",
    altText: "Category grouping demo"
  },
  {
    id: 4,
    title: "Location-Based Reminders",
    description: "Your shopping list automatically pops up as a notification when you're near any FairPrice store. Never enter a supermarket empty-handed again!",
    gifUrl: "/onboarding_imgs/location.png",
    altText: "Location reminder demo"
  }
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Reset to first screen when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentScreen(0);
    }
  }, [isOpen]);

  const nextScreen = () => {
    if (currentScreen < onboardingScreens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    }
  };

  const prevScreen = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
    }
  };

  const goToScreen = (index: number) => {
    setCurrentScreen(index);
  };

  // Handle touch events for swipe gestures
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextScreen();
    } else if (isRightSwipe) {
      prevScreen();
    }
  };

  const handleGetStarted = () => {
    // Mark onboarding as completed
    safeLocalStorage.setItem('onboarding_completed', 'true');
    onClose();
  };

  if (!isOpen) return null;

  const currentScreenData = onboardingScreens[currentScreen];

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        {/* Header */}
        <div className="onboarding-header">
          <h2>Welcome to BuyWhatSG!</h2>
          <button 
            className="onboarding-close-btn"
            onClick={onClose}
            aria-label="Close onboarding"
          >
            <PiX size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div 
          className="onboarding-content"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="onboarding-screen">
            {/* GIF/Image */}
            <div className="onboarding-media">
              <img 
                src={currentScreenData.gifUrl} 
                alt={currentScreenData.altText}
                className="onboarding-gif"
              />
            </div>

            {/* Text Content */}
            <div className="onboarding-text">
              <h3>{currentScreenData.title}</h3>
              <p>{currentScreenData.description}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="onboarding-navigation">
          {/* Progress Dots */}
          <div className="onboarding-dots">
            {onboardingScreens.map((_, index) => (
              <button
                key={index}
                className={`onboarding-dot ${index === currentScreen ? 'active' : ''}`}
                onClick={() => goToScreen(index)}
                aria-label={`Go to screen ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="onboarding-buttons">
            <button 
              className="onboarding-nav-btn prev"
              onClick={prevScreen}
              disabled={currentScreen === 0}
              aria-label="Previous screen"
            >
              <PiCaretLeft size={20} />
              Previous
            </button>

            {currentScreen === onboardingScreens.length - 1 ? (
              <button 
                className="onboarding-nav-btn get-started"
                onClick={handleGetStarted}
              >
                Get Started!
              </button>
            ) : (
              <button 
                className="onboarding-nav-btn next"
                onClick={nextScreen}
                aria-label="Next screen"
              >
                Next
                <PiCaretRight size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;