import { afterEach, describe, expect, it } from "vitest";
import {
  AppState,
  calculateBalance,
  calculateTransactionSummary,
  createBackup,
  migrateState,
  parseBackup,
  saveState,
} from "../lib/store";

const originalWindow = globalThis.window;
const originalStorage = globalThis.localStorage;

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: originalStorage,
  });
});

const state: AppState = {
  activeBookId: "book-1",
  books: [
    {
      id: "book-1",
      name: "Trip",
      createdAt: "2026-01-01T00:00:00.000Z",
      members: [
        {
          id: "member-1",
          name: "Aman",
          transactions: [
            { id: "1", type: "lena", amount: 100.25, description: "Taxi", date: "2026-01-01" },
            { id: "2", type: "dena", amount: 25.1, description: "Food", date: "2026-01-02" },
            { id: "3", type: "lena", amount: 50, description: "Old", date: "2026-01-03", clearedAt: "2026-01-04" },
          ],
        },
      ],
    },
  ],
};

describe("ledger calculations", () => {
  it("calculates decimal balances without including cleared entries", () => {
    const member = state.books[0].members[0];
    expect(calculateBalance(member)).toBe(75.15);
    expect(calculateTransactionSummary(member.transactions)).toEqual({
      totalLena: 100.25,
      totalDena: 25.1,
      balance: 75.15,
      activeCount: 2,
      clearedCount: 1,
    });
  });
});

describe("migration and backups", () => {
  it("migrates the legacy root members shape", () => {
    const migrated = migrateState({ members: state.books[0].members });
    expect(migrated?.activeBookId).toBe("default");
    expect(migrated?.books[0].members).toHaveLength(1);
  });

  it("exports and restores a valid backup", () => {
    expect(parseBackup(createBackup(state))).toEqual(state);
  });

  it("rejects malformed backup data and repairs a missing active book", () => {
    expect(parseBackup("not json")).toBeNull();
    const restored = migrateState({ ...state, activeBookId: "missing" });
    expect(restored?.activeBookId).toBe("book-1");
  });

  it("reports a full local storage failure instead of claiming the state saved", () => {
    Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {
          throw new DOMException("Storage full", "QuotaExceededError");
        },
      },
    });

    expect(saveState(state)).toEqual({ ok: false, error: "storage-full" });
  });
});
