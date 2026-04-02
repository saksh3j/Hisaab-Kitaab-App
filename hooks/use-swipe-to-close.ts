import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface SwipeToCloseOptions {
  isOpen: boolean;
  onClose: () => void;
  threshold?: number;
  closeVelocity?: number;
  resetDelay?: number;
}

export function useSwipeToClose({
  isOpen,
  onClose,
  threshold = 110,
  closeVelocity = 0.6,
  resetDelay = 320,
}: SwipeToCloseOptions) {
  const isMobile = useIsMobile();
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);

  useEffect(() => {
    let timeoutId: number | undefined;

    if (!isOpen) {
      setIsDragging(false);
      velocity.current = 0;
      timeoutId = window.setTimeout(() => {
        setDragOffset(0);
      }, resetDelay);
    } else {
      setDragOffset(0);
    }

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isOpen]);

  const handleDragStart = (e: React.TouchEvent<HTMLElement>) => {
    if (!isMobile || !isOpen || e.touches.length !== 1) return;

    const touchY = e.touches[0].clientY;
    dragStartY.current = touchY;
    lastY.current = touchY;
    lastTime.current = performance.now();
    velocity.current = 0;
    setIsDragging(true);
  };

  const handleDragMove = (e: React.TouchEvent<HTMLElement>) => {
    if (!isDragging) return;

    const touchY = e.touches[0].clientY;
    const delta = touchY - dragStartY.current;

    if (delta <= 0) {
      setDragOffset(0);
      return;
    }

    const now = performance.now();
    const deltaTime = Math.max(now - lastTime.current, 1);
    velocity.current = (touchY - lastY.current) / deltaTime;
    lastY.current = touchY;
    lastTime.current = now;

    // Slight resistance keeps the drag feeling controlled near the bottom edge.
    setDragOffset(delta * 0.92);
    e.preventDefault();
  };

  const handleDragEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);
    const shouldClose =
      dragOffset >= threshold || velocity.current >= closeVelocity;

    if (shouldClose) {
      onClose();
      return;
    }

    setDragOffset(0);
  };

  return {
    dragOffset,
    isDragging,
    overlayOpacity: isMobile ? Math.max(0, 1 - dragOffset / 220) : 1,
    dragHandlers: {
      onTouchStart: handleDragStart,
      onTouchMove: handleDragMove,
      onTouchEnd: handleDragEnd,
      onTouchCancel: handleDragEnd,
    },
  };
}
