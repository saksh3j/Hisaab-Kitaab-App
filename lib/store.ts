export type TransactionCategory =
  | "cash"
  | "food"
  | "travel"
  | "train"
  | "shopping"
  | "hotel"
  | "fuel"
  | "medical"
  | "recharge"
  | "other";

export interface Transaction {
  id: string;
  type: "lena" | "dena";
  amount: number;
  description: string;
  date: string;
  clearedAt?: string;
  category?: TransactionCategory;
  splitWith?: string[];
  isGroupTransaction?: boolean;
}

export interface TransactionSplit {
  memberId: string;
  amount: number;
}

export const CATEGORIES: {
  id: TransactionCategory;
  label: string;
  icon: string;
  color: string;
}[] = [
  {
    id: "cash",
    label: "Cash",
    icon: "💵",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  {
    id: "food",
    label: "Food",
    icon: "🍔",
    color: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
  {
    id: "travel",
    label: "Travel",
    icon: "✈️",
    color: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  },
  {
    id: "train",
    label: "Train",
    icon: "🚆",
    color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  },
  {
    id: "shopping",
    label: "Shopping",
    icon: "🛍️",
    color: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  },
  {
    id: "hotel",
    label: "Hotel",
    icon: "🏨",
    color: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  {
    id: "fuel",
    label: "Fuel",
    icon: "⛽",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  {
    id: "medical",
    label: "Medical",
    icon: "💊",
    color: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  {
    id: "recharge",
    label: "Recharge",
    icon: "📱",
    color: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  },
  {
    id: "other",
    label: "Other",
    icon: "📦",
    color: "bg-neutral-500/15 text-neutral-400 border-neutral-500/30",
  },
];

export interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string; // legacy local-storage field
  transactions: Transaction[];
}

export interface Book {
  id: string;
  name: string;
  createdAt: string;
  members: Member[];
}

export interface DeletedItem {
  id: string;
  kind: "transaction" | "member" | "book";
  label: string;
  amount?: number;
  deletedAt: string;
  bookId?: string;
  memberId?: string;
  transaction?: Transaction;
  member?: Member;
  book?: Book;
}

export interface AppState {
  books: Book[];
  activeBookId: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  userPhoto?: string;
  pinHash?: string;
  lastBackupAt?: string;
  deletedItems?: DeletedItem[];
}

export const STORAGE_KEY = "hisaab-kitaab-data";
export const BACKUP_VERSION = 1;

export interface BackupFile {
  version: number;
  exportedAt: string;
  state: AppState;
}

export type SaveStateResult =
  | { ok: true }
  | { ok: false; error: "storage-unavailable" | "storage-full" };

function createDefaultBook(): Book {
  return {
    id: "default",
    name: "Main Hisaab",
    createdAt: new Date().toISOString(),
    members: [],
  };
}

export function createDefaultState(): AppState {
  const defaultBook = createDefaultBook();
  return { books: [defaultBook], activeBookId: defaultBook.id };
}

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<AppState>;
  return (
    Array.isArray(candidate.books) &&
    typeof candidate.activeBookId === "string" &&
    candidate.books.every(
      (book) =>
        book &&
        typeof book.id === "string" &&
        typeof book.name === "string" &&
        Array.isArray(book.members),
    )
  );
}

export function migrateState(value: unknown): AppState | null {
  if (!value || typeof value !== "object") return null;

  const legacy = value as { members?: Member[]; books?: Book[] };
  if (Array.isArray(legacy.members) && !legacy.books) {
    const migratedBook: Book = {
      id: "default",
      name: "Main Hisaab",
      createdAt: new Date().toISOString(),
      members: legacy.members,
    };
    return { books: [migratedBook], activeBookId: migratedBook.id };
  }

  if (!isAppState(value)) return null;

  const activeBookExists = value.books.some(
    (book) => book.id === value.activeBookId,
  );
  if (value.books.length === 0) return createDefaultState();

  return {
    ...value,
    activeBookId: activeBookExists ? value.activeBookId : value.books[0].id,
  };
}

export function parseBackup(serialized: string): AppState | null {
  try {
    const parsed = JSON.parse(serialized) as BackupFile | AppState;
    const state = "state" in parsed ? parsed.state : parsed;
    return migrateState(state);
  } catch {
    return null;
  }
}

export function createBackup(state: AppState): string {
  const backup: BackupFile = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    state,
  };

  return JSON.stringify(backup, null, 2);
}

export async function hashPin(pin: string): Promise<string> {
  const encoded = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function getInitialState(): AppState {
  if (typeof window === "undefined") {
    return createDefaultState();
  }

  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    return createDefaultState();
  }

  if (stored) {
    return parseBackup(stored) ?? createDefaultState();
  }

  return createDefaultState();
}

export function saveState(state: AppState): SaveStateResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "storage-unavailable" };
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    return {
      ok: false,
      error: name === "QuotaExceededError" ? "storage-full" : "storage-unavailable",
    };
  }
}

export function getActiveBook(state: AppState): Book {
  return state.books.find((b) => b.id === state.activeBookId) ?? state.books[0];
}

export function isTransactionCleared(transaction: Transaction): boolean {
  return Boolean(transaction.clearedAt);
}

export function getActiveTransactions(
  transactions: Transaction[],
): Transaction[] {
  return transactions.filter(
    (transaction) => !isTransactionCleared(transaction),
  );
}

export function calculateTransactionSummary(transactions: Transaction[]) {
  const activeTransactions = getActiveTransactions(transactions);

  return activeTransactions.reduce(
    (acc, transaction) => {
      if (transaction.type === "lena") {
        acc.totalLena = roundMoney(acc.totalLena + transaction.amount);
        acc.balance = roundMoney(acc.balance + transaction.amount);
      } else {
        acc.totalDena = roundMoney(acc.totalDena + transaction.amount);
        acc.balance = roundMoney(acc.balance - transaction.amount);
      }
      return acc;
    },
    {
      totalLena: 0,
      totalDena: 0,
      balance: 0,
      activeCount: activeTransactions.length,
      clearedCount: transactions.length - activeTransactions.length,
    },
  );
}

export function calculateBalance(member: Member): number {
  return calculateTransactionSummary(member.transactions).balance;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function toMinorUnits(amount: number): number {
  return Math.round(roundMoney(amount) * 100);
}

export function fromMinorUnits(amount: number): number {
  return roundMoney(amount / 100);
}

export function formatCurrency(amount: number): string {
  return "₹" + currencyFormatter.format(Math.abs(roundMoney(amount)));
}

export function formatSignedCurrency(amount: number): string {
  const roundedAmount = roundMoney(amount);
  const sign = roundedAmount > 0 ? "+" : roundedAmount < 0 ? "-" : "";
  return sign + formatCurrency(roundedAmount);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function getTransactionMonthKey(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function formatTransactionMonth(monthKey: string): string {
  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!year || !month) return monthKey;

  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}
