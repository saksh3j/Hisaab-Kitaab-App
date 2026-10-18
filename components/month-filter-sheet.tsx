"use client";

import { CalendarRange, Check, X } from "lucide-react";
import { Drawer } from "@vladyoslav/drawer";
import { useBackHandler } from "@/hooks/use-back-handler";

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

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      snapPoints={["45%", "78%"]}
      dismissible={false}
      shouldScaleBackground
      scaleFrom="45%"
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed right-0 bottom-0 left-0 z-50 mx-auto flex max-h-[78vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-popover shadow-2xl safe-bottom">
        <div
          className="flex shrink-0 cursor-grab justify-center pt-3 pb-1 active:cursor-grabbing touch-none"
        >
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            <div>
              <Drawer.Title className="text-base font-semibold">{title}</Drawer.Title>
              <p className="text-xs text-muted-foreground">
                Kis month ki transaction dekhni hai?
              </p>
            </div>
          </div>
          <Drawer.Close className="rounded-lg p-1.5 hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </Drawer.Close>
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
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
