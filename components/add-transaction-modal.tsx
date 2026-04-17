"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  X,
  Check,
  Search,
  Minus,
  Plus,
  Wallet,
  ShoppingBag,
} from "lucide-react";
import {
  Member,
  TransactionCategory,
  TransactionSplit,
  CATEGORIES,
  formatCurrency,
  roundMoney,
  toMinorUnits,
  fromMinorUnits,
} from "@/lib/store";
import { useBackHandler } from "@/hooks/use-back-handler";
import { useModalTransition } from "@/hooks/use-modal-transition";
import { useSwipeToClose } from "@/hooks/use-swipe-to-close";

interface AddTransactionModalProps {
  isOpen: boolean;
  members: Member[];
  mode: "payment" | "expense" | null;
  onClose: () => void;
  onAdd: (
    type: "lena" | "dena",
    amount: number,
    description: string,
    splits: TransactionSplit[],
    category?: TransactionCategory,
  ) => void;
}

type SplitMode = "equal" | "custom";
type EqualSplitPlan = {
  memberAmounts: Record<string, number>;
  selfAmount: number;
};

const STEP = 50;
const MIN_AMOUNT = 1;

const sanitizeMoneyInput = (value: string) => {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const integerPart = parts[0] ?? "";
  const decimalPart = parts.slice(1).join("").slice(0, 2);

  if (cleaned.startsWith(".")) {
    return `0.${decimalPart}`;
  }

  if (parts.length === 1) {
    return integerPart;
  }

  return `${integerPart}.${decimalPart}`;
};

const parseMoneyInput = (value: string) => {
  if (!value.trim()) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
};

const formatMoneyInput = (value: number) => {
  if (value <= 0) return "";
  return roundMoney(value)
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
};

const buildEqualSplitPlan = (
  memberIds: string[],
  totalAmount: number,
  includeMe: boolean,
): EqualSplitPlan => {
  const participants = includeMe ? [...memberIds, "__self__"] : memberIds;

  if (participants.length === 0 || totalAmount < MIN_AMOUNT) {
    return {
      memberAmounts: {} as Record<string, number>,
      selfAmount: 0,
    };
  }

  const totalMinorUnits = toMinorUnits(totalAmount);
  const baseShare = Math.floor(totalMinorUnits / participants.length);
  const remainder = totalMinorUnits - baseShare * participants.length;
  const memberAmounts: Record<string, number> = {};
  let selfAmount = 0;

  participants.forEach((participantId, index) => {
    const share = fromMinorUnits(baseShare + (index < remainder ? 1 : 0));

    if (participantId === "__self__") {
      selfAmount = share;
      return;
    }

    memberAmounts[participantId] = share;
  });

  return { memberAmounts, selfAmount };
};

export function AddTransactionModal({
  isOpen,
  members,
  mode,
  onClose,
  onAdd,
}: AddTransactionModalProps) {
  const lastModeRef = useRef<"payment" | "expense">(mode ?? "payment");
  if (mode !== null) {
    lastModeRef.current = mode;
  }
  const displayMode = mode ?? lastModeRef.current;

  const [subType, setSubType] = useState<"received" | "gave">("gave");
  const [amount, setAmount] = useState(0);
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TransactionCategory | undefined>(
    undefined,
  );
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [includeMeInSplit, setIncludeMeInSplit] = useState(true);
  const [customSplitInputs, setCustomSplitInputs] = useState<
    Record<string, string>
  >({});
  const [memberSearch, setMemberSearch] = useState("");
  const [submitError, setSubmitError] = useState("");

  useBackHandler(isOpen, onClose);
  const transition = useModalTransition(isOpen, 220);
  const swipe = useSwipeToClose({ isOpen, onClose, resetDelay: 0 });

  useEffect(() => {
    if (isOpen) {
      setSelectedMembers([]);
      setAmount(0);
      setAmountStr("");
      setDescription("");
      setCategory(undefined);
      setSubType("gave");
      setSplitMode("equal");
      setIncludeMeInSplit(true);
      setCustomSplitInputs({});
      setMemberSearch("");
      setSubmitError("");
    }
  }, [isOpen]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const s = memberSearch.toLowerCase();
    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(s) ||
        member.email?.toLowerCase().includes(s),
    );
  }, [memberSearch, members]);

  const memberLookup = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  );

  const selectedMembersKey = selectedMembers.join("|");
  const isPayment = displayMode === "payment";
  const shouldIncludeMe =
    !isPayment && includeMeInSplit && selectedMembers.length > 0;
  const shouldShowSplitSection =
    !isPayment && (selectedMembers.length > 1 || shouldIncludeMe);

  useEffect(() => {
    if (!isOpen) return;

    if (shouldShowSplitSection) {
      setSplitMode((current) => (current === "custom" ? "custom" : "equal"));

      setCustomSplitInputs((prev) => {
        const suggestions = buildEqualSplitPlan(
          selectedMembers,
          amount,
          shouldIncludeMe,
        ).memberAmounts;
        const next: Record<string, string> = {};
        let changed = Object.keys(prev).length !== selectedMembers.length;

        selectedMembers.forEach((memberId) => {
          if (prev[memberId] !== undefined) {
            next[memberId] = prev[memberId];
            return;
          }

          next[memberId] = formatMoneyInput(suggestions[memberId] ?? 0);
          changed = true;
        });

        return changed ? next : prev;
      });
      return;
    }

    setSplitMode("equal");
    setCustomSplitInputs((prev) =>
      Object.keys(prev).length === 0 ? prev : {},
    );
  }, [
    amount,
    isOpen,
    selectedMembers,
    selectedMembersKey,
    shouldIncludeMe,
    shouldShowSplitSection,
  ]);

  const handleAmountInput = (value: string) => {
    const sanitized = sanitizeMoneyInput(value);
    setAmountStr(sanitized);
    setAmount(parseMoneyInput(sanitized));
    setSubmitError("");
  };

  const handleAmountWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  const handleStep = (delta: number) => {
    const next = roundMoney(Math.max(0, amount + delta));
    setAmount(next);
    setAmountStr(next === 0 ? "" : formatMoneyInput(next));
    setSubmitError("");
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) => {
      if (isPayment) {
        return prev[0] === memberId ? [] : [memberId];
      }

      return prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId];
    });
    setSubmitError("");
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredMembers.map((member) => member.id));
    }
    setSubmitError("");
  };

  const activateCustomSplit = () => {
    setSplitMode("custom");
    setCustomSplitInputs((prev) => {
      const next = { ...prev };
      const suggestions = buildEqualSplitPlan(
        selectedMembers,
        amount,
        shouldIncludeMe,
      ).memberAmounts;

      selectedMembers.forEach((memberId) => {
        if (next[memberId] === undefined || !next[memberId].trim()) {
          next[memberId] = formatMoneyInput(suggestions[memberId] ?? 0);
        }
      });

      return next;
    });
    setSubmitError("");
  };

  const handleCustomSplitChange = (memberId: string, value: string) => {
    const sanitized = sanitizeMoneyInput(value);
    setCustomSplitInputs((prev) => ({
      ...prev,
      [memberId]: sanitized,
    }));
    setSubmitError("");
  };

  const getFinalType = (): "lena" | "dena" => {
    if (displayMode === "payment") {
      return subType === "received" ? "dena" : "lena";
    }

    return subType === "received" ? "dena" : "lena";
  };

  const finalType = getFinalType();

  const equalSplitPlan = useMemo(
    () => buildEqualSplitPlan(selectedMembers, amount, shouldIncludeMe),
    [amount, selectedMembers, selectedMembersKey, shouldIncludeMe],
  );

  const customSplitMap = useMemo(
    () =>
      selectedMembers.reduce<Record<string, number>>((acc, memberId) => {
        acc[memberId] = parseMoneyInput(customSplitInputs[memberId] ?? "");
        return acc;
      }, {}),
    [customSplitInputs, selectedMembers, selectedMembersKey],
  );

  const activeSplitMap = shouldShowSplitSection
    ? splitMode === "custom"
      ? customSplitMap
      : equalSplitPlan.memberAmounts
    : selectedMembers.length === 1
      ? { [selectedMembers[0]]: roundMoney(amount) }
      : {};

  const splitTotal = roundMoney(
    selectedMembers.reduce(
      (sum, memberId) => sum + (activeSplitMap[memberId] ?? 0),
      0,
    ),
  );

  const splitDifference = roundMoney(amount - splitTotal);
  const selfSplitAmount =
    shouldIncludeMe && shouldShowSplitSection
      ? splitMode === "custom"
        ? roundMoney(splitDifference)
        : equalSplitPlan.selfAmount
      : 0;

  const splitError = useMemo(() => {
    if (!amountStr.trim()) return "";
    if (amount > 0 && amount < MIN_AMOUNT) {
      return `Minimum amount is ${formatCurrency(MIN_AMOUNT)}.`;
    }
    if (!shouldShowSplitSection) return "";

    if (splitMode === "custom") {
      const invalidMember = selectedMembers.find(
        (memberId) => (customSplitMap[memberId] ?? 0) <= 0,
      );
      if (invalidMember) {
        const memberName =
          memberLookup.get(invalidMember)?.name ?? "Selected member";
        return `${memberName} ko split amount do ya unselect karo.`;
      }

      if (shouldIncludeMe && selfSplitAmount < 0.01) {
        return "Include me on hai, to apna share bhi bachaao.";
      }
    }

    if (!shouldIncludeMe && Math.abs(splitDifference) >= 0.01) {
      return splitDifference > 0
        ? `Total amount se ${formatCurrency(splitDifference)} kam split hua hai. Sahi se split karo.`
        : `Total amount se ${formatCurrency(Math.abs(splitDifference))} zyada split hua hai. Sahi se split karo.`;
    }

    return "";
  }, [
    amount,
    amountStr,
    customSplitMap,
    memberLookup,
    selectedMembers,
    splitDifference,
    splitMode,
    selfSplitAmount,
    shouldIncludeMe,
    shouldShowSplitSection,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedMembers.length === 0) {
      const message = "Kam se kam ek member select karo.";
      setSubmitError(message);
      toast.error(message);
      return;
    }

    if (amount < MIN_AMOUNT) {
      const message = `Minimum amount is ${formatCurrency(MIN_AMOUNT)}.`;
      setSubmitError(message);
      toast.error(message);
      return;
    }

    if (splitError) {
      setSubmitError(splitError);
      toast.error(splitError);
      return;
    }

    let splits = selectedMembers
      .map<TransactionSplit>((memberId) => ({
        memberId,
        amount: roundMoney(activeSplitMap[memberId] ?? 0),
      }))
      .filter((split) => split.amount > 0);

    if (!isPayment && shouldIncludeMe && subType === "received") {
      splits = splits.map((split) => ({
        ...split,
        amount: roundMoney(amount - split.amount),
      }));
    }

    if (splits.length !== selectedMembers.length) {
      const message = "Har selected member ke liye valid split amount bharo.";
      setSubmitError(message);
      toast.error(message);
      return;
    }

    const desc =
      description.trim() ||
      (category
        ? CATEGORIES.find((item) => item.id === category)?.label
        : undefined) ||
      (displayMode === "payment" ? "Payment" : "Expense");

    onAdd(finalType, amount, desc, splits, category);
    onClose();
  };

  const overlayStyle: React.CSSProperties = {
    opacity: transition.isVisible ? swipe.overlayOpacity : 0,
    transition: swipe.isDragging ? "none" : "opacity 160ms ease",
  };

  const panelStyle: React.CSSProperties = {
    transform: `translate3d(0, ${swipe.dragOffset + (transition.isVisible ? 0 : 18)}px, 0)`,
    opacity: transition.isVisible ? 1 : 0.98,
    transition: swipe.isDragging
      ? "none"
      : "transform 220ms cubic-bezier(0.22,1,0.36,1), opacity 180ms ease",
    willChange: "transform, opacity",
    backfaceVisibility: "hidden",
  };

  const displayError = submitError || splitError;
  const splitSummaryItems: Array<{
    label: string;
    value: string;
    highlight?: boolean;
    wide?: boolean;
  }> = shouldIncludeMe
    ? [
        { label: "Others", value: formatCurrency(splitTotal) },
        { label: "You", value: formatCurrency(selfSplitAmount) },
        {
          label: "Total",
          value: formatCurrency(amount),
          highlight: true,
          wide: true,
        },
      ]
    : [
        { label: "Split Total", value: formatCurrency(splitTotal) },
        {
          label: "Entered Total",
          value: formatCurrency(amount),
          highlight: true,
        },
      ];

  if (!transition.isMounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        style={overlayStyle}
        onClick={onClose}
      />

      <div
        className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-popover shadow-2xl safe-bottom"
        style={panelStyle}
      >
        <div
          className="flex shrink-0 cursor-grab justify-center pt-3 pb-1 active:cursor-grabbing touch-none"
          {...swipe.dragHandlers}
        >
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div
          className="flex shrink-0 items-center justify-between border-b border-border px-4 pt-4 pb-3"
          {...swipe.dragHandlers}
        >
          <div className="flex items-center gap-2">
            {isPayment ? (
              <Wallet className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            )}
            <h2 className="text-base font-semibold">
              {isPayment ? "Payment" : "Expense"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="app-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-4 pr-3 sm:pr-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSubType("gave");
                  setSubmitError("");
                }}
                className={`rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                  subType === "gave"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground"
                }`}
              >
                {isPayment ? "Gave" : "I Paid"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubType("received");
                  setSubmitError("");
                }}
                className={`rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                  subType === "received"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground"
                }`}
              >
                {isPayment ? "Received" : "They Paid"}
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">
                Amount
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStep(-STEP)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:bg-muted active:scale-95"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="relative flex-1">
                  <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm font-mono text-muted-foreground">
                    ₹
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountStr}
                    onChange={(e) => handleAmountInput(e.target.value)}
                    onWheel={handleAmountWheel}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-border bg-input py-3 pr-3 pl-7 text-center font-mono text-xl font-bold placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleStep(STEP)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:bg-muted active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex gap-1.5">
                {[100, 200, 500, 1000].map((quickAmount) => (
                  <button
                    key={quickAmount}
                    type="button"
                    onClick={() => {
                      setAmount(quickAmount);
                      setAmountStr(String(quickAmount));
                      setSubmitError("");
                    }}
                    className="flex-1 rounded-lg border border-border py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
                  >
                    +{quickAmount}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Minimum amount: {formatCurrency(MIN_AMOUNT)}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs text-muted-foreground">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategory(category === cat.id ? undefined : cat.id);
                      setSubmitError("");
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                      category === cat.id
                        ? `${cat.color} border-current`
                        : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">
                Note (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setSubmitError("");
                }}
                placeholder="Add a note..."
                className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs text-muted-foreground">
                  {isPayment
                    ? subType === "received"
                      ? "Kisse liya?"
                      : "Kisko diya?"
                    : subType === "received"
                      ? "Kisne pay kiya?"
                      : "Kiske liye pay kiya?"}
                </label>
                <div className="flex items-center gap-2">
                  {shouldShowSplitSection && (
                    <span className="rounded-full bg-foreground/6 px-2 py-1 text-[11px] font-medium text-foreground">
                      Split On
                    </span>
                  )}
                  {!isPayment && members.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-xs text-muted-foreground"
                    >
                      {selectedMembers.length === filteredMembers.length
                        ? "None"
                        : "All"}
                    </button>
                  )}
                </div>
              </div>

              {members.length > 4 && (
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full rounded-lg border border-border bg-input py-2 pr-3 pl-8 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              )}

              <div className="app-scrollbar app-scrollbar-compact max-h-40 space-y-1 overflow-y-auto pr-1">
                {members.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Pehle members add karo
                  </p>
                ) : filteredMembers.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Koi nahi mila
                  </p>
                ) : (
                  filteredMembers.map((member) => {
                    const selected = selectedMembers.includes(member.id);

                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleMember(member.id)}
                        className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${
                          selected
                            ? "border-foreground/20 bg-foreground/5"
                            : "border-border"
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                            selected
                              ? "border-foreground bg-foreground"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {selected && (
                            <Check className="h-3 w-3 text-background" />
                          )}
                        </div>
                        <span className="flex-1 text-left text-sm">
                          {member.name}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {!isPayment && selectedMembers.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIncludeMeInSplit((prev) => !prev);
                  setSubmitError("");
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors ${
                  includeMeInSplit
                    ? "border-foreground/20 bg-foreground/5"
                    : "border-border bg-muted/10"
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    includeMeInSplit
                      ? "border-foreground bg-foreground"
                      : "border-muted-foreground/30"
                  }`}
                >
                  {includeMeInSplit && (
                    <Check className="h-3 w-3 text-background" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Include me in split</p>
                  <p className="text-xs text-muted-foreground">
                    Your own share will also be counted in this expense.
                  </p>
                </div>
              </button>
            )}

            {shouldShowSplitSection && (
              <div className="space-y-4 rounded-[1.75rem] border border-border/80 bg-muted/20 p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="text-base font-semibold">Split Amount</p>
                    <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                      {includeMeInSplit
                        ? "Selected members ke saath tumhara share bhi count hoga."
                        : "Auto equal split ya custom member-wise amount."}
                    </p>
                  </div>
                  <div className="grid w-full grid-cols-2 rounded-2xl border border-border bg-background/60 p-1 text-sm sm:w-auto sm:min-w-[184px]">
                    <button
                      type="button"
                      onClick={() => {
                        setSplitMode("equal");
                        setSubmitError("");
                      }}
                      className={`min-w-0 rounded-xl px-4 py-2 font-medium transition-colors ${
                        splitMode === "equal"
                          ? "bg-foreground text-background"
                          : "text-muted-foreground"
                      }`}
                    >
                      Equal
                    </button>
                    <button
                      type="button"
                      onClick={activateCustomSplit}
                      className={`min-w-0 rounded-xl px-4 py-2 font-medium transition-colors ${
                        splitMode === "custom"
                          ? "bg-foreground text-background"
                          : "text-muted-foreground"
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedMembers.map((memberId) => {
                    const member = memberLookup.get(memberId);
                    if (!member) return null;

                    return (
                      <div
                        key={memberId}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-background px-3 py-3 sm:px-4"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium sm:text-base">
                          {member.name}
                        </span>
                        {splitMode === "custom" ? (
                          <div className="relative w-24 shrink-0 sm:w-28">
                            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                              ₹
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={customSplitInputs[memberId] ?? ""}
                              onChange={(e) =>
                                handleCustomSplitChange(
                                  memberId,
                                  e.target.value,
                                )
                              }
                              placeholder="0.00"
                              className="w-full rounded-xl border border-border bg-input py-2.5 pr-3 pl-7 text-right text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                        ) : (
                          <span className="shrink-0 text-sm font-semibold font-mono sm:text-base">
                            {formatCurrency(
                              equalSplitPlan.memberAmounts[memberId] ?? 0,
                            )}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {shouldIncludeMe && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-background px-3 py-3 sm:px-4">
                      <span className="text-sm font-medium sm:text-base">
                        You
                      </span>
                      <span className="shrink-0 text-sm font-semibold font-mono sm:text-base">
                        {formatCurrency(selfSplitAmount)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 sm:grid-cols-3">
                  {splitSummaryItems.map((item) => (
                    <div
                      key={item.label}
                      className={`${"wide" in item && item.wide ? "col-span-2 sm:col-span-1" : ""} rounded-2xl border px-3 py-2.5 ${
                        item.highlight
                          ? "border-foreground/15 bg-foreground/5"
                          : "border-border/70 bg-background/70"
                      }`}
                    >
                      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold font-mono sm:text-base">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border px-4 pt-3 pb-4">
            {selectedMembers.length > 0 && amount > 0 && (
              <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-border/80 bg-muted/15 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="leading-relaxed text-muted-foreground">
                  {isPayment
                    ? "1 member"
                    : !shouldShowSplitSection && selectedMembers.length === 1
                      ? "1 member"
                      : splitMode === "custom"
                        ? `Custom split • ${selectedMembers.length} member${
                            selectedMembers.length === 1 ? "" : "s"
                          }${shouldIncludeMe ? " + you" : ""}`
                        : `Equal split • ${selectedMembers.length} member${
                            selectedMembers.length === 1 ? "" : "s"
                          }${shouldIncludeMe ? " + you" : ""}`}
                </span>
                <span
                  className={`shrink-0 text-base font-mono font-bold ${
                    finalType === "lena" ? "text-success" : "text-danger"
                  }`}
                >
                  {finalType === "lena" ? "Lena" : "Dena"}:{" "}
                  {formatCurrency(amount)}
                </span>
              </div>
            )}

            {displayError && (
              <div className="mb-3 rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs text-danger">
                {displayError}
              </div>
            )}

            <button
              type="submit"
              disabled={
                amount < MIN_AMOUNT ||
                selectedMembers.length === 0 ||
                Boolean(splitError)
              }
              className={`w-full rounded-xl py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40 ${
                finalType === "lena" ? "bg-success" : "bg-danger"
              }`}
            >
              Add {isPayment ? "Payment" : "Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
