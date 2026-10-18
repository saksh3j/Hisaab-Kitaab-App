"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Drawer } from "@vladyoslav/drawer";
import { toast } from "@/lib/notifications";
import { Member } from "@/lib/store";
import { useBackHandler } from "@/hooks/use-back-handler";

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

  useEffect(() => {
    if (isOpen) {
      setName(mode === "edit" ? initialName : "");
      setEmail(mode === "edit" ? initialEmail : "");
      setError("");
    }
  }, [isOpen, mode, initialName, initialEmail]);

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
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      snapPoints={["45%", "70%"]}
      dismissible={false}
      shouldScaleBackground
      scaleFrom="60%"
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Drawer.Content className="fixed right-0 bottom-0 left-0 z-50 mx-auto w-full max-w-md overflow-hidden rounded-t-2xl bg-popover shadow-2xl safe-bottom sm:bottom-6">
        {/* Drag handle pill (visible on mobile) */}
        <div
          className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing touch-none sm:hidden"
        >
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <Drawer.Title className="text-lg font-semibold">
              {mode === "edit" ? "Edit Member" : "Add Member"}
            </Drawer.Title>
            <Drawer.Close
              className="p-1.5 rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </Drawer.Close>
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
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
