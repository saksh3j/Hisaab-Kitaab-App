"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { HomePage } from "@/components/home-page";
import { useBackHandler } from "@/hooks/use-back-handler";

const MemberDetail = dynamic(
  () => import("@/components/member-detail").then((mod) => mod.MemberDetail),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="mb-4 flex h-14 w-14 animate-pulse items-center justify-center rounded-3xl bg-gradient-to-br from-amber-100 via-orange-50 to-sky-100 shadow-[0_20px_50px_-32px_rgba(15,23,42,0.35)]">
          <span className="text-sm font-black tracking-[0.26em] text-slate-900">
            HK
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground">Opening details</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pulling member history...
        </p>
      </div>
    ),
  },
);
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
} from "@/lib/store";

export default function App() {
  const [state, setState] = useState<AppState>({
    books: [],
    activeBookId: "",
    userName: "",
  });
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useBackHandler(selectedMember !== null, () => setSelectedMember(null));

  useEffect(() => {
    const initialState = getInitialState();
    setState(initialState);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) saveState(state);
  }, [state, isLoaded]);

  const handleSetName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const trimmedName = nameInput.trim();
    setState((prev) => ({ ...prev, userName: trimmedName }));
  };

  const handleUpdateUserName = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Name cannot be empty.");
      return;
    }
    setState((prev) => ({ ...prev, userName: trimmedName }));
    toast.success("Name updated.");
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
    setState((prev) => ({
      ...prev,
      books: [...prev.books, newBook],
      activeBookId: newBook.id,
    }));
    setSelectedMember(null);
    toast.success(`${trimmedName} book created.`);
  }, []);

  const handleSwitchBook = useCallback((bookId: string) => {
    setState((prev) => ({ ...prev, activeBookId: bookId }));
    setSelectedMember(null);
  }, []);

  const handleRenameBook = useCallback((bookId: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Book name cannot be empty.");
      return;
    }
    setState((prev) => ({
      ...prev,
      books: prev.books.map((b) =>
        b.id === bookId ? { ...b, name: trimmedName } : b,
      ),
    }));
    toast.success(`Book renamed to ${trimmedName}.`);
  }, []);

  const handleDeleteBook = useCallback((bookId: string) => {
    let deletedBookName = "Book";
    setState((prev) => {
      deletedBookName =
        prev.books.find((b) => b.id === bookId)?.name ?? deletedBookName;
      const remaining = prev.books.filter((b) => b.id !== bookId);
      if (remaining.length === 0) {
        const defaultBook = {
          id: generateId(),
          name: "Main Hisaab",
          createdAt: new Date().toISOString(),
          members: [],
        };
        return { books: [defaultBook], activeBookId: defaultBook.id };
      }
      return {
        books: remaining,
        activeBookId:
          prev.activeBookId === bookId ? remaining[0].id : prev.activeBookId,
      };
    });
    setSelectedMember(null);
    toast.success(`${deletedBookName} deleted.`);
  }, []);

  // ── Members ──────────────────────────────────────────────
  const handleAddMember = useCallback(
    (name: string, email?: string) => {
      const activeBook = getActiveBook(state);
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
      setState((prev) => ({
        ...prev,
        books: prev.books.map((b) =>
          b.id === prev.activeBookId
            ? { ...b, members: [...b.members, newMember] }
            : b,
        ),
      }));
      toast.success(
        normalizedEmail
          ? `${capitalizedName} added with email.`
          : `${capitalizedName} added.`,
      );
    },
    [state],
  );

  const handleUpdateMemberEmail = useCallback(
    (memberId: string, email: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        toast.error("Email cannot be empty.");
        return;
      }

      const memberName =
        selectedMember?.id === memberId
          ? selectedMember.name
          : (getActiveBook(state).members.find(
              (member) => member.id === memberId,
            )?.name ?? "Member");

      setState((prev) => ({
        ...prev,
        books: prev.books.map((book) => {
          if (book.id !== prev.activeBookId) return book;
          return {
            ...book,
            members: book.members.map((member) =>
              member.id === memberId
                ? { ...member, email: normalizedEmail }
                : member,
            ),
          };
        }),
      }));

      setSelectedMember((prev) =>
        prev && prev.id === memberId
          ? { ...prev, email: normalizedEmail }
          : prev,
      );
      toast.success(`Email saved for ${memberName}.`);
    },
    [selectedMember, state],
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

      setState((prev) => ({
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
      }));

      if (selectedMember) {
        const selectedMemberAmount = splitAmounts.get(selectedMember.id);
        if (selectedMemberAmount === undefined) return;

        const txn = {
          id: generateId(),
          type,
          amount: selectedMemberAmount,
          description: normalizedDescription,
          date: new Date().toISOString(),
          category,
          isGroupTransaction: memberIds.length > 1,
          splitWith:
            memberIds.length > 1
              ? memberIds.filter((id) => id !== selectedMember.id)
              : undefined,
        };
        setSelectedMember((prev) =>
          prev ? { ...prev, transactions: [...prev.transactions, txn] } : null,
        );
      }

      toast.success(
        splits.length > 1
          ? `Entry saved for ${splits.length} members.`
          : "Entry saved.",
      );
    },
    [selectedMember],
  );

  const handleDeleteTransaction = useCallback(
    (transactionId: string) => {
      if (!selectedMember) return;
      const transactionLabel =
        selectedMember.transactions.find((t) => t.id === transactionId)
          ?.description || "Transaction";
      setState((prev) => ({
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
      }));
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
      toast.success(`${transactionLabel} deleted.`);
    },
    [selectedMember],
  );

  const handleToggleTransactionCleared = useCallback(
    (transactionId: string, shouldClear: boolean) => {
      if (!selectedMember) return;

      const transactionLabel =
        selectedMember.transactions.find((t) => t.id === transactionId)
          ?.description || "Transaction";
      const clearedAt = shouldClear ? new Date().toISOString() : undefined;

      setState((prev) => ({
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
      }));

      toast.success(
        shouldClear
          ? `${transactionLabel} marked as cleared.`
          : `${transactionLabel} marked as active.`,
      );
    },
    [selectedMember],
  );

  const handleDeleteMember = useCallback(() => {
    if (!selectedMember) return;
    const memberName = selectedMember.name;
    setState((prev) => ({
      ...prev,
      books: prev.books.map((b) => {
        if (b.id !== prev.activeBookId) return b;
        return {
          ...b,
          members: b.members.filter((m) => m.id !== selectedMember.id),
        };
      }),
    }));
    setSelectedMember(null);
    toast.success(`${memberName} deleted.`);
  }, [selectedMember]);

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
                Let's Go
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
        onBack={() => setSelectedMember(null)}
        onDeleteTransaction={handleDeleteTransaction}
        onToggleTransactionCleared={handleToggleTransactionCleared}
        onDeleteMember={handleDeleteMember}
        onUpdateMemberEmail={handleUpdateMemberEmail}
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
    />
  );
}
