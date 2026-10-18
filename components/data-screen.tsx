"use client";

import { ChangeEvent, useRef } from "react";
import { ArrowLeft, Download, RotateCcw, Upload } from "lucide-react";
import { DeletedItem } from "@/lib/store";

interface DataScreenProps {
  lastBackupAt?: string;
  deletedItems: DeletedItem[];
  onBack: () => void;
  onDownload: () => void;
  onRestoreFile: (file: File) => void;
  onRestoreItem: (itemId: string) => void;
}

function formatBackupTime(value?: string) {
  if (!value) return "Not backed up yet";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatDeletedTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  const days = Math.floor(elapsed / 86_400_000);
  if (days <= 0) return "deleted today";
  if (days === 1) return "deleted yesterday";
  return `deleted ${days} days ago`;
}

export function DataScreen({ lastBackupAt, deletedItems, onBack, onDownload, onRestoreFile, onRestoreItem }: DataScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const activeItems = deletedItems.filter((item) => Date.now() - new Date(item.deletedAt).getTime() <= 30 * 86_400_000);

  const readFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onRestoreFile(file);
    event.target.value = "";
  };

  return (
    <main className="min-h-screen bg-[#10111d] px-5 pb-12 pt-10 text-[#f1f0ff]">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center gap-4"><button onClick={onBack} className="rounded-2xl bg-[#1c1d31] p-3" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button><h1 className="text-4xl font-black tracking-tight">Backup &amp; restore</h1></div>
        <p className="max-w-sm text-lg leading-7 text-[#b9b9dc]">Your data lives only on this phone. Save a copy so it never gets lost.</p>

        <section className="mt-8 rounded-[2rem] bg-[#1c1d31] p-5">
          <p className="text-lg text-[#b9b9dc]">Last backup</p>
          <p className="mt-1 text-2xl font-black">{formatBackupTime(lastBackupAt)}</p>
          <button onClick={onDownload} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7c80ff] py-4 text-lg font-black text-[#10111d]"><Download className="h-5 w-5" />Download backup file</button>
          <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={readFile} />
          <button onClick={() => inputRef.current?.click()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#42456f] py-4 text-lg font-bold"><Upload className="h-5 w-5" />Restore from file</button>
        </section>

        <section className="mt-9">
          <h2 className="text-lg font-bold uppercase tracking-[0.14em] text-[#b9b9dc]">Recently deleted</h2>
          {activeItems.length ? <div className="mt-4 space-y-3">{activeItems.map((item) => <article key={item.id} className="flex items-center gap-3 rounded-[1.6rem] bg-[#1c1d31] p-4"><div className="min-w-0 flex-1"><h3 className="truncate text-lg font-bold">{item.label}</h3><p className="mt-0.5 text-[#b9b9dc]">{item.amount ? `₹${item.amount.toLocaleString("en-IN")} · ` : ""}{formatDeletedTime(item.deletedAt)}</p></div><button onClick={() => onRestoreItem(item.id)} className="shrink-0 rounded-2xl bg-[#292a47] px-4 py-3 font-bold text-[#9295ff]"><RotateCcw className="mr-1 inline h-4 w-4" />Restore</button></article>)}</div> : <p className="mt-4 rounded-[1.6rem] bg-[#1c1d31] p-5 text-[#b9b9dc]">No deleted items to restore.</p>}
          <p className="mt-5 text-[#b9b9dc]">Deleted items are kept for 30 days.</p>
        </section>
      </div>
    </main>
  );
}
