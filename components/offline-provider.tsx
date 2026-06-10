"use client";

import { useEffect } from "react";

export function OfflineProvider() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        // Offline support is progressive enhancement. Ignore registration failure.
      }
    };

    registerServiceWorker();
  }, []);

  return null;
}
