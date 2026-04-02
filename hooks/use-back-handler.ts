import { useEffect, useRef } from "react";

/**
 * Hook to handle mobile back button to close a modal/drawer instead of navigating back.
 * @param isOpen Whether the modal is currently open
 * @param onClose Callback to close the modal
 * @param closeHistoryDelay Delay before removing the synthetic history entry on normal close
 */
export function useBackHandler(
  isOpen: boolean,
  onClose: () => void,
  closeHistoryDelay = 0,
) {
  const closeRef = useRef(onClose);
  const modalStateIdRef = useRef<string | null>(null);
  const closedByBackRef = useRef(false);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    let closeTimeoutId: number | undefined;

    if (!isOpen) {
      const modalStateId = modalStateIdRef.current;
      if (!modalStateId) {
        return () => {
          if (closeTimeoutId !== undefined) {
            window.clearTimeout(closeTimeoutId);
          }
        };
      }

      if (
        !closedByBackRef.current &&
        window.history.state?.modalOpen &&
        window.history.state?.modalStateId === modalStateId
      ) {
        const closeHistoryEntry = () => {
          if (
            window.history.state?.modalOpen &&
            window.history.state?.modalStateId === modalStateId
          ) {
            window.history.back();
          }
        };

        if (closeHistoryDelay > 0) {
          closeTimeoutId = window.setTimeout(closeHistoryEntry, closeHistoryDelay);
        } else {
          closeHistoryEntry();
        }
      }

      modalStateIdRef.current = null;
      closedByBackRef.current = false;

      return () => {
        if (closeTimeoutId !== undefined) {
          window.clearTimeout(closeTimeoutId);
        }
      };
    }

    if (!modalStateIdRef.current) {
      modalStateIdRef.current = `modal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      closedByBackRef.current = false;

      // Push a new state to the history stack when the modal opens.
      const currentState = window.history.state ?? {};
      window.history.pushState(
        {
          ...currentState,
          modalOpen: true,
          modalStateId: modalStateIdRef.current,
        },
        "",
      );
    }

    const handlePopState = () => {
      if (!modalStateIdRef.current) return;
      closedByBackRef.current = true;
      modalStateIdRef.current = null;
      closeRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      if (closeTimeoutId !== undefined) {
        window.clearTimeout(closeTimeoutId);
      }
      window.removeEventListener("popstate", handlePopState);
    };
  }, [closeHistoryDelay, isOpen]);
}
