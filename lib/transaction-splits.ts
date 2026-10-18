import { fromMinorUnits, roundMoney, toMinorUnits } from "@/lib/store";

export type EqualSplitPlan = {
  memberAmounts: Record<string, number>;
  selfAmount: number;
};

export function buildEqualSplitPlan(
  memberIds: string[],
  totalAmount: number,
  includeMe: boolean,
): EqualSplitPlan {
  const participants = includeMe ? [...memberIds, "__self__"] : memberIds;

  if (participants.length === 0 || totalAmount < 1) {
    return { memberAmounts: {}, selfAmount: 0 };
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
    } else {
      memberAmounts[participantId] = share;
    }
  });

  return { memberAmounts, selfAmount };
}

export function isSplitTotalValid(totalAmount: number, splitAmounts: number[]) {
  return (
    toMinorUnits(roundMoney(totalAmount)) ===
    splitAmounts.reduce((sum, amount) => sum + toMinorUnits(amount), 0)
  );
}
