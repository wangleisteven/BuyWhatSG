import { useState, useRef } from 'react';
import type { TouchEvent } from 'react';

type SwipeDirection = 'left' | 'right' | null;
type SwipeHandlers = {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: () => void;
  swipeDirection: SwipeDirection;
  swipeDistance: number;
  resetSwipe: () => void;
};

/**
 * Custom hook to handle swipe gestures
 * @param threshold The minimum distance required to trigger a swipe (in pixels)
 * @param onSwipeLeft Callback function when swiped left
 * @param onSwipeRight Callback function when swiped right
 * @returns Object containing touch event handlers and swipe state
 */
export const useSwipe = (
  threshold: number = 50,
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void
): SwipeHandlers => {
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(null);
  const [swipeDistance, setSwipeDistance] = useState<number>(0);
  const startX = useRef<number>(0);
  const currentX = useRef<number>(0);

  const onTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!e.touches[0]) return;
    
    currentX.current = e.touches[0].clientX;
    const distance = currentX.current - startX.current;
    
    // Determine swipe direction
    if (distance > 0) {
      setSwipeDirection('right');
    } else if (distance < 0) {
      setSwipeDirection('left');
    } else {
      setSwipeDirection(null);
    }
    
    setSwipeDistance(Math.abs(distance));
  };

  const onTouchEnd = () => {
    const distance = currentX.current - startX.current;
    
    // Check if swipe distance exceeds threshold
    if (Math.abs(distance) >= threshold) {
      if (distance < 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (distance > 0 && onSwipeRight) {
        onSwipeRight();
      }
    }
    
    resetSwipe();
  };

  const resetSwipe = () => {
    setSwipeDirection(null);
    setSwipeDistance(0);
    startX.current = 0;
    currentX.current = 0;
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    swipeDirection,
    swipeDistance,
    resetSwipe
  };
};