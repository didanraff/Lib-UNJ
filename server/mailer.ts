import nodemailer from 'nodemailer';
import type { EmailDeliveryMode, EmailKind, Loan } from '../src/types/library.ts';

export interface MailDispatchResult {
  deliveryMode: EmailDeliveryMode;
  status: 'sent' | 'failed';
  errorMessage?: string;
  subject: string;
  htmlBody: string;
  textSummary: string;
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

function formatDateId(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function buildLibraryEmailContent(
  loan: Loan,
  kind: EmailKind,
  daysRemaining: number
): { subject: string; htmlBody: string; textSummary: string } {
  const dueFormatted = formatDateId(loan.dueAt);
  const borrowFormatted = formatDateId(loan.borrowedAt);

  let subject = '';
  let badgeTitle = '';
  let accentColor = '#1d4ed8';
  let leadParagraph = '';
  let textSummary = '';

  if (kind === 'due_soon') {
    const label =
      daysRemaining <= 0
        ? 'jatuh tempo hari ini'
        : `akan jatuh tempo dalam ${daysRemaining} hari`;
    subject = `[Pengingat Jatuh Tempo] "${loan.bookTitle}" — ${label}`;
    badgeTitle = 'Pengingat Jatuh Tempo Peminjaman';
    accentColor = '#d97706';
    leadParagraph = `Halo <strong>${loan.memberName}</strong>, masa peminjaman buku Anda <strong>${label}</strong> pada tanggal <strong>${dueFormatted}</strong>. Mohon segera lakukan pengembalian atau perpanjangan online melalui dasbor PustakaNusa.`;
    textSummary = `Pengingat: "${loan.bookTitle}" ${label} (${dueFormatted}).`;
  } else if (kind === 'overdue') {
    const overdueDays = Math.max(1, Math.abs(daysRemaining));
    subject = `[Terlambat ${overdueDays} Hari] Pengembalian Buku "${loan.bookTitle}"`;
    badgeTitle = 'Peringatan Keterlambatan Pengembalian';
    accentColor = '#dc2626';
    leadParagraph = `Halo <strong>${loan.memberName}</strong>, peminjaman buku <strong>"${loan.bookTitle}"</strong> telah melewati tanggal jatuh tempo (${dueFormatted}) selama <strong>${overdueDays} hari</strong>. Akumulasi denda berjalan saat ini adalah <strong>${formatRupiah(loan.fineAmount)}</strong>.`;
    textSummary = `Peringatan terlambat ${overdueDays} hari untuk "${loan.bookTitle}". Denda berjalan: ${formatRupiah(loan.fineAmount)}.`;
  } else if (kind === 'return_receipt') {
    subject = `[Konfirmasi Pengembalian] "${loan.bookTitle}" Telah Diterima`;
    badgeTitle = 'Bukti Pengembalian Buku';
    accentColor = '#16a34a';
    leadParagraph = `Halo <strong>${loan.memberName}</strong>, terima kasih telah mengembalikan buku <strong>"${loan.bookTitle}"</strong>. Transaksi peminjaman Anda telah diselesaikan.${loan.fineAmount > 0 ? ` Total denda keterlambatan tercatat: <strong>${formatRupiah(loan.fineAmount)}</strong>.` : ''}`;
    textSummary = `Buku "${loan.bookTitle}" telah dikembalikan dengan sukses.`;
  } else {
    subject = `[Konfirmasi Peminjaman] "${loan.bookTitle}" — Jatuh Tempo ${dueFormatted}`;
    badgeTitle = 'Konfirmasi Peminjaman Online';
    accentColor = '#1d4ed8';
    leadParagraph = `Halo <strong>${loan.memberName}</strong>, peminjaman buku <strong>"${loan.bookTitle}"</strong> telah berhasil diproses pada ${borrowFormatted}. Tanggal jatuh tempo pengembalian adalah <strong>${dueFormatted}</strong>.`;
    textSummary = `Peminjaman "${loan.bookTitle}" berhasil. Jatuh tempo: ${dueFormatted}.`;
  }

  const htmlBody = `
  <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;background:#ffffff;color:#0f172a;">
    <div style="padding:20px 24px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">
      <div style="font-size:12px;font-weight:600;color:${accentColor};letter-spacing:0.02em;">PustakaNusa · Notifikasi Perpustakaan Digital</div>
      <h2 style="margin:6px 0 0;font-size:18px;font-weight:700;color:#0f172a;">${badgeTitle}</h2>
    </div>
    <div style="padding:24px;font-size:14px;line-height:1.6;color:#334155;">
      <p style="margin:0 0 16px;">${leadParagraph}</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;font-size:13px;margin-bottom:20px;">
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;width:38%;">Judul Buku</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;">${loan.bookTitle}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;">Penulis / ISBN</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${loan.bookAuthor} · ${loan.bookIsbn}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;">ID Anggota</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;color:#0f172a;">${loan.memberCode}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;">Tanggal Pinjam</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${borrowFormatted}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#64748b;">Jatuh Tempo</td>
          <td style="padding:10px 12px;font-weight:600;color:${accentColor};">${dueFormatted}</td>
        </tr>
      </table>
      <p style="margin:0;font-size:12px;color:#64748b;">Email ini dikirim otomatis oleh sistem pemantauan sirkulasi PustakaNusa secara real-time.</p>
    </div>
  </div>`;

  return { subject, htmlBody, textSummary };
}

export async function dispatchLibraryEmail(
  loan: Loan,
  kind: EmailKind,
  daysRemaining: number
): Promise<MailDispatchResult> {
  const { subject, htmlBody, textSummary } = buildLibraryEmailContent(
    loan,
    kind,
    daysRemaining
  );

  if (isSmtpConfigured()) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `PustakaNusa <${process.env.SMTP_USER}>`,
        to: loan.memberEmail,
        subject,
        text: textSummary,
        html: htmlBody,
      });

      return {
        deliveryMode: 'smtp',
        status: 'sent',
        subject,
        htmlBody,
        textSummary,
      };
    } catch (err) {
      return {
        deliveryMode: 'smtp',
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
        subject,
        htmlBody,
        textSummary,
      };
    }
  }

  return {
    deliveryMode: 'outbox_simulated',
    status: 'sent',
    subject,
    htmlBody,
    textSummary,
  };
}
