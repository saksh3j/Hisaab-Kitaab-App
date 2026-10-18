"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { HomePage } from "@/components/home-page";
import { MemberDetail } from "@/components/member-detail";
import { PinLock } from "@/components/pin-lock";
import { ProfileScreen } from "@/components/profile-screen";
import { useBackHandler } from "@/hooks/use-back-handler";
import {
  Member,
  AppState,
  TransactionCategory,
  TransactionSplit,
  getInitialState,
  saveState,
  generateId,
  getActiveBook,
  roundMoney,
  hashPin,
} from "@/lib/store";
import { downloadBackup } from "@/lib/backup";

export default function App() {
  const [state, setState] = useState<AppState>({
    books: [],
    activeBookId: "",
    userName: "",
  });
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const stateRef = useRef(state);
  const hasShownStorageError = useRef(false);

  useBackHandler(selectedMember !== null, () => setSelectedMember(null));

  useEffect(() => {
    const initialState = getInitialState();
    stateRef.current = initialState;
    setState(initialState);
    setIsLocked(Boolean(initialState.pinHash));
    setIsLoaded(true);
  }, []);

  const updateState = useCallback(
    (updater: (current: AppState) => AppState) => {
      const nextState = updater(stateRef.current);
      const result = saveState(nextState);

      if (!result.ok) {
        if (!hasShownStorageError.current) {
          hasShownStorageError.current = true;
          toast.error(
            result.error === "storage-full"
              ? "Your device storage is full. Changes were not saved."
              : "Your device blocked local storage. Changes were not saved.",
            {
              duration: Infinity,
              action: {
                label: "Download backup",
                onClick: () => downloadBackup(stateRef.current),
              },
            },
          );
        }
        return false;
      }

      hasShownStorageError.current = false;
      stateRef.current = nextState;
      setState(nextState);
      return true;
    },
    [],
  );

  const showUndo = useCallback(
    (message: string, previousState: AppState) => {
      toast.success(message, {
        action: {
          label: "Undo",
          onClick: () => {
            if (updateState(() => previousState)) {
              toast.success("Deletion undone.");
            }
          },
        },
      });
    },
    [updateState],
  );

  const handleSetName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const trimmedName = nameInput.trim();
    updateState((prev) => ({ ...prev, userName: trimmedName }));
  };

  const handleUpdateUserName = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Name cannot be empty.");
      return;
    }
    if (updateState((prev) => ({ ...prev, userName: trimmedName }))) {
      toast.success("Name updated.");
    }
  }, [updateState]);

  const handleUpdateProfile = useCallback((profile: {
    name?: string;
    avatar?: string;
    photo?: string;
  }) => {
    if (profile.name) {
      handleUpdateUserName(profile.name);
    }
    const { name: _name, ...appearance } = profile;
    if (Object.keys(appearance).length > 0) {
      updateState((prev) => ({ ...prev, ...appearance }));
    }
  }, [handleUpdateUserName, updateState]);

  const handleSetPin = useCallback(async (pin: string) => {
    const pinHash = await hashPin(pin);
    updateState((prev) => ({ ...prev, pinHash }));
  }, [updateState]);

  const handleUnlock = useCallback(async (pin: string) => {
    if (!stateRef.current.pinHash) return true;
    const pinHash = await hashPin(pin);
    if (pinHash !== stateRef.current.pinHash) return false;
    setIsLocked(false);
    return true;
  }, []);

  // ── Books ────────────────────────────────────────────────
  const handleAddBook = useCallback((name: string) => {
    const trimmedName = name.trim();
    const newBook = {
      id: generateId(),
      name: trimmedName,
      createdAt: new Date().toISOString(),
      members: [],
    };
    if (!updateState((prev) => ({
      ...prev,
      books: [...prev.books, newBook],
      activeBookId: newBook.id,
    }))) return;
    setSelectedMember(null);
    toast.success(`${trimmedName} book created.`);
  }, [updateState]);

  const handleSwitchBook = useCallback((bookId: string) => {
    if (!updateState((prev) => ({ ...prev, activeBookId: bookId }))) return;
    setSelectedMember(null);
  }, [updateState]);

  const handleRenameBook = useCallback((bookId: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Book name cannot be empty.");
      return;
    }
    if (!updateState((prev) => ({
      ...prev,
      books: prev.books.map((b) =>
        b.id === bookId ? { ...b, name: trimmedName } : b,
      ),
    }))) return;
    toast.success(`Book renamed to ${trimmedName}.`);
  }, [updateState]);

  const handleDeleteBook = useCallback((bookId: string) => {
    const previousState = stateRef.current;
    const deletedBookName =
      previousState.books.find((book) => book.id === bookId)?.name ?? "Book";
    if (!updateState((prev) => {
      const deletedIndex = prev.books.findIndex((b) => b.id === bookId);
      const remaining = prev.books.filter((b) => b.id !== bookId);

      if (remaining.length === 0) {
        const defaultBook = {
          id: generateId(),
          name: "Main Hisaab",
          createdAt: new Date().toISOString(),
          members: [],
        };
        return {
          ...prev,
          books: [defaultBook],
          activeBookId: defaultBook.id,
        };
      }

      let nextActiveBookId = prev.activeBookId;
      if (prev.activeBookId === bookId) {
        const fallbackIndex = Math.max(
          0,
          Math.min(deletedIndex - 1, remaining.length - 1),
        );
        nextActiveBookId = remaining[fallbackIndex]?.id ?? remaining[0].id;
      }

      return {
        ...prev,
        books: remaining,
        activeBookId: nextActiveBookId,
      };
    })) return;
    setSelectedMember(null);
    showUndo(`${deletedBookName} and its history deleted.`, previousState);
  }, [showUndo, updateState]);

  // ── Members ──────────────────────────────────────────────
  const handleAddMember = useCallback(
    (name: string, email?: string) => {
      const activeBook = getActiveBook(stateRef.current);
      const normalizedName = name.trim().toLowerCase();
      const normalizedEmail = email?.trim().toLowerCase();

      // Check if member with same name already exists
      const exists = activeBook.members.some(
        (m) => m.name.toLowerCase() === normalizedName,
      );
      if (exists) {
        toast.error(`${name.trim()} already exists.`);
        return;
      }

      // Capitalize first letter
      const capitalizedName =
        name.trim().charAt(0).toUpperCase() + name.trim().slice(1);

      const newMember: Member = {
        id: generateId(),
        name: capitalizedName,
        email: normalizedEmail,
        transactions: [],
      };
      if (!updateState((prev) => ({
        ...prev,
        books: prev.books.map((b) =>
          b.id === prev.activeBookId
            ? { ...b, members: [...b.members, newMember] }
            : b,
        ),
      }))) return;
      toast.success(
        normalizedEmail
          ? `${capitalizedName} added with email.`
          : `${capitalizedName} added.`,
      );
    },
    [updateState],
  );

  const handleUpdateMember = useCallback(
    (memberId: string, name: string, email: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedName = name.trim();
      
      if (!normalizedName) {
        toast.error("Name cannot be empty.");
        return;
      }

      if (!updateState((prev) => ({
        ...prev,
        books: prev.books.map((book) => {
          if (book.id !== prev.activeBookId) return book;
          return {
            ...book,
            members: book.members.map((member) =>
              member.id === memberId
                ? { ...member, name: normalizedName, email: normalizedEmail }
                : member,
            ),
          };
        }),
      }))) return;

      setSelectedMember((prev) =>
        prev && prev.id === memberId
          ? { ...prev, name: normalizedName, email: normalizedEmail }
          : prev,
      );
      toast.success(`Details saved for ${normalizedName}.`);
    },
    [updateState],
  );

  // ── Transactions ─────────────────────────────────────────
  const handleAddTransaction = useCallback(
    (
      type: "lena" | "dena",
      _amount: number,
      description: string,
      splits: TransactionSplit[],
      category?: TransactionCategory,
    ) => {
      if (splits.length === 0) {
        toast.error("Select at least one member.");
        return;
      }

      const memberIds = splits.map((split) => split.memberId);
      const splitAmounts = new Map(
        splits.map((split) => [split.memberId, roundMoney(split.amount)]),
      );
      const normalizedDescription = description.trim() || "Transaction";

      if (!updateState((prev) => ({
        ...prev,
        books: prev.books.map((b) => {
          if (b.id !== prev.activeBookId) return b;
          return {
            ...b,
            members: b.members.map((m) => {
              const memberAmount = splitAmounts.get(m.id);
              if (memberAmount === undefined) return m;

              const txn = {
                id: generateId(),
                type,
                amount: memberAmount,
                description: normalizedDescription,
                date: new Date().toISOString(),
                category,
                isGroupTransaction: memberIds.length > 1,
                splitWith:
                  memberIds.length > 1
                    ? memberIds.filter((id) => id !== m.id)
                    : undefined,
              };
              return { ...m, transactions: [...m.transactions, txn] };
            }),
          };
        }),
      }))) return;

      if (selectedMember) {
        const updatedMember = getActiveBook(stateRef.current).members.find(
          (member) => member.id === selectedMember.id,
        );
        setSelectedMember(updatedMember ?? null);
      }

      toast.success(
        splits.length > 1
          ? `Entry saved for ${splits.length} members.`
          : "Entry saved.",
      );
    },
    [selectedMember, updateState],
  );

  const handleDeleteTransaction = useCallback(
    (transactionId: string) => {
      if (!selectedMember) return;
      const transactionLabel =
        selectedMember.transactions.find((t) => t.id === transactionId)
          ?.description || "Transaction";
      const previousState = stateRef.current;
      if (!updateState((prev) => ({
        ...prev,
        books: prev.books.map((b) => {
          if (b.id !== prev.activeBookId) return b;
          return {
            ...b,
            members: b.members.map((m) =>
              m.id === selectedMember.id
                ? {
                    ...m,
                    transactions: m.transactions.filter(
                      (t) => t.id !== transactionId,
                    ),
                  }
                : m,
            ),
          };
        }),
      }))) return;
      setSelectedMember((prev) =>
        prev
          ? {
              ...prev,
              transactions: prev.transactions.filter(
                (t) => t.id !== transactionId,
              ),
            }
          : null,
      );
      showUndo(`${transactionLabel} deleted.`, previousState);
    },
    [selectedMember, showUndo, updateState],
  );

  const handleToggleTransactionCleared = useCallback(
    (transactionId: string, shouldClear: boolean) => {
      if (!selectedMember) return;

      const transactionLabel =
        selectedMember.transactions.find((t) => t.id === transactionId)
          ?.description || "Transaction";
      const clearedAt = shouldClear ? new Date().toISOString() : undefined;

      if (!updateState((prev) => ({
        ...prev,
        books: prev.books.map((b) => {
          if (b.id !== prev.activeBookId) return b;
          return {
            ...b,
            members: b.members.map((m) =>
              m.id === selectedMember.id
                ? {
                    ...m,
                    transactions: m.transactions.map((transaction) =>
                      transaction.id === transactionId
                        ? { ...transaction, clearedAt }
                        : transaction,
                    ),
                  }
                : m,
            ),
          };
        }),
      }))) return;

      toast.success(
        shouldClear
          ? `${transactionLabel} marked as cleared.`
          : `${transactionLabel} marked as active.`,
      );
    },
    [selectedMember, updateState],
  );

  const handleDeleteMember = useCallback(() => {
    if (!selectedMember) return;
    const memberName = selectedMember.name;
    const previousState = stateRef.current;
    if (!updateState((prev) => ({
      ...prev,
      books: prev.books.map((b) => {
        if (b.id !== prev.activeBookId) return b;
        return {
          ...b,
          members: b.members.filter((m) => m.id !== selectedMember.id),
        };
      }),
    }))) return;
    setSelectedMember(null);
    showUndo(`${memberName} and all transaction history deleted.`, previousState);
  }, [selectedMember, showUndo, updateState]);

  // ── Loading ───────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-stone-50 via-amber-50 to-sky-100 px-6 text-center">
        <div className="absolute inset-x-0 top-[-12%] mx-auto h-56 w-56 rounded-full bg-amber-200/45 blur-3xl" />
        <div className="absolute right-[-10%] bottom-[-8%] h-64 w-64 rounded-full bg-sky-200/55 blur-3xl" />

        <div className="relative z-10">
          <div className="mx-auto mb-5 flex h-16 w-16 animate-pulse items-center justify-center rounded-3xl bg-white/85 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.35)] backdrop-blur">
            <span className="text-sm font-black tracking-[0.32em] text-slate-900">
              HK
            </span>
          </div>
          <p className="text-base font-semibold text-slate-900">
            Hisaab Kitaab
          </p>
          <p className="mt-1 text-xs text-slate-600">Loading your ledger...</p>
        </div>

        <footer className="absolute bottom-6 z-10 rounded-full border border-border/70 bg-card/85 px-4 py-1.5 text-center backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/85">
            Made With ❤️ By Saksham Jain
          </p>
        </footer>
      </div>
    );
  }

  if (!state.userName) {
    return (
      <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-amber-50 via-stone-50 to-sky-100 px-6 text-center">
        <div className="absolute top-[-12%] left-[-8%] h-64 w-64 rounded-full bg-amber-200/55 blur-3xl" />
        <div className="absolute right-[-15%] bottom-[-10%] h-72 w-72 rounded-full bg-sky-200/55 blur-3xl" />
        <div className="absolute top-[16%] right-[8%] h-28 w-28 rounded-full bg-rose-200/45 blur-3xl" />

        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <div className="w-full max-w-sm rounded-[2rem] border border-white/70 bg-white/80 p-7 shadow-[0_30px_90px_-32px_rgba(15,23,42,0.28)] backdrop-blur-xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-200 via-orange-100 to-sky-200 shadow-[0_20px_40px_-24px_rgba(234,88,12,0.65)]">
              <span className="text-sm font-black tracking-[0.32em] text-slate-900">
                HK
              </span>
            </div>

            <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900">
              Hisaab Kitaab
            </h1>
            <p className="mb-8 px-4 text-sm font-medium text-slate-600">
              Manage transactions with privacy and ease.
            </p>

            <form onSubmit={handleSetName} className="space-y-3">
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="What's your name?"
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center text-base font-semibold text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-amber-300 focus:outline-none focus:ring-4 focus:ring-amber-100"
                />
              </div>
              <button
                type="submit"
                disabled={!nameInput.trim()}
                className="w-full rounded-2xl bg-slate-900 py-3 text-base font-bold text-white shadow-lg shadow-slate-900/15 transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-40">
                Let&apos;s Go
              </button>
            </form>
          </div>
        </div>

        <footer className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border/70 bg-card/85 px-4 py-1.5 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/85">
            Made With ❤️ By Saksham Jain
          </p>
        </footer>
      </div>
    );
  }

  if (isLocked) {
    return (
      <PinLock
        name={state.userName}
        avatar={state.userPhoto ? "📷" : state.userAvatar || "🦁"}
        onUnlock={handleUnlock}
      />
    );
  }

  if (showProfile) {
    return (
      <ProfileScreen
        name={state.userName}
        avatar={state.userAvatar}
        photo={state.userPhoto}
        hasPin={Boolean(state.pinHash)}
        onBack={() => setShowProfile(false)}
        onUpdateProfile={handleUpdateProfile}
        onSetPin={handleSetPin}
        onRemovePin={() => updateState((prev) => ({ ...prev, pinHash: undefined }))}
      />
    );
  }

  const activeBook = getActiveBook(state);

  // ── Member Detail ─────────────────────────────────────────
  if (selectedMember) {
    const currentMember = activeBook.members.find(
      (m) => m.id === selectedMember.id,
    );
    if (!currentMember) {
      setSelectedMember(null);
      return null;
    }
    return (
      <MemberDetail
        member={currentMember}
        members={activeBook.members}
        onBack={() => setSelectedMember(null)}
        onDeleteTransaction={handleDeleteTransaction}
        onToggleTransactionCleared={handleToggleTransactionCleared}
        onDeleteMember={handleDeleteMember}
        onUpdateMember={handleUpdateMember}
      />
    );
  }

  // ── Home ──────────────────────────────────────────────────
  return (
    <HomePage
      state={state}
      activeBook={activeBook}
      userName={state.userName || ""}
      onSelectMember={setSelectedMember}
      onAddMember={handleAddMember}
      onAddTransaction={handleAddTransaction}
      onAddBook={handleAddBook}
      onSwitchBook={handleSwitchBook}
      onRenameBook={handleRenameBook}
      onDeleteBook={handleDeleteBook}
      onUpdateUserName={handleUpdateUserName}
      onOpenProfile={() => setShowProfile(true)}
    />
  );
}
