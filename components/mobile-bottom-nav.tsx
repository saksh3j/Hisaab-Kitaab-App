"use client";

import { Clock3, Database, UserRound, UsersRound } from "lucide-react";

interface MobileBottomNavProps {
  active: "data" | "profile";
  onHome: () => void;
  onData: () => void;
  onProfile: () => void;
}

export function MobileBottomNav({ active, onHome, onData, onProfile }: MobileBottomNavProps) {
  return <nav className="hk-nav" aria-label="Primary navigation">
    <button onClick={onHome}><UsersRound className="h-6 w-6" />Members</button>
    <button onClick={onHome}><Clock3 className="h-6 w-6" />History</button>
    <button onClick={onData} data-active={active === "data"}><Database className="h-6 w-6" />Data</button>
    <button onClick={onProfile} data-active={active === "profile"}><UserRound className="h-6 w-6" />Me</button>
  </nav>;
}
