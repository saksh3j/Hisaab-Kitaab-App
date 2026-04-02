"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Member,
  Book,
  AppState,
  TransactionCategory,
  TransactionSplit,
  CATEGORIES,
  calculateBalance,
  formatCurrency,
  formatSignedCurrency,
  formatDate,
  formatTransactionMonth,
  getTransactionMonthKey,
  isTransactionCleared,
} from "@/lib/store";
import { MemberCard } from "./member-card";
import { AddMemberModal } from "./add-member-modal";
import { AddTransactionModal } from "./add-transaction-modal";
import { MonthFilterSheet } from "./month-filter-sheet";
import { useBackHandler } from "@/hooks/use-back-handler";
import { useModalTransition } from "@/hooks/use-modal-transition";
import { useSwipeToClose } from "@/hooks/use-swipe-to-close";
import {
  Search,
  UserPlus,
  Users,
  Receipt,
  Wallet,
  ShoppingBag,
  BookOpen,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  Check,
  Sun,
    Moon,
    ReceiptIndianRupee,
    CalendarRange,
  } from "lucide-react";

interface HomePageProps {
  state: AppState;
  activeBook: Book;
  userName: string;
  onSelectMember: (member: Member) => void;
  onAddMember: (name: string, email?: string) => void;
  onAddTransaction: (
    type: "lena" | "dena",
    amount: number,
    description: string,
    splits: TransactionSplit[],
    category?: TransactionCategory,
  ) => void;
  onAddBook: (name: string) => void;
  onSwitchBook: (bookId: string) => void;
  onRenameBook: (bookId: string, name: string) => void;
  onDeleteBook: (bookId: string) => void;
  onUpdateUserName: (name: string) => void;
}

export function HomePage({
  state,
  activeBook,
  userName,
  onSelectMember,
  onAddMember,
  onAddTransaction,
  onAddBook,
  onSwitchBook,
  onRenameBook,
  onDeleteBook,
  onUpdateUserName,
}: HomePageProps) {
  const [search, setSearch] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [transactionMode, setTransactionMode] = useState<
    "payment" | "expense" | null
  >(null);
  const [activeTab, setActiveTab] = useState<"members" | "transactions">(
    "members",
  );
  const [showBooks, setShowBooks] = useState(false);
  const [newBookName, setNewBookName] = useState("");
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingBookName, setEditingBookName] = useState("");
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempUserName, setTempUserName] = useState(userName);
  const [showHistoryFilter, setShowHistoryFilter] = useState(false);
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState("all");
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useBackHandler(showBooks, () => setShowBooks(false));
  useBackHandler(bookToDelete !== null, () => setBookToDelete(null));
  const booksTransition = useModalTransition(showBooks, 220);
  const bookDeleteTransition = useModalTransition(bookToDelete !== null, 180);
  const swipe = useSwipeToClose({
    isOpen: showBooks,
    onClose: () => setShowBooks(false),
    resetDelay: 0,
  });

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const tabSwipeStartX = useRef(0);
  const tabSwipeStartY = useRef(0);

  const members = activeBook.members;

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const s = search.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(s) ||
        m.email?.toLowerCase().includes(s),
    );
  }, [members, search]);

  const totals = useMemo(() => {
    let lena = 0,
      dena = 0;
    members.forEach((m) => {
      const b = calculateBalance(m);
      if (b > 0) lena += b;
      else dena += Math.abs(b);
    });
    return { lena, dena, net: lena - dena };
  }, [members]);

  const allTransactions = useMemo(() => {
    const txns: Array<{
      transaction: Member["transactions"][0];
      memberName: string;
    }> = [];
    members.forEach((m) =>
      m.transactions.forEach((t) =>
        txns.push({ transaction: t, memberName: m.name }),
      ),
    );
    return txns.sort(
      (a, b) =>
        new Date(b.transaction.date).getTime() -
        new Date(a.transaction.date).getTime(),
    );
  }, [members]);

  const historyMonthOptions = useMemo(() => {
    const counts = new Map<string, number>();

    allTransactions.forEach(({ transaction }) => {
      const monthKey = getTransactionMonthKey(transaction.date);
      counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, count]) => ({
        key,
        label: formatTransactionMonth(key),
        count,
      }));
  }, [allTransactions]);

  const filteredHistoryTransactions = useMemo(() => {
    if (selectedHistoryMonth === "all") return allTransactions;

    return allTransactions.filter(
      ({ transaction }) =>
        getTransactionMonthKey(transaction.date) === selectedHistoryMonth,
    );
  }, [allTransactions, selectedHistoryMonth]);

  useEffect(() => {
    if (selectedHistoryMonth === "all") return;

    const monthStillExists = historyMonthOptions.some(
      (option) => option.key === selectedHistoryMonth,
    );

    if (!monthStillExists) {
      setSelectedHistoryMonth("all");
    }
  }, [historyMonthOptions, selectedHistoryMonth]);

  const handleAddBook = () => {
    if (!newBookName.trim()) {
      toast.error("Book name is required.");
      return;
    }
    onAddBook(newBookName.trim());
    setNewBookName("");
  };

  const handleRenameBook = (bookId: string) => {
    if (!editingBookName.trim()) {
      toast.error("Book name cannot be empty.");
      return;
    }
    onRenameBook(bookId, editingBookName.trim());
    setEditingBookId(null);
  };

  const handleTabSwipeStart = (e: React.TouchEvent) => {
    tabSwipeStartX.current = e.changedTouches[0].screenX;
    tabSwipeStartY.current = e.changedTouches[0].screenY;
  };

  const handleTabSwipeEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].screenX - tabSwipeStartX.current;
    const deltaY = e.changedTouches[0].screenY - tabSwipeStartY.current;

    // Only react to mostly-horizontal swipes.
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0 && activeTab === "transactions") {
      setActiveTab("members");
      return;
    }

    if (deltaX > 0 && activeTab === "members") {
      setActiveTab("transactions");
    }
  };

  const booksOverlayStyle: React.CSSProperties = {
    opacity: booksTransition.isVisible ? swipe.overlayOpacity : 0,
    transition: swipe.isDragging
      ? "none"
      : "opacity 160ms ease",
  };

  const booksPanelStyle: React.CSSProperties = {
    transform: `translate3d(0, ${swipe.dragOffset + (booksTransition.isVisible ? 0 : 18)}px, 0)`,
    opacity: booksTransition.isVisible ? 1 : 0.98,
    transition: swipe.isDragging
      ? "none"
      : "transform 220ms cubic-bezier(0.22,1,0.36,1), opacity 180ms ease",
    willChange: "transform, opacity",
    backfaceVisibility: "hidden",
  };

  const bookDeleteOverlayStyle: React.CSSProperties = {
    opacity: bookDeleteTransition.isVisible ? 1 : 0,
    transition: "opacity 140ms ease",
  };

  const bookDeleteDialogStyle: React.CSSProperties = {
    transform: `translate3d(0, ${bookDeleteTransition.isVisible ? 0 : 10}px, 0)`,
    opacity: bookDeleteTransition.isVisible ? 1 : 0.98,
    transition: "transform 180ms cubic-bezier(0.22,1,0.36,1), opacity 140ms ease",
    willChange: "transform, opacity",
    backfaceVisibility: "hidden",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}

      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md safe-top border-b border-border">
        <div className="px-4 pt-6 pb-4 space-y-5">
          {/* Greeting */}
          <div className="flex w-full items-center justify-start">
            {isEditingName ? (
              <div className="flex max-w-xs items-center gap-2">
                <input
                  autoFocus
                  value={tempUserName}
                  onChange={(e) => setTempUserName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onUpdateUserName(tempUserName);
                      setIsEditingName(false);
                    }
                    if (e.key === "Escape") {
                      setTempUserName(userName);
                      setIsEditingName(false);
                    }
                  }}
                  className="bg-muted border border-border rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 flex-1 text-center"
                />
                <button
                  onClick={() => {
                    onUpdateUserName(tempUserName);
                    setIsEditingName(false);
                  }}
                  className="p-1 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-left shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Welcome
                </p>
                <div className="flex items-center gap-1">
                  <h2 className="text-sm font-semibold text-foreground">
                    {userName}
                  </h2>
                  <span className="text-sm">👋</span>
                  <button
                    onClick={() => {
                      setTempUserName(userName);
                      setIsEditingName(true);
                    }}
                    className="p-0.5 rounded-md hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="w-2 h-2.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Book Selector & Theme/Add Row */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowBooks(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted transition-all active:scale-95"
            >
              <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs font-bold truncate max-w-[100px]">
                {activeBook.name}
              </span>
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-border hover:bg-muted transition-all active:scale-95"
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                )}
              </button>
              <button
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/10 active:scale-95 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Transaction Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTransactionMode("payment")}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-success/10 border border-success/20 text-success hover:bg-success/15 active:scale-[0.98] transition-all group"
            >
              <Wallet className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">Payment</span>
            </button>
            <button
              onClick={() => setTransactionMode("expense")}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-danger/10 border border-danger/20 text-danger hover:bg-danger/15 active:scale-[0.98] transition-all group"
            >
              <ShoppingBag className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">Expense</span>
            </button>
          </div>

          {/* Search Bar - More compact */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full pl-9 pr-3 py-2 bg-muted/50 border border-transparent rounded-xl text-xs font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:bg-muted focus:border-border transition-all"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex">
          {(["members", "transactions"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              {tab === "members" ? (
                <Users className="w-3 h-3" />
              ) : (
                <ReceiptIndianRupee className="w-3 h-3" />
              )}
              {tab === "members" ? "Members" : "History"}
              {tab === "members" && members.length > 0 && (
                <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                  {members.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Summary strip - Compact */}
      <div className="px-4 py-2 grid grid-cols-3 gap-2 border-b border-border bg-muted/20">
        <div className="text-center">
          <p className="text-[9px] text-muted-foreground mb-0.5 uppercase tracking-wider">
            Lena
          </p>
          <p className="text-xs font-bold text-success font-mono tabular-nums">
            {formatCurrency(totals.lena)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-muted-foreground mb-0.5 uppercase tracking-wider">
            Dena
          </p>
          <p className="text-xs font-bold text-danger font-mono tabular-nums">
            {formatCurrency(totals.dena)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-muted-foreground mb-0.5 uppercase tracking-wider">
            Net
          </p>
          <p
            className={`text-xs font-bold font-mono tabular-nums ${totals.net >= 0 ? "text-success" : "text-danger"}`}
          >
            {formatSignedCurrency(totals.net)}
          </p>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 px-4 py-3"
        onTouchStart={handleTabSwipeStart}
        onTouchEnd={handleTabSwipeEnd}
      >
        {activeTab === "members" ? (
          filteredMembers.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              {members.length === 0 ? (
                <>
                  <p className="text-sm font-medium mb-1">No members yet</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Add someone to start
                  </p>
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium"
                  >
                    Add Member
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium mb-1">No results</p>
                  <p className="text-xs text-muted-foreground">
                    Nothing matches &quot;{search}&quot;
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers
                .sort(
                  (a, b) =>
                    Math.abs(calculateBalance(b)) -
                    Math.abs(calculateBalance(a)),
                )
                .map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    onClick={() => onSelectMember(member)}
                  />
                ))}
            </div>
          )
        ) : allTransactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">No transactions yet</p>
            <p className="text-xs text-muted-foreground">
              Use Payment or Expense buttons above
            </p>
          </div>
        ) : filteredHistoryTransactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <CalendarRange className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">
              No transactions in {formatTransactionMonth(selectedHistoryMonth)}
            </p>
            <p className="text-xs text-muted-foreground">
              Dusra month select karo ya All Months dekh lo.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredHistoryTransactions.map(({ transaction, memberName }) => {
              const cat = transaction.category
                ? CATEGORIES.find((c) => c.id === transaction.category)
                : null;
              const isCleared = isTransactionCleared(transaction);
              return (
                <div
                  key={transaction.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                    isCleared
                      ? "border-success/20 bg-success/5"
                      : "bg-card border-border"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                      cat
                        ? cat.color
                        : transaction.type === "lena"
                          ? "bg-success/10 text-success"
                          : "bg-danger/10 text-danger"
                    }`}
                  >
                    {cat ? cat.icon : memberName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`truncate text-sm font-medium ${
                          isCleared ? "text-muted-foreground line-through" : ""
                        }`}
                      >
                        {transaction.description}
                      </p>
                      {isCleared && (
                        <span className="rounded-full border border-success/20 bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                          Cleared
                        </span>
                      )}
                      {cat && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${cat.color} border`}
                        >
                          {cat.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-muted-foreground">
                        {memberName}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        · {formatDate(transaction.date)}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-bold font-mono tabular-nums ${
                        isCleared
                          ? "text-muted-foreground line-through"
                          : transaction.type === "lena"
                            ? "text-success"
                            : "text-danger"
                      }`}
                    >
                      {transaction.type === "lena" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </p>
                    {isCleared && (
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                        cleared
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeTab === "transactions" && allTransactions.length > 0 && (
        <button
          type="button"
          onClick={() => setShowHistoryFilter(true)}
          className="fixed right-4 z-20 inline-flex items-center gap-2 rounded-full border border-border/80 bg-popover/95 px-4 py-3 text-sm font-semibold text-foreground shadow-[0_18px_40px_-24px_rgba(15,23,42,0.55)] backdrop-blur"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        >
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          <span>
            {selectedHistoryMonth === "all"
              ? "All Months"
              : formatTransactionMonth(selectedHistoryMonth)}
          </span>
        </button>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-card/95 py-3 text-center backdrop-blur">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/85">
          Made With ❤️ By Saksham Jain
        </p>
      </footer>

      {/* ── Books Drawer ────────────────────────────────────── */}
      {booksTransition.isMounted && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/40 transition-opacity"
            style={booksOverlayStyle}
            onClick={() => setShowBooks(false)}
          />
          <div
            className="relative flex max-h-[80vh] w-full flex-col overflow-hidden rounded-t-2xl bg-popover shadow-2xl safe-bottom"
            style={booksPanelStyle}
          >
            {/* Drag handle pill */}
            <div
              className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing touch-none"
              {...swipe.dragHandlers}
            >
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div
              className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border"
              {...swipe.dragHandlers}
            >
              <h2 className="text-base font-semibold">My Hisaab Books</h2>
              <button
                onClick={() => setShowBooks(false)}
                className="p-1.5 rounded-lg hover:bg-muted"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
              {state.books.map((book) => (
                <div
                  key={book.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                    book.id === state.activeBookId
                      ? "bg-foreground/5 border-foreground/20"
                      : "border-border"
                  }`}
                >
                  {editingBookId === book.id ? (
                    <>
                      <input
                        autoFocus
                        value={editingBookName}
                        onChange={(e) => setEditingBookName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameBook(book.id);
                          if (e.key === "Escape") setEditingBookId(null);
                        }}
                        className="flex-1 bg-input border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <button
                        onClick={() => handleRenameBook(book.id)}
                        className="p-1.5 rounded-lg hover:bg-muted text-success"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingBookId(null)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="flex-1 flex items-center gap-2 text-left"
                        onClick={() => {
                          onSwitchBook(book.id);
                          setShowBooks(false);
                        }}
                      >
                        <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {book.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {book.members.length} member
                            {book.members.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        {book.id === state.activeBookId && (
                          <span className="ml-auto text-[10px] bg-foreground text-background px-1.5 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingBookId(book.id);
                          setEditingBookName(book.name);
                        }}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {state.books.length > 1 && (
                        <button
                          onClick={() => setBookToDelete(book)}
                          className="p-1.5 rounded-lg hover:bg-muted text-danger"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* New book input */}
            <div className="px-4 pb-4 pt-2 border-t border-border">
              <div className="flex gap-2">
                <input
                  value={newBookName}
                  onChange={(e) => setNewBookName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddBook()}
                  placeholder="New book (e.g. Trip Goa)"
                  className="flex-1 px-3 py-2.5 bg-input border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={handleAddBook}
                  disabled={!newBookName.trim()}
                  className="px-4 py-2.5 bg-foreground text-background rounded-xl text-sm font-medium disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {bookDeleteTransition.isMounted && bookToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            style={bookDeleteOverlayStyle}
            onClick={() => setBookToDelete(null)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl bg-popover p-5 shadow-2xl"
            style={bookDeleteDialogStyle}
          >
            <h3 className="mb-2 text-lg font-semibold">Delete Book?</h3>
            <p className="mb-5 text-sm text-muted-foreground">
              {bookToDelete.name} aur uske saare members ka hisaab delete ho jayega.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBookToDelete(null)}
                className="flex-1 rounded-lg bg-muted py-2.5 font-medium text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteBook(bookToDelete.id);
                  setBookToDelete(null);
                  setShowBooks(false);
                }}
                className="flex-1 rounded-lg bg-danger py-2.5 font-medium text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <MonthFilterSheet
        isOpen={showHistoryFilter}
        title="History Filter"
        selectedKey={selectedHistoryMonth}
        totalCount={allTransactions.length}
        options={historyMonthOptions}
        onSelect={setSelectedHistoryMonth}
        onClose={() => setShowHistoryFilter(false)}
      />

      {/* Modals */}
      <AddMemberModal
        isOpen={showAddMember}
        members={members}
        onClose={() => setShowAddMember(false)}
        onAdd={onAddMember}
      />
      <AddTransactionModal
        isOpen={transactionMode !== null}
        members={members}
        mode={transactionMode}
        onClose={() => setTransactionMode(null)}
        onAdd={onAddTransaction}
      />
    </div>
  );
}
