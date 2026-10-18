import { describe, expect, it } from "vitest";
import { buildEqualSplitPlan, isSplitTotalValid } from "../lib/transaction-splits";

describe("transaction splitting", () => {
  it("splits decimal values exactly in minor currency units", () => {
    const split = buildEqualSplitPlan(["a", "b", "c"], 10.01, false);
    expect(split.memberAmounts).toEqual({ a: 3.34, b: 3.34, c: 3.33 });
    expect(isSplitTotalValid(10.01, Object.values(split.memberAmounts))).toBe(true);
  });

  it("includes the payer when requested without losing paise", () => {
    const split = buildEqualSplitPlan(["a", "b"], 100, true);
    expect(split.memberAmounts).toEqual({ a: 33.34, b: 33.33 });
    expect(split.selfAmount).toBe(33.33);
    expect(
      isSplitTotalValid(100, [...Object.values(split.memberAmounts), split.selfAmount]),
    ).toBe(true);
  });

  it("rejects mismatched custom split totals", () => {
    expect(isSplitTotalValid(100, [40, 59.99])).toBe(false);
  });
});
