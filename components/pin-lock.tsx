"use client";

import { useState } from "react";
import { Delete } from "lucide-react";

interface PinLockProps {
  name: string;
  avatar: string;
  onUnlock: (pin: string) => Promise<boolean>;
}

export function PinLock({ name, avatar, onUnlock }: PinLockProps) {
  const [pin, setPin] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState("");

  const addDigit = async (digit: string) => {
    if (isChecking || pin.length >= 4) return;
    const nextPin = `${pin}${digit}`;
    setPin(nextPin);
    setError("");

    if (nextPin.length !== 4) return;
    setIsChecking(true);
    const unlocked = await onUnlock(nextPin);
    setIsChecking(false);
    if (!unlocked) {
      setError("Incorrect PIN. Try again.");
      setPin("");
    }
  };

  return (
    <main className="min-h-screen bg-[#10111d] px-6 py-10 text-[#f1f0ff]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-sm flex-col items-center justify-center">
        <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-[2.5rem] bg-[#302d60] text-6xl shadow-2xl shadow-black/20">
          {avatar}
        </div>
        <h1 className="text-center text-4xl font-black tracking-tight">
          Welcome back, {name}
        </h1>
        <p className="mt-2 text-lg font-medium text-[#b9b9dc]">Enter your PIN</p>

        <div className="mt-12 flex gap-5" aria-label={`${pin.length} of 4 PIN digits entered`}>
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={`h-5 w-5 rounded-full border-[3px] ${
                index < pin.length
                  ? "border-[#7c80ff] bg-[#7c80ff]"
                  : "border-[#42456f]"
              }`}
            />
          ))}
        </div>
        <p className="mt-4 h-5 text-sm font-medium text-rose-400">{error}</p>

        <div className="mt-10 grid w-full grid-cols-3 gap-5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0"].map((digit, index) =>
            digit ? (
              <button
                type="button"
                key={digit}
                onClick={() => addDigit(digit)}
                className="aspect-square rounded-full bg-[#1c1d31] text-4xl font-bold transition-transform active:scale-95 disabled:opacity-60"
                disabled={isChecking}
              >
                {digit}
              </button>
            ) : (
              <span key={`space-${index}`} />
            ),
          )}
          <button
            type="button"
            onClick={() => {
              setPin((current) => current.slice(0, -1));
              setError("");
            }}
            className="flex aspect-square items-center justify-center rounded-full text-[#f1f0ff] transition-colors hover:bg-[#1c1d31]"
            aria-label="Delete PIN digit"
          >
            <Delete className="h-7 w-7" />
          </button>
        </div>
        <p className="mt-12 text-center text-sm text-[#b9b9dc]">
          Forgot PIN? Restore from a backup.
        </p>
      </div>
    </main>
  );
}
