import 'dotenv/config';
import express from 'express';
import path from 'path';
import type {
  Book,
  BootstrapPayload,
  EmailKind,
  EmailNotification,
  Loan,
  ReportType,
  TransactionEvent,
  UserProfile,
} from './src/types/library.ts';
import { dispatchLibraryEmail, isSmtpConfigured } from './server/mailer.ts';
import {
  buildReportObject,
  computeDashboardStats,
  computeDaysRemaining,
  loadDatabase,
  refreshLoanComputedFields,
  saveDatabase,
} from './server/store.ts';

const PORT = Number(process.env.PORT || 3000);
const app = express();
app.use(express.json({ limit: '2mb' }));

let db = loadDatabase();

// Connected Server-Sent Events clients
const sseClients = new Set<express.Response>();

function broadcastEvent(eventName: string, payload: unknown): void {
  const data = JSON.stringify(payload);
  for (const res of sseClients) {
    try {
      res.write(`event: ${eventName}\ndata: ${data}\n\n`);
    } catch {
      sseClients.delete(res);
    }
  }
}

function getBootstrapPayload(): BootstrapPayload {
  db.loans = db.loans.map((l) => refreshLoanComputedFields(l, db.settings));
  return {
    books: db.books,
    loans: [...db.loans].sort(
      (a, b) => new Date(b.borrowedAt).getTime() - new Date(a.borrowedAt).getTime()
    ),
    users: db.users,
    events: db.events.slice(0, 60),
    emailLogs: db.emailLogs.slice(0, 60),
    reports: db.reports.slice(0, 30),
    settings: db.settings,
    stats: computeDashboardStats(db),
    smtpConfigured: isSmtpConfigured(),
    serverTime: new Date().toISOString(),
  };
}

function recordEvent(event: Omit<TransactionEvent, 'id' | 'createdAt'>): TransactionEvent {
  const fullEvent: TransactionEvent = {
    ...event,
    id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
  };
  db.events.unshift(fullEvent);
  if (db.events.length > 150) {
    db.events = db.events.slice(0, 150);
  }
  return fullEvent;
}

async function sendLoanEmail(
  loan: Loan,
  kind: EmailKind,
  actorName: string,
  actorRole: 'admin' | 'member' | 'system'
): Promise<EmailNotification> {
  const daysRemaining = computeDaysRemaining(loan.dueAt);
  const result = await dispatchLibraryEmail(loan, kind, daysRemaining);

  const notification: EmailNotification = {
    id: `eml-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    loanId: loan.id,
    memberId: loan.memberId,
    memberName: loan.memberName,
    recipientEmail: loan.memberEmail,
    subject: result.subject,
    kind,
    deliveryMode: result.deliveryMode,
    status: result.status,
    errorMessage: result.errorMessage,
    htmlBody: result.htmlBody,
    textSummary: result.textSummary,
    sentAt: new Date().toISOString(),
  };

  db.emailLogs.unshift(notification);
  if (db.emailLogs.length > 200) {
    db.emailLogs = db.emailLogs.slice(0, 200);
  }

  const targetLoan = db.loans.find((l) => l.id === loan.id);
  if (targetLoan && (kind === 'due_soon' || kind === 'overdue')) {
    targetLoan.lastReminderSentAt = notification.sentAt;
    targetLoan.reminderCount += 1;
  }

  const eventLabel =
    kind === 'overdue'
      ? 'Peringatan Keterlambatan Terkirim'
      : kind === 'due_soon'
        ? 'Pengingat Jatuh Tempo Terkirim'
        : kind === 'return_receipt'
          ? 'Bukti Pengembalian Terkirim'
          : 'Konfirmasi Peminjaman Terkirim';

  recordEvent({
    kind: 'email_reminder',
    title: eventLabel,
    detail: `Email ke ${loan.memberEmail} (${result.deliveryMode === 'smtp' ? 'SMTP Live' : 'Outbox Server'}) untuk "${loan.bookTitle}"`,
    actorName,
    actorRole,
    memberId: loan.memberId,
    bookId: loan.bookId,
    loanId: loan.id,
  });

  return notification;
}

async function runDueDateReminderScan(force = false, triggeredBy = 'Penjadwal Otomatis'): Promise<EmailNotification[]> {
  const todayKey = new Date().toISOString().slice(0, 10);
  const sentList: EmailNotification[] = [];

  db.loans = db.loans.map((l) => refreshLoanComputedFields(l, db.settings));

  for (const loan of db.loans) {
    if (loan.returnedAt) continue;
    const daysRemaining = computeDaysRemaining(loan.dueAt);
    const shouldRemind =
      loan.status === 'overdue' ||
      loan.status === 'due_soon' ||
      daysRemaining <= db.settings.reminderLeadDays;

    if (!shouldRemind) continue;

    const alreadySentToday =
      loan.lastReminderSentAt && loan.lastReminderSentAt.slice(0, 10) === todayKey;

    if (alreadySentToday && !force) continue;

    const kind: EmailKind = daysRemaining < 0 ? 'overdue' : 'due_soon';
    const notif = await sendLoanEmail(
      loan,
      kind,
      triggeredBy,
      triggeredBy === 'Penjadwal Otomatis' ? 'system' : 'admin'
    );
    sentList.push(notif);
  }

  db.settings.lastAutoScanAt = new Date().toISOString();
  saveDatabase(db);

  if (sentList.length > 0) {
    broadcastEvent('bootstrap_sync', getBootstrapPayload());
  }

  return sentList;
}

// --- API ROUTES ---

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);
  res.write(`event: connected\ndata: ${JSON.stringify({ connectedAt: new Date().toISOString() })}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

app.get('/api/bootstrap', (_req, res) => {
  res.json(getBootstrapPayload());
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, department } = req.body as {
    name?: string;
    email?: string;
    department?: string;
  };
  if (!name?.trim() || !email?.trim()) {
    res.status(400).json({ error: 'Nama lengkap dan email wajib diisi.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    res.json({ user: existing, payload: getBootstrapPayload() });
    return;
  }

  const newUser: UserProfile = {
    id: `usr-member-${Date.now()}`,
    name: name.trim(),
    email: normalizedEmail,
    role: 'member',
    memberCode: `ANG-2026-${String(db.users.length + 10).padStart(3, '0')}`,
    department: department?.trim() || 'Anggota Umum',
    joinedAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDatabase(db);
  broadcastEvent('bootstrap_sync', getBootstrapPayload());
  res.status(201).json({ user: newUser, payload: getBootstrapPayload() });
});

app.post('/api/books', (req, res) => {
  const body = req.body as Partial<Book>;
  if (!body.title?.trim() || !body.author?.trim() || !body.isbn?.trim()) {
    res.status(400).json({ error: 'Judul, penulis, dan ISBN wajib diisi.' });
    return;
  }

  const totalCopies = Math.max(1, Number(body.totalCopies || 1));
  const newBook: Book = {
    id: `bk-${Date.now()}`,
    title: body.title.trim(),
    author: body.author.trim(),
    isbn: body.isbn.trim(),
    category: body.category?.trim() || 'Umum',
    publisher: body.publisher?.trim() || 'PustakaNusa Press',
    year: Number(body.year || new Date().getFullYear()),
    pages: Number(body.pages || 220),
    shelfCode: body.shelfCode?.trim() || 'UMM-100',
    totalCopies,
    availableCopies: totalCopies,
    coverUrl: body.coverUrl?.trim() || '',
    coverTone: body.coverTone || 'cobalt',
    description: body.description?.trim() || 'Koleksi digital perpustakaan PustakaNusa.',
    digitalExcerpt:
      body.digitalExcerpt?.trim() ||
      'Pratinjau naskah digital tersedia untuk seluruh anggota terdaftar PustakaNusa.',
    totalBorrowed: 0,
    createdAt: new Date().toISOString(),
  };

  db.books.unshift(newBook);
  recordEvent({
    kind: 'book_added',
    title: 'Koleksi Buku Baru Ditambahkan',
    detail: `"${newBook.title}" oleh ${newBook.author} (${newBook.totalCopies} eksemplar)`,
    actorName: 'Admin Pustakawan',
    actorRole: 'admin',
    bookId: newBook.id,
  });

  saveDatabase(db);
  const payload = getBootstrapPayload();
  broadcastEvent('bootstrap_sync', payload);
  res.status(201).json({ book: newBook, payload });
});

app.put('/api/books/:id', (req, res) => {
  const book = db.books.find((b) => b.id === req.params.id);
  if (!book) {
    res.status(404).json({ error: 'Buku tidak ditemukan.' });
    return;
  }

  const body = req.body as Partial<Book>;
  const activeCount = db.loans.filter(
    (l) => l.bookId === book.id && !l.returnedAt
  ).length;

  const nextTotal =
    body.totalCopies !== undefined
      ? Math.max(activeCount, Number(body.totalCopies))
      : book.totalCopies;

  book.title = body.title?.trim() || book.title;
  book.author = body.author?.trim() || book.author;
  book.isbn = body.isbn?.trim() || book.isbn;
  book.category = body.category?.trim() || book.category;
  book.publisher = body.publisher?.trim() || book.publisher;
  book.year = body.year !== undefined ? Number(body.year) : book.year;
  book.pages = body.pages !== undefined ? Number(body.pages) : book.pages;
  book.shelfCode = body.shelfCode?.trim() || book.shelfCode;
  book.coverTone = body.coverTone || book.coverTone;
  book.description = body.description?.trim() || book.description;
  book.totalCopies = nextTotal;
  book.availableCopies = Math.max(0, nextTotal - activeCount);

  recordEvent({
    kind: 'book_updated',
    title: 'Data Koleksi Diperbarui',
    detail: `Koleksi "${book.title}" diperbarui (${book.availableCopies}/${book.totalCopies} tersedia)`,
    actorName: 'Admin Pustakawan',
    actorRole: 'admin',
    bookId: book.id,
  });

  saveDatabase(db);
  const payload = getBootstrapPayload();
  broadcastEvent('bootstrap_sync', payload);
  res.json({ book, payload });
});

app.delete('/api/books/:id', (req, res) => {
  const book = db.books.find((b) => b.id === req.params.id);
  if (!book) {
    res.status(404).json({ error: 'Buku tidak ditemukan.' });
    return;
  }

  const hasActiveLoan = db.loans.some(
    (l) => l.bookId === book.id && !l.returnedAt
  );
  if (hasActiveLoan) {
    res.status(409).json({
      error: 'Buku tidak dapat dihapus karena masih ada eksemplar yang sedang dipinjam.',
    });
    return;
  }

  db.books = db.books.filter((b) => b.id !== book.id);
  saveDatabase(db);
  const payload = getBootstrapPayload();
  broadcastEvent('bootstrap_sync', payload);
  res.json({ ok: true, payload });
});

app.post('/api/loans', async (req, res) => {
  const { bookId, memberId, durationDays } = req.body as {
    bookId?: string;
    memberId?: string;
    durationDays?: number;
  };

  const book = db.books.find((b) => b.id === bookId);
  const member = db.users.find((u) => u.id === memberId);

  if (!book || !member) {
    res.status(404).json({ error: 'Buku atau anggota tidak ditemukan.' });
    return;
  }

  if (book.availableCopies <= 0) {
    res.status(409).json({ error: 'Maaf, seluruh eksemplar buku ini sedang dipinjam.' });
    return;
  }

  const memberActiveLoans = db.loans.filter(
    (l) => l.memberId === member.id && !l.returnedAt
  );
  if (memberActiveLoans.length >= db.settings.maxLoansPerMember) {
    res.status(409).json({
      error: `Batas maksimal peminjaman aktif (${db.settings.maxLoansPerMember} buku) telah tercapai.`,
    });
    return;
  }

  if (memberActiveLoans.some((l) => l.bookId === book.id)) {
    res.status(409).json({
      error: 'Anda sedang meminjam judul buku ini. Silakan perpanjang jika butuh waktu tambahan.',
    });
    return;
  }

  const days = Math.min(30, Math.max(1, Number(durationDays || 7)));
  const borrowedAt = new Date();
  const dueAt = new Date(borrowedAt);
  dueAt.setDate(dueAt.getDate() + days);
  dueAt.setHours(23, 59, 0, 0);

  const newLoanRaw: Loan = {
    id: `ln-${Date.now()}`,
    bookId: book.id,
    bookTitle: book.title,
    bookAuthor: book.author,
    bookIsbn: book.isbn,
    memberId: member.id,
    memberName: member.name,
    memberEmail: member.email,
    memberCode: member.memberCode,
    borrowedAt: borrowedAt.toISOString(),
    dueAt: dueAt.toISOString(),
    returnedAt: null,
    durationDays: days,
    extensionsCount: 0,
    fineAmount: 0,
    status: 'active',
    lastReminderSentAt: null,
    reminderCount: 0,
  };

  const newLoan = refreshLoanComputedFields(newLoanRaw, db.settings);
  db.loans.unshift(newLoan);
  book.availableCopies = Math.max(0, book.availableCopies - 1);
  book.totalBorrowed += 1;

  recordEvent({
    kind: 'borrow',
    title: 'Peminjaman Buku Online',
    detail: `${member.name} meminjam "${book.title}" (durasi ${days} hari)`,
    actorName: member.name,
    actorRole: member.role,
    memberId: member.id,
    bookId: book.id,
    loanId: newLoan.id,
  });

  // Send immediate confirmation email
  await sendLoanEmail(newLoan, 'borrow_confirmation', member.name, member.role);

  // If duration <= reminderLeadDays, also emit immediate due_soon reminder
  if (days <= db.settings.reminderLeadDays && db.settings.autoReminderEnabled) {
    await sendLoanEmail(newLoan, 'due_soon', 'Penjadwal Otomatis', 'system');
  }

  saveDatabase(db);
  const payload = getBootstrapPayload();
  broadcastEvent('bootstrap_sync', payload);
  res.status(201).json({ loan: newLoan, payload });
});

app.post('/api/loans/:id/return', async (req, res) => {
  const loanIndex = db.loans.findIndex((l) => l.id === req.params.id);
  if (loanIndex === -1) {
    res.status(404).json({ error: 'Transaksi peminjaman tidak ditemukan.' });
    return;
  }

  const loan = refreshLoanComputedFields(db.loans[loanIndex], db.settings);
  if (loan.returnedAt) {
    res.status(409).json({ error: 'Buku ini sudah dikembalikan sebelumnya.' });
    return;
  }

  loan.returnedAt = new Date().toISOString();
  loan.status = 'returned';
  db.loans[loanIndex] = loan;

  const book = db.books.find((b) => b.id === loan.bookId);
  if (book) {
    book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
  }

  recordEvent({
    kind: 'return',
    title: 'Pengembalian Buku Selesai',
    detail: `${loan.memberName} mengembalikan "${loan.bookTitle}"${loan.fineAmount > 0 ? ` (denda Rp ${loan.fineAmount.toLocaleString('id-ID')})` : ' tepat waktu'}`,
    actorName: loan.memberName,
    actorRole: 'member',
    memberId: loan.memberId,
    bookId: loan.bookId,
    loanId: loan.id,
  });

  await sendLoanEmail(loan, 'return_receipt', loan.memberName, 'member');

  saveDatabase(db);
  const payload = getBootstrapPayload();
  broadcastEvent('bootstrap_sync', payload);
  res.json({ loan, payload });
});

app.post('/api/loans/:id/extend', (req, res) => {
  const loanIndex = db.loans.findIndex((l) => l.id === req.params.id);
  if (loanIndex === -1) {
    res.status(404).json({ error: 'Transaksi peminjaman tidak ditemukan.' });
    return;
  }

  const loan = refreshLoanComputedFields(db.loans[loanIndex], db.settings);
  if (loan.returnedAt) {
    res.status(409).json({ error: 'Peminjaman yang sudah selesai tidak dapat diperpanjang.' });
    return;
  }
  if (loan.extensionsCount >= 2) {
    res.status(409).json({ error: 'Batas maksimal perpanjangan (2 kali) telah tercapai.' });
    return;
  }

  const nextDue = new Date(loan.dueAt);
  nextDue.setDate(nextDue.getDate() + 3);
  loan.dueAt = nextDue.toISOString();
  loan.durationDays += 3;
  loan.extensionsCount += 1;

  const updated = refreshLoanComputedFields(loan, db.settings);
  db.loans[loanIndex] = updated;

  recordEvent({
    kind: 'extend',
    title: 'Perpanjangan Masa Pinjam (+3 Hari)',
    detail: `${loan.memberName} memperpanjang "${loan.bookTitle}" hingga ${new Date(updated.dueAt).toLocaleDateString('id-ID')}`,
    actorName: loan.memberName,
    actorRole: 'member',
    memberId: loan.memberId,
    bookId: loan.bookId,
    loanId: loan.id,
  });

  saveDatabase(db);
  const payload = getBootstrapPayload();
  broadcastEvent('bootstrap_sync', payload);
  res.json({ loan: updated, payload });
});

app.post('/api/reminders/scan', async (req, res) => {
  const { force } = (req.body || {}) as { force?: boolean };
  const sent = await runDueDateReminderScan(Boolean(force), 'Admin Pustakawan');
  res.json({
    sentCount: sent.length,
    notifications: sent,
    payload: getBootstrapPayload(),
  });
});

app.post('/api/reminders/send/:loanId', async (req, res) => {
  const loan = db.loans.find((l) => l.id === req.params.loanId);
  if (!loan) {
    res.status(404).json({ error: 'Transaksi peminjaman tidak ditemukan.' });
    return;
  }
  const refreshed = refreshLoanComputedFields(loan, db.settings);
  const daysRemaining = computeDaysRemaining(refreshed.dueAt);
  const kind: EmailKind = daysRemaining < 0 ? 'overdue' : 'due_soon';

  const notif = await sendLoanEmail(refreshed, kind, 'Admin Pustakawan', 'admin');
  saveDatabase(db);
  const payload = getBootstrapPayload();
  broadcastEvent('bootstrap_sync', payload);
  res.json({ notification: notif, payload });
});

app.post('/api/reports/generate', (req, res) => {
  const { type } = (req.body || {}) as { type?: ReportType };
  const reportType: ReportType =
    type === 'keterlambatan' || type === 'koleksi' ? type : 'sirkulasi';

  const report = buildReportObject(db, reportType, 'manual');
  db.reports.unshift(report);
  db.settings.lastAutoReportAt = report.generatedAt;

  recordEvent({
    kind: 'report_generated',
    title: 'Laporan Otomatis Dibuat',
    detail: `${report.title} (${report.rows.length} baris data)`,
    actorName: 'Admin Pustakawan',
    actorRole: 'admin',
  });

  saveDatabase(db);
  const payload = getBootstrapPayload();
  broadcastEvent('bootstrap_sync', payload);
  res.status(201).json({ report, payload });
});

app.get('/api/reports/:id/csv', (req, res) => {
  const report = db.reports.find((r) => r.id === req.params.id);
  if (!report) {
    res.status(404).json({ error: 'Laporan tidak ditemukan.' });
    return;
  }

  const headers = report.rows.length > 0 ? Object.keys(report.rows[0]) : ['Info'];
  const csvLines = [headers.join(',')];
  for (const row of report.rows) {
    const vals = headers.map((h) => {
      const cell = String(row[h] ?? '');
      return `"${cell.replace(/"/g, '""')}"`;
    });
    csvLines.push(vals.join(','));
  }

  const bom = '\uFEFF';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="pustakanusa-${report.type}-${report.id}.csv"`
  );
  res.send(bom + csvLines.join('\n'));
});

app.put('/api/settings', (req, res) => {
  const body = req.body as Partial<typeof db.settings>;
  if (body.reminderLeadDays !== undefined) {
    db.settings.reminderLeadDays = Math.min(7, Math.max(0, Number(body.reminderLeadDays)));
  }
  if (body.autoReminderEnabled !== undefined) {
    db.settings.autoReminderEnabled = Boolean(body.autoReminderEnabled);
  }
  if (body.autoReportEnabled !== undefined) {
    db.settings.autoReportEnabled = Boolean(body.autoReportEnabled);
  }
  if (body.autoReportFrequency === 'harian' || body.autoReportFrequency === 'mingguan') {
    db.settings.autoReportFrequency = body.autoReportFrequency;
  }
  if (body.finePerDayIdr !== undefined) {
    db.settings.finePerDayIdr = Math.max(0, Number(body.finePerDayIdr));
  }
  if (body.maxLoansPerMember !== undefined) {
    db.settings.maxLoansPerMember = Math.min(15, Math.max(1, Number(body.maxLoansPerMember)));
  }

  db.loans = db.loans.map((l) => refreshLoanComputedFields(l, db.settings));
  saveDatabase(db);
  const payload = getBootstrapPayload();
  broadcastEvent('bootstrap_sync', payload);
  res.json({ settings: db.settings, payload });
});

// Background scheduler for real-time due-date reminders & automatic reports
setInterval(() => {
  if (db.settings.autoReminderEnabled) {
    runDueDateReminderScan(false, 'Penjadwal Otomatis').catch((err) => {
      console.error('Auto reminder scan error:', err);
    });
  }

  if (db.settings.autoReportEnabled) {
    const last = db.settings.lastAutoReportAt
      ? new Date(db.settings.lastAutoReportAt).getTime()
      : 0;
    const intervalMs =
      db.settings.autoReportFrequency === 'mingguan'
        ? 7 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;

    if (Date.now() - last >= intervalMs) {
      const report = buildReportObject(db, 'sirkulasi', 'otomatis');
      db.reports.unshift(report);
      db.settings.lastAutoReportAt = report.generatedAt;
      recordEvent({
        kind: 'report_generated',
        title: 'Laporan Terjadwal Otomatis',
        detail: `${report.title} diterbitkan oleh penjadwal otomatis`,
        actorName: 'Penjadwal Otomatis',
        actorRole: 'system',
      });
      saveDatabase(db);
      broadcastEvent('bootstrap_sync', getBootstrapPayload());
    }
  }
}, 45000);

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PustakaNusa server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
