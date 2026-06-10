"use client";

import { useEffect } from "react";
import { toast } from "sonner";

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOffline = () => {
      toast.info(
        "You are offline. Everything except email sending will still work.",
      );
    };

    const handleOnline = () => {
      toast.success("You are back online.");
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
