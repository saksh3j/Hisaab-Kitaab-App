"use client";

import { useState } from "react";
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Category } from "@/lib/store";

interface CategoriesScreenProps {
  categories: Category[];
  defaultCategoryIds: string[];
  onBack: () => void;
  onAdd: (label: string, icon: string) => void;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
}

export function CategoriesScreen({ categories, defaultCategoryIds, onBack, onAdd, onRename, onDelete }: CategoriesScreenProps) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("🎁");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const customCategories = categories.filter((category) => !defaultCategoryIds.includes(category.id));

  const add = () => {
    if (!label.trim()) return;
    onAdd(label.trim(), icon || "🎁");
    setLabel("");
    setIcon("🎁");
  };

  return <main className="hk-mobile-screen px-5 pb-12 pt-10"><div className="mx-auto max-w-md"><div className="mb-8 flex items-center gap-4"><button onClick={onBack} className="hk-panel p-3" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button><h1 className="hk-page-title">Categories</h1></div><section className="hk-panel p-5"><p className="hk-subtle text-lg">New category</p><div className="mt-4 flex gap-3"><input value={icon} onChange={(event) => setIcon(event.target.value)} maxLength={2} className="w-16 rounded-2xl bg-[#292a47] text-center text-2xl outline-none" aria-label="Category emoji" /><input value={label} onChange={(event) => setLabel(event.target.value)} onKeyDown={(event) => event.key === "Enter" && add()} placeholder="Category name" className="min-w-0 flex-1 rounded-2xl bg-[#292a47] px-4 text-lg outline-none" /><button onClick={add} disabled={!label.trim()} className="rounded-2xl bg-[#7c80ff] px-5 font-black text-[#10111d] disabled:opacity-40"><Plus className="h-6 w-6" /></button></div></section><section className="mt-8"><div className="flex items-center justify-between"><h2 className="hk-subtle text-lg font-bold">Your categories</h2><span className="hk-subtle">{customCategories.length}</span></div><div className="mt-4 space-y-3">{categories.map((category) => { const editable = !defaultCategoryIds.includes(category.id); const isEditing = editing === category.id; return <article key={category.id} className="hk-panel flex items-center gap-3 p-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#292a47] text-2xl">{category.icon}</span>{isEditing ? <input value={draft} onChange={(event) => setDraft(event.target.value)} className="min-w-0 flex-1 rounded-xl bg-[#292a47] px-3 py-2 text-lg font-bold outline-none" autoFocus /> : <div className="min-w-0 flex-1"><h3 className="truncate text-xl font-bold">{category.label}</h3>{!editable && <p className="hk-subtle text-sm">Default category</p>}</div>}{editable && (isEditing ? <><button onClick={() => { if (draft.trim()) onRename(category.id, draft.trim()); setEditing(null); }} className="rounded-xl bg-[#7c80ff] p-3 text-[#10111d]"><Check className="h-5 w-5" /></button><button onClick={() => setEditing(null)} className="rounded-xl bg-[#292a47] p-3"><X className="h-5 w-5" /></button></> : <><button onClick={() => { setEditing(category.id); setDraft(category.label); }} className="rounded-xl bg-[#292a47] p-3"><Pencil className="h-5 w-5" /></button><button onClick={() => onDelete(category.id)} className="rounded-xl bg-rose-500/15 p-3 text-rose-400"><Trash2 className="h-5 w-5" /></button></>)}</article>; })}</div></section></div></main>;
}
