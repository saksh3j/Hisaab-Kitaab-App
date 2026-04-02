"use client";

import { CalendarRange, Check, X } from "lucide-react";
import { useBackHandler } from "@/hooks/use-back-handler";
import { useModalTransition } from "@/hooks/use-modal-transition";
import { useSwipeToClose } from "@/hooks/use-swipe-to-close";

export interface MonthFilterOption {
  key: string;
  label: string;
  count: number;
}

interface MonthFilterSheetProps {
  isOpen: boolean;
  title: string;
  selectedKey: string;
  totalCount: number;
  options: MonthFilterOption[];
  onSelect: (key: string) => void;
  onClose: () => void;
}

export function MonthFilterSheet({
  isOpen,
  title,
  selectedKey,
  totalCount,
  options,
  onSelect,
  onClose,
}: MonthFilterSheetProps) {
  useBackHandler(isOpen, onClose);
  const transition = useModalTransition(isOpen, 220);
  const swipe = useSwipeToClose({ isOpen, onClose, resetDelay: 0 });

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

  if (!transition.isMounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        style={overlayStyle}
        onClick={onClose}
      />

      <div
        className="relative flex max-h-[78vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-popover shadow-2xl safe-bottom"
        style={panelStyle}
      >
        <div
          className="flex shrink-0 cursor-grab justify-center pt-3 pb-1 active:cursor-grabbing touch-none"
          {...swipe.dragHandlers}
        >
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div
          className="flex shrink-0 items-center justify-between border-b border-border px-4 pt-4 pb-3"
          {...swipe.dragHandlers}
        >
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            <div>
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="text-xs text-muted-foreground">
                Kis month ki transaction dekhni hai?
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="app-scrollbar flex-1 space-y-2 overflow-y-auto px-4 py-4">
          <button
            type="button"
            onClick={() => {
              onSelect("all");
              onClose();
            }}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
              selectedKey === "all"
                ? "border-foreground/20 bg-foreground/5"
                : "border-border bg-background"
            }`}
          >
            <div>
              <p className="text-sm font-medium">All Months</p>
              <p className="text-xs text-muted-foreground">
                {totalCount} transaction{totalCount === 1 ? "" : "s"}
              </p>
            </div>
            {selectedKey === "all" && (
              <Check className="h-4 w-4 text-foreground" />
            )}
          </button>

          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                onSelect(option.key);
                onClose();
              }}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                selectedKey === option.key
                  ? "border-foreground/20 bg-foreground/5"
                  : "border-border bg-background"
              }`}
            >
              <div>
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">
                  {option.count} transaction{option.count === 1 ? "" : "s"}
                </p>
              </div>
              {selectedKey === option.key && (
                <Check className="h-4 w-4 text-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
