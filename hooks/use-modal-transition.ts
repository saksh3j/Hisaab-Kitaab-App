import { useEffect, useState } from "react";

export function useModalTransition(isOpen: boolean, duration = 320) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let frameId: number | undefined;

    if (isOpen) {
      setIsVisible(false);
      frameId = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
    }

    return () => {
      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [duration, isOpen]);

  return { isMounted: isOpen, isVisible };
}
