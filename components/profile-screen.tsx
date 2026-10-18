"use client";

import { ChangeEvent, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Camera, Check, ChevronRight, Pencil, ShieldCheck, X } from "lucide-react";
import { useTheme } from "next-themes";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

const AVATARS = ["🦁", "🐼", "🦊", "🐧", "🐯", "🐸", "🦉", "🐙", "🌸", "🔥", "⭐", "🎧"];

interface ProfileScreenProps {
  name: string;
  avatar?: string;
  photo?: string;
  hasPin: boolean;
  onBack: () => void;
  onUpdateProfile: (profile: { name?: string; avatar?: string; photo?: string }) => void;
  onSetPin: (pin: string) => Promise<void>;
  onRemovePin: () => void;
  onData: () => void;
}

export function ProfileScreen({
  name,
  avatar = "🦁",
  photo,
  hasPin,
  onBack,
  onUpdateProfile,
  onSetPin,
  onRemovePin,
  onData,
}: ProfileScreenProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [showPinForm, setShowPinForm] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const savePin = async () => {
    if (!/^\d{4}$/.test(pin)) {
      setPinError("PIN must contain exactly 4 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setPinError("The PINs do not match.");
      return;
    }
    await onSetPin(pin);
    setPin("");
    setConfirmPin("");
    setPinError("");
    setShowPinForm(false);
  };

  const uploadPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onUpdateProfile({ photo: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <main className="hk-mobile-screen px-5 pb-32 pt-10">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center gap-4">
          <button onClick={onBack} className="rounded-2xl bg-[#1c1d31] p-3" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="hk-page-title">Me</h1>
        </div>

        <section className="hk-panel p-5">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => inputRef.current?.click()} className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[2rem] bg-[#302d60] text-5xl">
              {photo ? <Image src={photo} alt="Profile" width={112} height={112} unoptimized className="h-full w-full object-cover" /> : avatar}
              <span className="absolute bottom-1 right-1 rounded-full bg-[#7c80ff] p-1.5 text-white"><Camera className="h-3.5 w-3.5" /></span>
            </button>
            <input ref={inputRef} onChange={uploadPhoto} type="file" accept="image/*" className="hidden" />
            <div className="min-w-0 flex-1">
              <p className="text-base text-[#b9b9dc]">Your name</p>
              {isEditingName ? (
                <div className="mt-1 flex gap-2">
                  <input value={draftName} onChange={(event) => setDraftName(event.target.value)} className="min-w-0 w-full rounded-xl bg-[#292a47] px-3 py-2 text-xl font-bold outline-none ring-[#7c80ff] focus:ring-2" autoFocus />
                  <button onClick={() => { if (draftName.trim()) { onUpdateProfile({ name: draftName.trim() }); setIsEditingName(false); } }} className="rounded-xl bg-[#7c80ff] px-3"><Check className="h-5 w-5" /></button>
                </div>
              ) : <p className="truncate text-3xl font-black">{name}</p>}
            </div>
            {!isEditingName && <button onClick={() => setIsEditingName(true)} className="rounded-xl p-3 text-[#f1f0ff]"><Pencil className="h-6 w-6" /></button>}
          </div>
        </section>

        <section className="hk-panel mt-5 p-5">
          <h2 className="text-2xl font-bold">Pick an avatar</h2>
          <div className="mt-4 grid grid-cols-6 gap-3">
            {AVATARS.map((item) => <button key={item} onClick={() => onUpdateProfile({ avatar: item, photo: "" })} className={`aspect-square rounded-2xl text-3xl ${avatar === item && !photo ? "bg-[#7c80ff] ring-2 ring-[#a6a8ff]" : "bg-[#292a47]"}`}>{item}</button>)}
          </div>
          <button onClick={() => inputRef.current?.click()} className="mt-5 w-full rounded-2xl border-2 border-[#7c80ff] py-3 font-bold text-[#9295ff]">Upload photo</button>
        </section>

        <section className="hk-panel mt-5 overflow-hidden">
          <div className="flex items-center justify-between p-5">
            <div><h2 className="text-xl font-bold">PIN lock</h2><p className="mt-1 text-[#b9b9dc]">Ask for PIN when app opens</p></div>
            <button onClick={() => hasPin ? onRemovePin() : setShowPinForm(true)} className={`relative h-9 w-16 rounded-full ${hasPin ? "bg-[#7c80ff]" : "bg-[#42456f]"}`} aria-label="Toggle PIN lock"><span className={`absolute top-1 h-7 w-7 rounded-full bg-[#10111d] transition-transform ${hasPin ? "translate-x-8" : "translate-x-1"}`} /></button>
          </div>
          {hasPin && <button onClick={() => setShowPinForm(true)} className="flex w-full items-center justify-between border-t border-[#30314d] p-5 text-left text-xl font-bold">Change PIN <ChevronRight className="h-6 w-6" /></button>}
          <div className="flex items-center justify-between border-t border-[#30314d] p-5"><div><h2 className="text-xl font-bold">Theme</h2><p className="mt-1 text-[#b9b9dc]">{resolvedTheme === "dark" ? "Indigo night" : "Light"}</p></div><button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="rounded-xl bg-[#292a47] px-4 py-2 text-sm font-bold text-[#b9b9dc]">Change</button></div>
        </section>
      </div>

      <MobileBottomNav active="profile" onHome={onBack} onData={onData} onProfile={() => undefined} />

      {showPinForm && <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-4 sm:items-center sm:justify-center"><div className="w-full max-w-md rounded-[2rem] bg-[#1c1d31] p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-black">{hasPin ? "Change PIN" : "Set PIN"}</h2><p className="mt-1 text-sm text-[#b9b9dc]">Use a four-digit PIN to lock this device.</p></div><button onClick={() => setShowPinForm(false)} className="rounded-xl p-2"><X /></button></div><div className="mt-6 space-y-3"><input inputMode="numeric" maxLength={4} type="password" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} placeholder="New 4-digit PIN" className="w-full rounded-xl bg-[#292a47] px-4 py-3 text-lg outline-none" autoFocus /><input inputMode="numeric" maxLength={4} type="password" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))} placeholder="Confirm PIN" className="w-full rounded-xl bg-[#292a47] px-4 py-3 text-lg outline-none" /><p className="h-4 text-sm text-rose-400">{pinError}</p><button onClick={savePin} className="w-full rounded-xl bg-[#7c80ff] py-3 text-lg font-black text-[#10111d]">Save PIN</button></div></div></div>}
    </main>
  );
}
