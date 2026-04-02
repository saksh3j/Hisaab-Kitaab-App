import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LedgerSummary = {
  totalLena: number;
  totalDena: number;
  balance: number;
};

type SendLedgerPayload = {
  to?: string;
  memberName?: string;
  fileName?: string;
  pdfBase64?: string;
  summary?: LedgerSummary;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatCurrency(amount: number) {
  return `Rs. ${currencyFormatter.format(Math.abs(amount))}`;
}

function formatSignedCurrency(amount: number) {
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${formatCurrency(amount)}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderSummaryCard(label: string, value: string, color: string) {
  return `
    <tr>
      <td style="padding:14px 16px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;">
        <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">${label}</div>
        <div style="margin-top:6px;font-size:22px;font-weight:700;color:${color};line-height:1.25;">${value}</div>
      </td>
    </tr>
  `;
}

export async function POST(request: Request) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASS;

  if (!gmailUser || !gmailPassword) {
    return NextResponse.json(
      { error: "GMAIL_USER or GMAIL_APP_PASS is missing in env." },
      { status: 500 },
    );
  }

  let body: SendLedgerPayload;
  try {
    body = (await request.json()) as SendLedgerPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const to = body.to?.trim().toLowerCase();
  const memberName = body.memberName?.trim() || "Member";
  const fileName = body.fileName?.trim() || `${memberName}_hisaab.pdf`;
  const pdfBase64 = body.pdfBase64?.trim();
  const summary = body.summary;

  if (!to || !EMAIL_REGEX.test(to)) {
    return NextResponse.json(
      { error: "A valid recipient email is required." },
      { status: 400 },
    );
  }

  if (!pdfBase64) {
    return NextResponse.json(
      { error: "PDF attachment data is missing." },
      { status: 400 },
    );
  }

  const totalLena = summary?.totalLena ?? 0;
  const totalDena = summary?.totalDena ?? 0;
  const balance = summary?.balance ?? 0;
  const balanceLabel = balance >= 0 ? "LENA" : "DENA";
  const balanceColor = balance >= 0 ? "#16a34a" : "#dc2626";
  const safeMemberName = escapeHtml(memberName);
  const safeFileName = escapeHtml(fileName);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPassword,
    },
  });

  const html = `
    <div style="margin:0;padding:16px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="width:100%;max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
        <div style="padding:22px 20px;background:#0f172a;color:#ffffff;">
          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.72;">Hisaab Kitaab</div>
          <h1 style="margin:10px 0 0;font-size:24px;line-height:1.2;">Ledger for ${safeMemberName}</h1>
        </div>

        <div style="padding:20px;">
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#334155;">
            Hi ${safeMemberName},<br />
            Your latest Hisaab Kitaab ledger is ready. Here is a quick summary of the current balances.
          </p>

          <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:separate;border-spacing:0 12px;margin:0 0 18px;">
            ${renderSummaryCard("Total Credit", `+ ${formatCurrency(totalLena)}`, "#16a34a")}
            ${renderSummaryCard("Total Debit", `- ${formatCurrency(totalDena)}`, "#dc2626")}
            ${renderSummaryCard(`Net ${balanceLabel}`, formatSignedCurrency(balance), balanceColor)}
          </table>

          <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#475569;word-break:break-word;">
            Attached file: <strong style="color:#0f172a;">${safeFileName}</strong>
          </p>

          <div style="padding:16px 18px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;">
            <div style="font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.1em;">Powered By Hisaab Kitaab</div>
            <div style="margin-top:6px;font-size:14px;line-height:1.6;color:#334155;">
              This ledger was generated from <a href="https://hisaaab.vercel.app" style="color:#0f172a;font-weight:700;text-decoration:none;">hisaaab.vercel.app</a>. You can manage balances, exports, and reminders there anytime.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `Hisaab Kitaab <${gmailUser}>`,
      to,
      subject: `Ledger for ${memberName}`,
      html,
      attachments: [
        {
          filename: fileName,
          content: pdfBase64,
          encoding: "base64",
          contentType: "application/pdf",
        },
      ],
    });

    return NextResponse.json({
      ok: true,
      messageId: info.messageId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
