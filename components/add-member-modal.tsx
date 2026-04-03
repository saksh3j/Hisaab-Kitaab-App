"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Member } from "@/lib/store";
import { useBackHandler } from "@/hooks/use-back-handler";
import { useModalTransition } from "@/hooks/use-modal-transition";
import { useSwipeToClose } from "@/hooks/use-swipe-to-close";

interface AddMemberModalProps {
  isOpen: boolean;
  members: Member[];
  onClose: () => void;
  onAdd: (name: string, email?: string) => void;
  mode?: "add" | "edit";
  initialName?: string;
  initialEmail?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AddMemberModal({
  isOpen,
  members,
  onClose,
  onAdd,
  mode = "add",
  initialName = "",
  initialEmail = "",
}: AddMemberModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useBackHandler(isOpen, onClose);
  const transition = useModalTransition(isOpen, 220);
  const swipe = useSwipeToClose({ isOpen, onClose, resetDelay: 0 });

  useEffect(() => {
    if (isOpen) {
      setName(mode === "edit" ? initialName : "");
      setEmail(mode === "edit" ? initialEmail : "");
      setError("");
    }
  }, [isOpen, mode, initialName, initialEmail]);

  if (!transition.isMounted) return null;

  const overlayStyle: React.CSSProperties = {
    opacity: transition.isVisible ? swipe.overlayOpacity : 0,
    transition: swipe.isDragging ? "none" : "opacity 160ms ease",
  };

  const panelStyle: React.CSSProperties = {
    transform: `translate3d(0, ${swipe.dragOffset + (transition.isVisible ? 0 : 18)}px, 0)`,
    opacity: transition.isVisible ? 1 : 0.98,
    transition: swipe.isDragging
      ? "none"
      : "transform 220ms cubic-bezier(0.22,1,0.36,1), opacity 180ms ease",
    willChange: "transform, opacity",
    backfaceVisibility: "hidden",
  };

  const handleNameChange = (val: string) => {
    // Auto-capitalize first letter
    const capitalized = val.charAt(0).toUpperCase() + val.slice(1);
    setName(capitalized);
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      const message = "Name is required";
      setError(message);
      toast.error(message);
      return;
    }

    // Check for duplicate (case-insensitive) ignoring self if editing
    const exists = members.some((m) => {
      if (mode === "edit" && m.name.toLowerCase() === initialName.toLowerCase()) {
        return false;
      }
      return m.name.toLowerCase() === trimmedName.toLowerCase();
    });

    if (exists) {
      const message = `${trimmedName} already exists`;
      setError(message);
      toast.error(message);
      return;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      const message = "Enter a valid email address";
      setError(message);
      toast.error(message);
      return;
    }

    onAdd(trimmedName, trimmedEmail || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        style={overlayStyle}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-t-2xl bg-popover shadow-2xl safe-bottom sm:rounded-2xl"
        style={panelStyle}
      >
        {/* Drag handle pill (visible on mobile) */}
        <div
          className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing touch-none sm:hidden"
          {...swipe.dragHandlers}
        >
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="p-5">
          <div
            className="flex items-center justify-between mb-5"
            {...swipe.dragHandlers}
          >
            <h2 className="text-lg font-semibold">
              {mode === "edit" ? "Edit Member" : "Add Member"}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-3 py-2 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter name"
                className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Email (optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="name@example.com"
                className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <button
              type="submit"
              disabled={!name.trim() || (mode === "edit" && name === initialName && email === initialEmail)}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-40 active:opacity-80 transition-opacity"
            >
              {mode === "edit" ? "Save Changes" : "Add Member"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
