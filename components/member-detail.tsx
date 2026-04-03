"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Member,
  Transaction,
  CATEGORIES,
  calculateBalance,
  calculateTransactionSummary,
  formatCurrency,
  formatDate,
  formatTransactionMonth,
  getTransactionMonthKey,
  isTransactionCleared,
  roundMoney,
} from "@/lib/store";
import { MonthFilterSheet } from "./month-filter-sheet";
import {
  ArrowLeft,
  Download,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarRange,
  Check,
  Undo2,
  Mail,
  Send,
  UserPen,
} from "lucide-react";
import { useBackHandler } from "@/hooks/use-back-handler";
import { useModalTransition } from "@/hooks/use-modal-transition";

interface MemberDetailProps {
  member: Member;
  onBack: () => void;
  onDeleteTransaction: (transactionId: string) => void;
  onToggleTransactionCleared: (
    transactionId: string,
    shouldClear: boolean,
  ) => void;
  onDeleteMember: () => void;
  onUpdateMember: (memberId: string, name: string, email: string) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MemberDetail({
  member,
  onBack,
  onDeleteTransaction,
  onToggleTransactionCleared,
  onDeleteMember,
  onUpdateMember,
}: MemberDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const [showMonthFilter, setShowMonthFilter] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editNameInput, setEditNameInput] = useState("");
  const [editEmailInput, setEditEmailInput] = useState("");
  const [editError, setEditError] = useState("");

  useBackHandler(showDeleteConfirm, () => setShowDeleteConfirm(false));
  useBackHandler(transactionToDelete !== null, () =>
    setTransactionToDelete(null),
  );
  const deleteConfirmTransition = useModalTransition(showDeleteConfirm, 180);
  const transactionDeleteTransition = useModalTransition(
    transactionToDelete !== null,
    180,
  );
  const closeEmailCapture = () => {
    if (isSendingEmail) return;
    setShowEmailCapture(false);
    setEmailError("");
  };
  useBackHandler(showEmailCapture, closeEmailCapture);
  const emailCaptureTransition = useModalTransition(showEmailCapture, 180);

  const closeEditSheet = () => {
    setShowEditSheet(false);
    setEditError("");
  };
  useBackHandler(showEditSheet, closeEditSheet);
  const editSheetTransition = useModalTransition(showEditSheet, 180);

  const { totalLena, totalDena, activeCount, clearedCount } =
    calculateTransactionSummary(member.transactions);
  const balance = calculateBalance(member);
  const isPositive = balance >= 0;
  const monthOptions = useMemo(() => {
    const counts = new Map<string, number>();

    member.transactions.forEach((transaction) => {
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
  }, [member.transactions]);

  const filteredTransactions = useMemo(() => {
    if (selectedMonth === "all") return member.transactions;

    return member.transactions.filter(
      (transaction) =>
        getTransactionMonthKey(transaction.date) === selectedMonth,
    );
  }, [member.transactions, selectedMonth]);

  useEffect(() => {
    if (selectedMonth === "all") return;

    const monthStillExists = monthOptions.some(
      (option) => option.key === selectedMonth,
    );

    if (!monthStillExists) {
      setSelectedMonth("all");
    }
  }, [monthOptions, selectedMonth]);

  const createPdfDocument = async () => {
    if (typeof window === "undefined") return;
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    const footerY = pageHeight - 24;
    const generatedAt = new Date();
    const generatedTimestamp = new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(generatedAt);
    const fileTimestamp = `${generatedAt.getFullYear()}-${String(
      generatedAt.getMonth() + 1,
    ).padStart(
      2,
      "0",
    )}-${String(generatedAt.getDate()).padStart(2, "0")}_${String(
      generatedAt.getHours(),
    ).padStart(2, "0")}-${String(generatedAt.getMinutes()).padStart(2, "0")}`;
    const pdfCurrencyFormatter = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const formatPdfDate = (value: string) =>
      new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    const formatPdfCurrency = (value: number) =>
      `Rs. ${pdfCurrencyFormatter.format(Math.abs(roundMoney(value)))}`;
    const formatSignedPdfCurrency = (value: number) =>
      `${value >= 0 ? "+" : "-"} ${formatPdfCurrency(value)}`;
    const cleanText = (value: string) =>
      value.replace(/\s+/g, " ").trim() || "-";
    const columns = [
      { key: "date", label: "Date", width: 78 },
      { key: "note", label: "Note", width: 180 },
      { key: "category", label: "Category", width: 84 },
      { key: "credit", label: "Credit (+)", width: 86 },
      { key: "debit", label: "Debit (-)", width: 87 },
    ] as const;
    const columnX = columns.reduce<Record<string, number>>(
      (acc, column, idx) => {
        acc[column.key] =
          idx === 0
            ? margin
            : acc[columns[idx - 1].key] + columns[idx - 1].width;
        return acc;
      },
      {},
    );
    const sortedTransactions = [...member.transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const tableBottomY = pageHeight - 62;
    const balanceLabel = balance >= 0 ? "Lena" : "Dena";
    const balanceColor: [number, number, number] =
      balance >= 0 ? [22, 163, 74] : [220, 38, 38];

    const drawSummaryCard = (
      x: number,
      y: number,
      width: number,
      title: string,
      value: string,
      color: [number, number, number],
    ) => {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, width, 62, 12, 12, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(title, x + 14, y + 18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(value, x + 14, y + 42);
    };

    const drawTableHeader = (y: number) => {
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, contentWidth, 26, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      columns.forEach((column, idx) => {
        const textX =
          column.key === "credit" || column.key === "debit"
            ? columnX[column.key] + column.width - 10
            : columnX[column.key] + 10;
        doc.text(column.label, textX, y + 17, {
          align:
            column.key === "credit" || column.key === "debit"
              ? "right"
              : "left",
        });
        if (idx < columns.length - 1) {
          doc.setDrawColor(51, 65, 85);
          doc.line(
            columnX[column.key] + column.width,
            y,
            columnX[column.key] + column.width,
            y + 26,
          );
        }
      });
    };

    const drawPageFrame = (pageNumber: number, withSummary: boolean) => {
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 84, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Hisaab Kitaab", margin, 36);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Member ledger for ${member.name}`, margin, 56);
      doc.text(`Generated at ${generatedTimestamp}`, pageWidth - margin, 36, {
        align: "right",
      });
      doc.text(`Page ${pageNumber}`, pageWidth - margin, 56, {
        align: "right",
      });

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Member: ${member.name}`, margin, 108);
      doc.text(
        clearedCount > 0
          ? `Open: ${activeCount} / Cleared: ${clearedCount}`
          : `Transactions: ${member.transactions.length}`,
        margin,
        124,
      );
      if (member.email) {
        doc.text(`Email: ${member.email}`, pageWidth - margin, 108, {
          align: "right",
        });
      }

      if (withSummary) {
        const gap = 12;
        const cardWidth = (contentWidth - gap * 2) / 3;
        const summaryY = 146;
        drawSummaryCard(
          margin,
          summaryY,
          cardWidth,
          `Net Balance (${balanceLabel})`,
          formatSignedPdfCurrency(balance),
          balanceColor,
        );
        drawSummaryCard(
          margin + cardWidth + gap,
          summaryY,
          cardWidth,
          "Total Credit",
          `+ ${formatPdfCurrency(totalLena)}`,
          [22, 163, 74],
        );
        drawSummaryCard(
          margin + (cardWidth + gap) * 2,
          summaryY,
          cardWidth,
          "Total Debit",
          `- ${formatPdfCurrency(totalDena)}`,
          [220, 38, 38],
        );
        drawTableHeader(232);
        return 258;
      }

      drawTableHeader(146);
      return 172;
    };

    const ensureTableSpace = (requiredHeight: number, currentY: number) => {
      if (currentY + requiredHeight <= tableBottomY) {
        return currentY;
      }

      doc.addPage();
      pageNumber += 1;
      return drawPageFrame(pageNumber, false);
    };

    const drawTransactionRow = (
      transaction: Transaction,
      rowIndex: number,
      y: number,
    ) => {
      const categoryLabel =
        CATEGORIES.find((item) => item.id === transaction.category)?.label ??
        "General";
      const transactionNote = isTransactionCleared(transaction)
        ? `${cleanText(transaction.description)} [Cleared]`
        : cleanText(transaction.description);
      const noteLines = doc.splitTextToSize(
        transactionNote,
        columns[1].width - 20,
      );
      const rowHeight = Math.max(34, noteLines.length * 12 + 14);
      const centeredY = y + rowHeight / 2 + 3;
      const noteY = y + 18;
      const creditText =
        transaction.type === "lena"
          ? `+ ${formatPdfCurrency(transaction.amount)}`
          : "—";
      const debitText =
        transaction.type === "dena"
          ? `- ${formatPdfCurrency(transaction.amount)}`
          : "—";

      if (isTransactionCleared(transaction)) {
        doc.setFillColor(236, 253, 245);
        doc.rect(margin, y, contentWidth, rowHeight, "F");
      } else if (rowIndex % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, rowHeight, "F");
      }

      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, rowHeight);
      columns.slice(0, -1).forEach((column) => {
        doc.line(
          columnX[column.key] + column.width,
          y,
          columnX[column.key] + column.width,
          y + rowHeight,
        );
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(
        isTransactionCleared(transaction) ? 71 : 15,
        isTransactionCleared(transaction) ? 85 : 23,
        isTransactionCleared(transaction) ? 105 : 42,
      );
      doc.text(formatPdfDate(transaction.date), columnX.date + 10, centeredY);
      doc.text(categoryLabel, columnX.category + 10, centeredY);
      doc.text(noteLines, columnX.note + 10, noteY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(
        isTransactionCleared(transaction)
          ? 71
          : transaction.type === "lena"
            ? 22
            : 148,
        isTransactionCleared(transaction)
          ? 85
          : transaction.type === "lena"
            ? 163
            : 163,
        isTransactionCleared(transaction)
          ? 105
          : transaction.type === "lena"
            ? 74
            : 184,
      );
      doc.text(creditText, columnX.credit + columns[3].width - 10, centeredY, {
        align: "right",
      });

      doc.setTextColor(
        isTransactionCleared(transaction)
          ? 71
          : transaction.type === "dena"
            ? 220
            : 148,
        isTransactionCleared(transaction)
          ? 85
          : transaction.type === "dena"
            ? 38
            : 163,
        isTransactionCleared(transaction)
          ? 105
          : transaction.type === "dena"
            ? 38
            : 184,
      );
      doc.text(debitText, columnX.debit + columns[4].width - 10, centeredY, {
        align: "right",
      });

      return y + rowHeight;
    };

    const drawTotalsSection = (y: number) => {
      const totalsRowHeight = 34;
      const netRowHeight = 42;
      let nextY = ensureTableSpace(totalsRowHeight + netRowHeight + 12, y);

      doc.setFillColor(226, 232, 240);
      doc.rect(margin, nextY, contentWidth, totalsRowHeight, "F");
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, nextY, contentWidth, totalsRowHeight);
      columns.slice(0, -1).forEach((column) => {
        doc.line(
          columnX[column.key] + column.width,
          nextY,
          columnX[column.key] + column.width,
          nextY + totalsRowHeight,
        );
      });

      const totalsY = nextY + totalsRowHeight / 2 + 3;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("TOTAL", columnX.note + 10, totalsY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(
        clearedCount > 0
          ? `${activeCount} active / ${clearedCount} cleared`
          : `${sortedTransactions.length} entries`,
        columnX.category + 10,
        totalsY,
      );

      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 163, 74);
      doc.text(
        `+ ${formatPdfCurrency(totalLena)}`,
        columnX.credit + columns[3].width - 10,
        totalsY,
        { align: "right" },
      );
      doc.setTextColor(220, 38, 38);
      doc.text(
        `- ${formatPdfCurrency(totalDena)}`,
        columnX.debit + columns[4].width - 10,
        totalsY,
        { align: "right" },
      );

      nextY += totalsRowHeight + 10;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, nextY, contentWidth, netRowHeight, 12, 12, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("NET BALANCE", margin + 14, nextY + 18);
      doc.setFontSize(16);
      doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
      doc.text(
        `${formatSignedPdfCurrency(balance)} (${balanceLabel.toUpperCase()})`,
        pageWidth - margin - 14,
        nextY + 28,
        { align: "right" },
      );

      return nextY + netRowHeight;
    };

    let pageNumber = 1;
    let yPos = drawPageFrame(pageNumber, true);

    if (sortedTransactions.length === 0) {
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, yPos, contentWidth, 42);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("No transactions recorded yet.", margin + 12, yPos + 26);
    } else {
      sortedTransactions.forEach((transaction, index) => {
        const noteLines = doc.splitTextToSize(
          cleanText(transaction.description),
          columns[1].width - 20,
        );
        const rowHeight = Math.max(34, noteLines.length * 12 + 14);
        yPos = ensureTableSpace(rowHeight, yPos);
        yPos = drawTransactionRow(transaction, index, yPos);
      });

      yPos = drawTotalsSection(yPos + 12);
    }

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated at ${generatedTimestamp}`, margin, footerY);
      doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, footerY, {
        align: "right",
      });
    }

    return {
      doc,
      fileName: `${member.name.replace(/\s+/g, "_")}_hisaab_${fileTimestamp}.pdf`,
      summary: {
        totalLena: roundMoney(totalLena),
        totalDena: roundMoney(totalDena),
        balance: roundMoney(balance),
      },
    };
  };

  const handleDownloadPdf = async () => {
    const pdf = await createPdfDocument();
    if (!pdf) return;
    pdf.doc.save(pdf.fileName);
    toast.success("Ledger download started.");
  };

  const sendLedgerToEmail = async (targetEmail: string) => {
    if (typeof window === "undefined" || isSendingEmail) return false;
    setIsSendingEmail(true);

    try {
      const pdf = await createPdfDocument();
      if (!pdf) return false;

      const pdfDataUri = pdf.doc.output("datauristring");
      const pdfBase64 = pdfDataUri.split(",")[1];

      const response = await fetch("/api/send-ledger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: targetEmail,
          memberName: member.name,
          fileName: pdf.fileName,
          pdfBase64,
          summary: pdf.summary,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        ok?: boolean;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error || "Unable to send email right now.");
      }

      toast.success(`Ledger sent to ${targetEmail}.`);
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to send email right now.";
      toast.error(message);
      return false;
    } finally {
      setIsSendingEmail(false);
    }
  };

  const openEmailCapture = () => {
    setEmailInput(member.email ?? "");
    setEmailError("");
    setShowEmailCapture(true);
  };

  const handleSendEmail = async () => {
    const targetEmail = member.email?.trim().toLowerCase() ?? "";

    if (!targetEmail) {
      // openEditSheet() instead of openEmailCapture() since sending requires email, allow user to edit
      openEditSheet();
      return;
    }

    if (!EMAIL_REGEX.test(targetEmail)) {
      openEditSheet();
      return;
    }

    await sendLedgerToEmail(targetEmail);
  };

  const handleEmailCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = emailInput.trim().toLowerCase();
    if (!normalizedEmail) {
      const message = "Email is required";
      setEmailError(message);
      toast.error(message);
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      const message = "Enter a valid email address";
      setEmailError(message);
      toast.error(message);
      return;
    }

    onUpdateMember(member.id, member.name, normalizedEmail);
    const sent = await sendLedgerToEmail(normalizedEmail);
    if (sent) {
      setShowEmailCapture(false);
      setEmailError("");
    }
  };

  const openEditSheet = () => {
    setEditNameInput(member.name);
    setEditEmailInput(member.email ?? "");
    setEditError("");
    setShowEditSheet(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedName = editNameInput.trim();
    const normalizedEmail = editEmailInput.trim().toLowerCase();

    if (!normalizedName) {
      setEditError("Name is required");
      return;
    }

    if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
      setEditError("Enter a valid email address");
      return;
    }

    onUpdateMember(member.id, normalizedName, normalizedEmail);
    closeEditSheet();
  };

  const deleteOverlayStyle: React.CSSProperties = {
    opacity: deleteConfirmTransition.isVisible ? 1 : 0,
    transition: "opacity 140ms ease",
  };

  const deleteDialogStyle: React.CSSProperties = {
    transform: `translate3d(0, ${deleteConfirmTransition.isVisible ? 0 : 10}px, 0)`,
    opacity: deleteConfirmTransition.isVisible ? 1 : 0.98,
    transition:
      "transform 180ms cubic-bezier(0.22,1,0.36,1), opacity 140ms ease",
    willChange: "transform, opacity",
    backfaceVisibility: "hidden",
  };

  const emailOverlayStyle: React.CSSProperties = {
    opacity: emailCaptureTransition.isVisible ? 1 : 0,
    transition: "opacity 140ms ease",
  };

  const emailDialogStyle: React.CSSProperties = {
    transform: `translate3d(0, ${emailCaptureTransition.isVisible ? 0 : 10}px, 0)`,
    opacity: emailCaptureTransition.isVisible ? 1 : 0.98,
    transition:
      "transform 180ms cubic-bezier(0.22,1,0.36,1), opacity 140ms ease",
    willChange: "transform, opacity",
    backfaceVisibility: "hidden",
  };

  const editOverlayStyle: React.CSSProperties = {
    opacity: editSheetTransition.isVisible ? 1 : 0,
    transition: "opacity 200ms ease",
  };

  const editDialogStyle: React.CSSProperties = {
    transform: `translate3d(0, ${editSheetTransition.isVisible ? 0 : 100}%, 0)`,
    opacity: editSheetTransition.isVisible ? 1 : 0,
    transition:
      "transform 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 300ms ease",
    willChange: "transform, opacity",
    backfaceVisibility: "hidden",
  };

  const transactionDeleteOverlayStyle: React.CSSProperties = {
    opacity: transactionDeleteTransition.isVisible ? 1 : 0,
    transition: "opacity 140ms ease",
  };

  const transactionDeleteDialogStyle: React.CSSProperties = {
    transform: `translate3d(0, ${transactionDeleteTransition.isVisible ? 0 : 10}px, 0)`,
    opacity: transactionDeleteTransition.isVisible ? 1 : 0.98,
    transition:
      "transform 180ms cubic-bezier(0.22,1,0.36,1), opacity 140ms ease",
    willChange: "transform, opacity",
    backfaceVisibility: "hidden",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border safe-top">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{member.name}</h1>
            {member.email && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="w-3 h-3" />
                <span className="truncate">{member.email}</span>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleDownloadPdf}
              aria-label="Download ledger"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-muted sm:px-3">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              aria-label={
                isSendingEmail ? "Sending ledger email" : "Send ledger email"
              }
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60 sm:px-3">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isSendingEmail ? "Sending..." : "Send Email"}
              </span>
            </button>
          </div>
          <button
            onClick={openEditSheet}
            className="p-2 -mr-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Edit Member">
            <UserPen className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-lg hover:bg-muted text-danger/80 hover:text-danger hover:bg-danger/10 transition-colors"
            aria-label="Delete Member">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Balance Card */}
      <div className="p-4">
        <div
          className={`p-4 rounded-xl border ${isPositive ? "border-success/40 bg-success/15" : "border-danger/40 bg-danger/15"}`}>
          <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">
            {isPositive ? "Mereko Lena Hai" : "Mereko Dena Hai"}
          </p>
          <p
            className={`text-3xl font-bold font-mono tabular-nums ${isPositive ? "text-success" : "text-danger"}`}>
            {formatCurrency(balance)}
          </p>

          <div className="flex gap-4 mt-4 pt-3 border-t border-border/50">
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                Total Lena
              </p>
              <p className="text-sm font-bold text-success font-mono tabular-nums">
                {formatCurrency(totalLena)}
              </p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                Total Dena
              </p>
              <p className="text-sm font-bold text-danger font-mono tabular-nums">
                {formatCurrency(totalDena)}
              </p>
            </div>
          </div>
          {clearedCount > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {clearedCount} cleared transaction
              {clearedCount === 1 ? "" : "s"} balance me count nahi ho rahi.
            </p>
          )}
        </div>
      </div>

      {/* Transactions History */}
      <div className="flex-1 px-4 pb-4">
        <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
          Transaction History ({filteredTransactions.length})
        </h3>

        {member.transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">No transactions yet</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
              <CalendarRange className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">
              No transactions in {formatTransactionMonth(selectedMonth)}
            </p>
            <p className="text-xs text-muted-foreground">
              Dusra month select karo ya All Months dekh lo.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...filteredTransactions]
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime(),
              )
              .map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  onDeleteRequest={() => setTransactionToDelete(transaction)}
                  onToggleCleared={onToggleTransactionCleared}
                />
              ))}
          </div>
        )}
      </div>

      {member.transactions.length > 0 && (
        <button
          type="button"
          onClick={() => setShowMonthFilter(true)}
          className="fixed right-4 z-20 inline-flex items-center gap-2 rounded-full border border-border/80 bg-popover/95 px-4 py-3 text-sm font-semibold text-foreground shadow-[0_18px_40px_-24px_rgba(15,23,42,0.55)] backdrop-blur"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}>
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          <span>
            {selectedMonth === "all"
              ? "All Months"
              : formatTransactionMonth(selectedMonth)}
          </span>
        </button>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-card/95 py-3 text-center backdrop-blur">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/85">
          Made With ❤️ By Saksham Jain
        </p>
      </footer>

      {/* Delete Confirmation */}
      {deleteConfirmTransition.isMounted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            style={deleteOverlayStyle}
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl bg-popover p-5 shadow-2xl"
            style={deleteDialogStyle}>
            <h3 className="text-lg font-semibold mb-2">Delete Member?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {member.name} ka saara hisaab delete ho jayega.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 bg-muted text-foreground rounded-lg font-medium">
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteMember();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 py-2.5 bg-danger text-white rounded-lg font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {transactionDeleteTransition.isMounted && transactionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            style={transactionDeleteOverlayStyle}
            onClick={() => setTransactionToDelete(null)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl bg-popover p-5 shadow-2xl"
            style={transactionDeleteDialogStyle}>
            <h3 className="mb-2 text-lg font-semibold">Delete Transaction?</h3>
            <p className="mb-5 text-sm text-muted-foreground">
              {transactionToDelete.description} permanently delete ho jayega.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setTransactionToDelete(null)}
                className="flex-1 rounded-lg bg-muted py-2.5 font-medium text-foreground">
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteTransaction(transactionToDelete.id);
                  setTransactionToDelete(null);
                }}
                className="flex-1 rounded-lg bg-danger py-2.5 font-medium text-white">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <MonthFilterSheet
        isOpen={showMonthFilter}
        title="Transaction Filter"
        selectedKey={selectedMonth}
        totalCount={member.transactions.length}
        options={monthOptions}
        onSelect={setSelectedMonth}
        onClose={() => setShowMonthFilter(false)}
      />

      {emailCaptureTransition.isMounted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            style={emailOverlayStyle}
            onClick={closeEmailCapture}
          />
          <div
            className="relative w-full max-w-md rounded-3xl border border-border bg-popover p-6 shadow-2xl"
            style={emailDialogStyle}>
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold">Email This Ledger</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add an email for {member.name}. We&apos;ll save it to this
                  member and send the ledger there.
                </p>
              </div>
            </div>

            <form onSubmit={handleEmailCaptureSubmit} className="space-y-4">
              {emailError && (
                <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {emailError}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground">
                  Email Address
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setEmailError("");
                  }}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-border bg-input px-3 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeEmailCapture}
                  disabled={isSendingEmail}
                  className="flex-1 rounded-xl bg-muted py-3 text-sm font-medium text-foreground disabled:opacity-60">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                  {isSendingEmail ? "Sending..." : "Save & Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Sheet */}
      {editSheetTransition.isMounted && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pb-0">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            style={editOverlayStyle}
            onClick={closeEditSheet}
          />
          <div
            className="relative w-full max-w-md rounded-t-[32px] sm:rounded-3xl border border-border/50 bg-popover/95 p-6 shadow-2xl backdrop-blur-xl sm:mb-8"
            style={editDialogStyle}>
            {/* Grabber for bottom sheet look */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 h-1.5 w-12 rounded-full bg-border/80 sm:hidden" />
            
            <div className="mt-2 sm:mt-0 mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 shadow-sm border border-indigo-200/50 dark:border-indigo-800/50">
                <UserPen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0 pt-1">
                <h3 className="text-xl font-bold tracking-tight text-foreground">Edit Profile</h3>
                <p className="mt-1 text-sm font-medium text-muted-foreground/80">
                  Update {member.name}&apos;s details below.
                </p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editError && (
                <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger shadow-sm">
                  {editError}
                </div>
              )}

              <div className="space-y-4">
                <div className="group relative">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground/80 transition-colors group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editNameInput}
                    onChange={(e) => {
                      setEditNameInput(e.target.value);
                      setEditError("");
                    }}
                    placeholder="Enter full name"
                    className="w-full rounded-2xl border border-border/70 bg-background/50 px-4 py-3.5 text-[15px] font-semibold text-foreground shadow-sm placeholder:font-medium placeholder:text-muted-foreground/50 transition-all focus:bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    autoFocus
                  />
                </div>

                <div className="group relative">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground/80 transition-colors group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmailInput}
                    onChange={(e) => {
                      setEditEmailInput(e.target.value);
                      setEditError("");
                    }}
                    placeholder="name@example.com (Optional)"
                    className="w-full rounded-2xl border border-border/70 bg-background/50 px-4 py-3.5 text-[15px] font-semibold text-foreground shadow-sm placeholder:font-medium placeholder:text-muted-foreground/50 transition-all focus:bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3 pt-4 sm:pt-2">
                <button
                  type="button"
                  onClick={closeEditSheet}
                  className="w-full rounded-2xl bg-muted/60 hover:bg-muted py-3.5 sm:py-3 text-[15px] font-bold text-foreground transition-all active:scale-[0.98] sm:flex-1">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-foreground hover:bg-foreground/90 py-3.5 sm:py-3 text-[15px] font-bold text-background shadow-lg shadow-foreground/15 transition-all active:scale-[0.98] sm:flex-1">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionItem({
  transaction,
  onDeleteRequest,
  onToggleCleared,
}: {
  transaction: Transaction;
  onDeleteRequest: () => void;
  onToggleCleared: (transactionId: string, shouldClear: boolean) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const isLena = transaction.type === "lena";
  const isCleared = isTransactionCleared(transaction);
  const cat = transaction.category
    ? CATEGORIES.find((c) => c.id === transaction.category)
    : null;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 ${
        isCleared ? "border-success/20 bg-success/5" : "bg-card border-border"
      }`}
      onClick={() => setShowActions(!showActions)}>
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
          cat ? cat.color : isLena ? "bg-success/10" : "bg-danger/10"
        }`}>
        {cat ? (
          cat.icon
        ) : isLena ? (
          <ArrowDownLeft className="w-4 h-4 text-success" />
        ) : (
          <ArrowUpRight className="w-4 h-4 text-danger" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p
            className={`truncate text-sm font-medium ${
              isCleared ? "text-muted-foreground line-through" : ""
            }`}>
            {transaction.description}
          </p>
          {isCleared && (
            <span className="rounded-full border border-success/20 bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
              Cleared
            </span>
          )}
          {cat && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded border ${cat.color}`}>
              {cat.label}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDate(transaction.date)}
        </p>
      </div>

      {showActions ? (
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCleared(transaction.id, !isCleared);
              setShowActions(false);
            }}
            className={`rounded-lg border p-2 ${
              isCleared
                ? "border-border bg-muted text-foreground"
                : "border-success/20 bg-success/10 text-success"
            }`}
            aria-label={
              isCleared ? "Restore transaction" : "Mark transaction cleared"
            }>
            {isCleared ? (
              <Undo2 className="w-4 h-4" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRequest();
              setShowActions(false);
            }}
            className="p-2 rounded-lg bg-danger/10 text-danger"
            aria-label="Delete transaction">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="text-right">
          <p
            className={`font-bold font-mono tabular-nums ${
              isCleared
                ? "text-muted-foreground line-through"
                : isLena
                  ? "text-success"
                  : "text-danger"
            }`}>
            {isLena ? "+" : "-"}
            {formatCurrency(transaction.amount)}
          </p>
          {isCleared && (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
              cleared
            </p>
          )}
        </div>
      )}
    </div>
  );
}
