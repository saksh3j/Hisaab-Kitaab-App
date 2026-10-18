import { toast as sonner } from "sonner";

// Routine actions update the UI immediately; avoid interrupting the flow with a toast.
export const toast = {
  success: (..._args: unknown[]) => undefined,
  error: (..._args: unknown[]) => undefined,
  message: (..._args: unknown[]) => undefined,
};

export const actionToast = {
  success: sonner.success,
  error: sonner.error,
};
