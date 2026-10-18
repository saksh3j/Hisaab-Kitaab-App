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

export interface AppState {
  books: Book[];
  activeBookId: string;
  userName?: string;
  userEmail?: string;
}

const STORAGE_KEY = "hisaab-kitaab-data";

function createDefaultBook(): Book {
  return {
    id: "default",
    name: "Main Hisaab",
    createdAt: new Date().toISOString(),
    members: [],
  };
}

export function getInitialState(): AppState {
  if (typeof window === "undefined") {
    const defaultBook = createDefaultBook();
    return { books: [defaultBook], activeBookId: defaultBook.id };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // migrate old format (had `members` at root)
      if (parsed.members && !parsed.books) {
        const migratedBook: Book = {
          id: "default",
          name: "Main Hisaab",
          createdAt: new Date().toISOString(),
          members: parsed.members,
        };
        return { books: [migratedBook], activeBookId: "default" };
      }
      return parsed;
    } catch {
      const defaultBook = createDefaultBook();
      return { books: [defaultBook], activeBookId: defaultBook.id };
    }
  }

  const defaultBook = createDefaultBook();
  return { books: [defaultBook], activeBookId: defaultBook.id };
}

export function saveState(state: AppState): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
