import fs from 'fs';
import path from 'path';
import type {
  AutoReport,
  Book,
  CategoryStat,
  DailySeriesPoint,
  DashboardStats,
  EmailNotification,
  LibrarySettings,
  Loan,
  LoanStatus,
  ReportType,
  TransactionEvent,
  UserProfile,
} from '../src/types/library.ts';
import { buildLibraryEmailContent } from './mailer.ts';

export interface DatabaseState {
  users: UserProfile[];
  books: Book[];
  loans: Loan[];
  events: TransactionEvent[];
  emailLogs: EmailNotification[];
  reports: AutoReport[];
  settings: LibrarySettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'library-db.json');

function daysOffsetIso(offsetDays: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

export function computeDaysRemaining(dueIso: string): number {
  const now = new Date();
  const due = new Date(dueIso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((startOfDue.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
}

export function refreshLoanComputedFields(
  loan: Loan,
  settings: LibrarySettings
): Loan {
  if (loan.returnedAt) {
    return { ...loan, status: 'returned' };
  }
  const daysRemaining = computeDaysRemaining(loan.dueAt);
  let status: LoanStatus = 'active';
  let fineAmount = 0;

  if (daysRemaining < 0) {
    status = 'overdue';
    fineAmount = Math.abs(daysRemaining) * settings.finePerDayIdr;
  } else if (daysRemaining <= settings.reminderLeadDays) {
    status = 'due_soon';
  }

  return {
    ...loan,
    status,
    fineAmount,
  };
}

function createInitialState(): DatabaseState {
  const users: UserProfile[] = [
    {
      id: 'usr-admin-1',
      name: 'Raka Mahendra',
      email: 'admin@pustakanusa.id',
      role: 'admin',
      memberCode: 'ADM-001',
      department: 'Kepala Pustakawan Digital',
      joinedAt: daysOffsetIso(-240),
    },
    {
      id: 'usr-member-1',
      name: 'Didan Ramadhan',
      email: 'didanr05@gmail.com',
      role: 'member',
      memberCode: 'ANG-2026-014',
      department: 'Teknik Informatika',
      joinedAt: daysOffsetIso(-120),
    },
    {
      id: 'usr-member-2',
      name: 'Siti Nurhaliza Putri',
      email: 'siti.putri@kampus.ac.id',
      role: 'member',
      memberCode: 'ANG-2026-029',
      department: 'Arsitektur & Tata Kota',
      joinedAt: daysOffsetIso(-95),
    },
    {
      id: 'usr-member-3',
      name: 'Bima Prakoso',
      email: 'bima.prakoso@riset.id',
      role: 'member',
      memberCode: 'ANG-2026-041',
      department: 'Ekonomi Pembangunan',
      joinedAt: daysOffsetIso(-64),
    },
  ];

  const books: Book[] = [
    {
      id: 'bk-01',
      title: 'Arsitektur Tropis Nusantara: Ruang, Iklim, dan Material',
      author: 'Dr. Hendra Kusuma',
      isbn: '978-602-4512-01-4',
      category: 'Arsitektur',
      publisher: 'Pustaka Cendekia',
      year: 2024,
      pages: 342,
      shelfCode: 'ARC-101',
      totalCopies: 6,
      availableCopies: 4,
      coverUrl: '/src/assets/images/cover_arsitektur_nusantara_1795658547798.jpg',
      coverTone: 'slate',
      description: 'Kajian mendalam tentang adaptasi kayu lokal, batu kapur, dan ventilasi silang pada arsitektur tropis modern di kepulauan Indonesia.',
      digitalExcerpt: 'Bab 1 — Geometri Cahaya Tropis\n\nDi garis khatulistiwa, sudut jatuh sinar matahari membentuk ritme bayangan yang tegas sepanjang tahun. Bangunan yang responsif terhadap iklim tidak menutup diri dari angin muson, melainkan mengarahkannya melalui kisi-kisi kayu ulin dan teras berundak.\n\nPada bagian ini kita menelaah tiga prinsip dasar: orientasi massa bangunan, porositas selubung fasad, serta inersia termal material batu alam.',
      totalBorrowed: 28,
      createdAt: daysOffsetIso(-180),
    },
    {
      id: 'bk-02',
      title: 'Algoritma & Struktur Data Skala Besar',
      author: 'Nadia Wijaya, M.Kom.',
      isbn: '978-602-4512-08-3',
      category: 'Teknologi',
      publisher: 'Informatika Press',
      year: 2025,
      pages: 486,
      shelfCode: 'TEK-204',
      totalCopies: 8,
      availableCopies: 5,
      coverUrl: '/src/assets/images/cover_algoritma_data_1795658548419.jpg',
      coverTone: 'cobalt',
      description: 'Panduan implementasi indeks B-Tree, graf terdistribusi, dan pemrosesan aliran data real-time untuk sistem modern.',
      digitalExcerpt: 'Bab 3 — Kisi Graf & Pencarian Terindeks\n\nKetika jumlah simpul melewati puluhan juta entitas, kompleksitas traversal linear menjadi penghambat utama latensi aplikasi. Dengan mempartisi graf berdasarkan lokalitas akses dan menerapkan indeks hibrida, waktu pencarian dapat ditekan menjadi sub-milidetik.',
      totalBorrowed: 42,
      createdAt: daysOffsetIso(-160),
    },
    {
      id: 'bk-03',
      title: 'Ekonomi Hijau & Transisi Energi Kepulauan',
      author: 'Prof. Darmawan Tanoto',
      isbn: '978-602-4512-14-4',
      category: 'Ekonomi',
      publisher: 'Balai Pustaka Baru',
      year: 2025,
      pages: 298,
      shelfCode: 'EKO-112',
      totalCopies: 5,
      availableCopies: 4,
      coverUrl: '/src/assets/images/cover_ekonomi_hijau_1795658548429.jpg',
      coverTone: 'emerald',
      description: 'Analisis kebijakan fiskal berkelanjutan, kredit karbon hutan tropis, dan strategi pembiayaan energi terbarukan di Asia Tenggara.',
      digitalExcerpt: 'Bab 2 — Neraca Ekologis Pembangunan\n\nPertumbuhan ekonomi jangka panjang menuntut integrasi modal alam ke dalam neraca makroekonomi nasional. Skema pembiayaan hijau membuka akses investasi bagi proyek mikrohidro dan konservasi mangrove berbasis masyarakat.',
      totalBorrowed: 19,
      createdAt: daysOffsetIso(-140),
    },
    {
      id: 'bk-04',
      title: 'Senja di Pelabuhan Timur: Antologi Prosa',
      author: 'Larasati Seno',
      isbn: '978-602-4512-22-9',
      category: 'Sastra',
      publisher: 'Gramata Aksara',
      year: 2023,
      pages: 224,
      shelfCode: 'SAS-045',
      totalCopies: 7,
      availableCopies: 5,
      coverUrl: '/src/assets/images/cover_sastra_senja_1795658548856.jpg',
      coverTone: 'amber',
      description: 'Kumpulan cerita pendek yang merekam denyut kehidupan masyarakat pesisir timur Nusantara di persimpangan tradisi dan modernitas.',
      digitalExcerpt: 'Prolog — Angin Buritan\n\nLampu mercusuar di ujung tanjung mulai berkedip ketika perahu-perahu kayu merapat membawa garam dan kabar dari pulau seberang. Di dermaga batu itu, setiap langkah selalu meninggalkan gema sejarah yang belum sempat dituliskan.',
      totalBorrowed: 31,
      createdAt: daysOffsetIso(-130),
    },
    {
      id: 'bk-05',
      title: 'Atlas Sejarah Maritim Nusantara Abad XV–XVII',
      author: 'Dr. Bagus Suryadi',
      isbn: '978-602-4512-31-1',
      category: 'Sejarah',
      publisher: 'Pustaka Maritim',
      year: 2024,
      pages: 410,
      shelfCode: 'SEJ-308',
      totalCopies: 4,
      availableCopies: 3,
      coverUrl: '/src/assets/images/cover_sejarah_maritim_1795658550201.jpg',
      coverTone: 'indigo',
      description: 'Rekonstruksi rute perdagangan rempah, teknologi perkapalan jong, dan jaringan pelabuhan kosmopolitan di perairan Nusantara.',
      digitalExcerpt: 'Bab 4 — Astrolab dan Peta Angin Muson\n\nPara navigator Nusantara memadukan pembacaan rasi bintang selatan dengan pengamatan arus laut dan warna air dangkal. Jaringan pelabuhan dari Malaka hingga Banda terhubung oleh jadwal pelayaran musiman yang presisi.',
      totalBorrowed: 24,
      createdAt: daysOffsetIso(-110),
    },
    {
      id: 'bk-06',
      title: 'Sistem Terdistribusi: Konsistensi & Replikasi',
      author: 'Dimas Pradipta',
      isbn: '978-602-4512-40-3',
      category: 'Teknologi',
      publisher: 'Informatika Press',
      year: 2025,
      pages: 378,
      shelfCode: 'TEK-219',
      totalCopies: 5,
      availableCopies: 5,
      coverUrl: '',
      coverTone: 'cobalt',
      description: 'Pembahasan praktis protokol konsensus Raft, partisi data, dan ketahanan layanan berskala tinggi.',
      digitalExcerpt: 'Bab 1 — Mengapa Jaringan Tidak Pernah Andal\n\nDalam sistem terdistribusi, kegagalan parsial adalah kondisi normal, bukan pengecualian. Perancangan sistem tangguh dimulai dari pemahaman batasan konsistensi dan mekanisme pemulihan otomatis.',
      totalBorrowed: 16,
      createdAt: daysOffsetIso(-90),
    },
    {
      id: 'bk-07',
      title: 'Tipografi Editorial & Sistem Grid Modern',
      author: 'Clara Hartono',
      isbn: '978-602-4512-47-2',
      category: 'Desain',
      publisher: 'Rupa Studio Press',
      year: 2024,
      pages: 260,
      shelfCode: 'DSN-088',
      totalCopies: 4,
      availableCopies: 3,
      coverUrl: '',
      coverTone: 'slate',
      description: 'Prinsip hierarki visual, ritme baseline grid, dan keterbacaan antarmuka digital lintas perangkat.',
      digitalExcerpt: 'Bab 2 — Proporsi dan Ruang Negatif\n\nRuang kosong bukan sisa halaman yang belum terisi, melainkan elemen aktif yang mengatur tempo pembacaan mata. Kontras skala antara tajuk dan teks tubuh menentukan kejelasan informasi dalam sekejap.',
      totalBorrowed: 21,
      createdAt: daysOffsetIso(-80),
    },
    {
      id: 'bk-08',
      title: 'Metodologi Riset Kualitatif & Etnografi Digital',
      author: 'Dr. Ratna Dewi',
      isbn: '978-602-4512-55-7',
      category: 'Sains & Riset',
      publisher: 'Akademia Nusantara',
      year: 2024,
      pages: 315,
      shelfCode: 'RSH-104',
      totalCopies: 6,
      availableCopies: 6,
      coverUrl: '',
      coverTone: 'emerald',
      description: 'Panduan lengkap teknik observasi partisipatif, pengkodean tematik, dan validasi data lapangan di era digital.',
      digitalExcerpt: 'Bab 1 — Etika Observasi Ruang Digital\n\nPeneliti masa kini tidak lagi memisahkan interaksi tatap muka dan komunikasi daring. Dokumentasi lapangan yang jujur memerlukan persetujuan eksplisit serta triangulasi sumber yang ketat.',
      totalBorrowed: 12,
      createdAt: daysOffsetIso(-70),
    },
  ];

  const settings: LibrarySettings = {
    reminderLeadDays: 2,
    autoReminderEnabled: true,
    autoReportEnabled: true,
    autoReportFrequency: 'harian',
    finePerDayIdr: 2500,
    maxLoansPerMember: 5,
    lastAutoScanAt: daysOffsetIso(0, 8),
    lastAutoReportAt: daysOffsetIso(-1, 23),
  };

  const rawLoans: Loan[] = [
    {
      id: 'ln-1001',
      bookId: 'bk-02',
      bookTitle: 'Algoritma & Struktur Data Skala Besar',
      bookAuthor: 'Nadia Wijaya, M.Kom.',
      bookIsbn: '978-602-4512-08-3',
      memberId: 'usr-member-1',
      memberName: 'Didan Ramadhan',
      memberEmail: 'didanr05@gmail.com',
      memberCode: 'ANG-2026-014',
      borrowedAt: daysOffsetIso(-6, 9),
      dueAt: daysOffsetIso(1, 23),
      returnedAt: null,
      durationDays: 7,
      extensionsCount: 0,
      fineAmount: 0,
      status: 'due_soon',
      lastReminderSentAt: daysOffsetIso(0, 8),
      reminderCount: 1,
    },
    {
      id: 'ln-1002',
      bookId: 'bk-01',
      bookTitle: 'Arsitektur Tropis Nusantara: Ruang, Iklim, dan Material',
      bookAuthor: 'Dr. Hendra Kusuma',
      bookIsbn: '978-602-4512-01-4',
      memberId: 'usr-member-1',
      memberName: 'Didan Ramadhan',
      memberEmail: 'didanr05@gmail.com',
      memberCode: 'ANG-2026-014',
      borrowedAt: daysOffsetIso(-2, 14),
      dueAt: daysOffsetIso(5, 23),
      returnedAt: null,
      durationDays: 7,
      extensionsCount: 0,
      fineAmount: 0,
      status: 'active',
      lastReminderSentAt: null,
      reminderCount: 0,
    },
    {
      id: 'ln-1003',
      bookId: 'bk-04',
      bookTitle: 'Senja di Pelabuhan Timur: Antologi Prosa',
      bookAuthor: 'Larasati Seno',
      bookIsbn: '978-602-4512-22-9',
      memberId: 'usr-member-2',
      memberName: 'Siti Nurhaliza Putri',
      memberEmail: 'siti.putri@kampus.ac.id',
      memberCode: 'ANG-2026-029',
      borrowedAt: daysOffsetIso(-10, 11),
      dueAt: daysOffsetIso(-3, 23),
      returnedAt: null,
      durationDays: 7,
      extensionsCount: 0,
      fineAmount: 7500,
      status: 'overdue',
      lastReminderSentAt: daysOffsetIso(0, 8),
      reminderCount: 2,
    },
    {
      id: 'ln-1004',
      bookId: 'bk-03',
      bookTitle: 'Ekonomi Hijau & Transisi Energi Kepulauan',
      bookAuthor: 'Prof. Darmawan Tanoto',
      bookIsbn: '978-602-4512-14-4',
      memberId: 'usr-member-3',
      memberName: 'Bima Prakoso',
      memberEmail: 'bima.prakoso@riset.id',
      memberCode: 'ANG-2026-041',
      borrowedAt: daysOffsetIso(-5, 16),
      dueAt: daysOffsetIso(2, 23),
      returnedAt: null,
      durationDays: 7,
      extensionsCount: 0,
      fineAmount: 0,
      status: 'due_soon',
      lastReminderSentAt: daysOffsetIso(0, 8),
      reminderCount: 1,
    },
    {
      id: 'ln-1005',
      bookId: 'bk-05',
      bookTitle: 'Atlas Sejarah Maritim Nusantara Abad XV–XVII',
      bookAuthor: 'Dr. Bagus Suryadi',
      bookIsbn: '978-602-4512-31-1',
      memberId: 'usr-member-2',
      memberName: 'Siti Nurhaliza Putri',
      memberEmail: 'siti.putri@kampus.ac.id',
      memberCode: 'ANG-2026-029',
      borrowedAt: daysOffsetIso(-3, 10),
      dueAt: daysOffsetIso(11, 23),
      returnedAt: null,
      durationDays: 14,
      extensionsCount: 0,
      fineAmount: 0,
      status: 'active',
      lastReminderSentAt: null,
      reminderCount: 0,
    },
    {
      id: 'ln-1006',
      bookId: 'bk-07',
      bookTitle: 'Tipografi Editorial & Sistem Grid Modern',
      bookAuthor: 'Clara Hartono',
      bookIsbn: '978-602-4512-47-2',
      memberId: 'usr-member-3',
      memberName: 'Bima Prakoso',
      memberEmail: 'bima.prakoso@riset.id',
      memberCode: 'ANG-2026-041',
      borrowedAt: daysOffsetIso(-9, 13),
      dueAt: daysOffsetIso(-2, 23),
      returnedAt: null,
      durationDays: 7,
      extensionsCount: 0,
      fineAmount: 5000,
      status: 'overdue',
      lastReminderSentAt: daysOffsetIso(-1, 9),
      reminderCount: 1,
    },
    // Returned historical loans over past 14 days for realistic chart telemetry
    {
      id: 'ln-1007',
      bookId: 'bk-02',
      bookTitle: 'Algoritma & Struktur Data Skala Besar',
      bookAuthor: 'Nadia Wijaya, M.Kom.',
      bookIsbn: '978-602-4512-08-3',
      memberId: 'usr-member-1',
      memberName: 'Didan Ramadhan',
      memberEmail: 'didanr05@gmail.com',
      memberCode: 'ANG-2026-014',
      borrowedAt: daysOffsetIso(-13, 10),
      dueAt: daysOffsetIso(-6, 23),
      returnedAt: daysOffsetIso(-7, 15),
      durationDays: 7,
      extensionsCount: 0,
      fineAmount: 0,
      status: 'returned',
      lastReminderSentAt: null,
      reminderCount: 0,
    },
    {
      id: 'ln-1008',
      bookId: 'bk-01',
      bookTitle: 'Arsitektur Tropis Nusantara: Ruang, Iklim, dan Material',
      bookAuthor: 'Dr. Hendra Kusuma',
      bookIsbn: '978-602-4512-01-4',
      memberId: 'usr-member-2',
      memberName: 'Siti Nurhaliza Putri',
      memberEmail: 'siti.putri@kampus.ac.id',
      memberCode: 'ANG-2026-029',
      borrowedAt: daysOffsetIso(-12, 11),
      dueAt: daysOffsetIso(-5, 23),
      returnedAt: daysOffsetIso(-5, 16),
      durationDays: 7,
      extensionsCount: 0,
      fineAmount: 0,
      status: 'returned',
      lastReminderSentAt: null,
      reminderCount: 0,
    },
    {
      id: 'ln-1009',
      bookId: 'bk-06',
      bookTitle: 'Sistem Terdistribusi: Konsistensi & Replikasi',
      bookAuthor: 'Dimas Pradipta',
      bookIsbn: '978-602-4512-40-3',
      memberId: 'usr-member-1',
      memberName: 'Didan Ramadhan',
      memberEmail: 'didanr05@gmail.com',
      memberCode: 'ANG-2026-014',
      borrowedAt: daysOffsetIso(-11, 9),
      dueAt: daysOffsetIso(-4, 23),
      returnedAt: daysOffsetIso(-4, 14),
      durationDays: 7,
      extensionsCount: 0,
      fineAmount: 0,
      status: 'returned',
      lastReminderSentAt: null,
      reminderCount: 0,
    },
    {
      id: 'ln-1010',
      bookId: 'bk-08',
      bookTitle: 'Metodologi Riset Kualitatif & Etnografi Digital',
      bookAuthor: 'Dr. Ratna Dewi',
      bookIsbn: '978-602-4512-55-7',
      memberId: 'usr-member-3',
      memberName: 'Bima Prakoso',
      memberEmail: 'bima.prakoso@riset.id',
      memberCode: 'ANG-2026-041',
      borrowedAt: daysOffsetIso(-8, 13),
      dueAt: daysOffsetIso(-1, 23),
      returnedAt: daysOffsetIso(-2, 11),
      durationDays: 7,
      extensionsCount: 0,
      fineAmount: 0,
      status: 'returned',
      lastReminderSentAt: null,
      reminderCount: 0,
    },
    {
      id: 'ln-1011',
      bookId: 'bk-04',
      bookTitle: 'Senja di Pelabuhan Timur: Antologi Prosa',
      bookAuthor: 'Larasati Seno',
      bookIsbn: '978-602-4512-22-9',
      memberId: 'usr-member-3',
      memberName: 'Bima Prakoso',
      memberEmail: 'bima.prakoso@riset.id',
      memberCode: 'ANG-2026-041',
      borrowedAt: daysOffsetIso(-4, 10),
      dueAt: daysOffsetIso(3, 23),
      returnedAt: daysOffsetIso(-1, 17),
      durationDays: 7,
      extensionsCount: 0,
      fineAmount: 0,
      status: 'returned',
      lastReminderSentAt: null,
      reminderCount: 0,
    },
  ];

  // Sync availableCopies accurately from active loans
  const activeCountByBook = new Map<string, number>();
  const loans = rawLoans.map((l) => {
    const refreshed = refreshLoanComputedFields(l, settings);
    if (!refreshed.returnedAt) {
      activeCountByBook.set(refreshed.bookId, (activeCountByBook.get(refreshed.bookId) || 0) + 1);
    }
    return refreshed;
  });

  const syncedBooks = books.map((b) => {
    const active = activeCountByBook.get(b.id) || 0;
    return {
      ...b,
      availableCopies: Math.max(0, b.totalCopies - active),
    };
  });

  const sampleEmail1 = buildLibraryEmailContent(loans[0], 'due_soon', 1);
  const sampleEmail2 = buildLibraryEmailContent(loans[2], 'overdue', -3);
  const sampleEmail3 = buildLibraryEmailContent(loans[3], 'due_soon', 2);

  const emailLogs: EmailNotification[] = [
    {
      id: 'eml-101',
      loanId: loans[0].id,
      memberId: loans[0].memberId,
      memberName: loans[0].memberName,
      recipientEmail: loans[0].memberEmail,
      subject: sampleEmail1.subject,
      kind: 'due_soon',
      deliveryMode: 'outbox_simulated',
      status: 'sent',
      htmlBody: sampleEmail1.htmlBody,
      textSummary: sampleEmail1.textSummary,
      sentAt: daysOffsetIso(0, 8),
    },
    {
      id: 'eml-102',
      loanId: loans[2].id,
      memberId: loans[2].memberId,
      memberName: loans[2].memberName,
      recipientEmail: loans[2].memberEmail,
      subject: sampleEmail2.subject,
      kind: 'overdue',
      deliveryMode: 'outbox_simulated',
      status: 'sent',
      htmlBody: sampleEmail2.htmlBody,
      textSummary: sampleEmail2.textSummary,
      sentAt: daysOffsetIso(0, 8),
    },
    {
      id: 'eml-103',
      loanId: loans[3].id,
      memberId: loans[3].memberId,
      memberName: loans[3].memberName,
      recipientEmail: loans[3].memberEmail,
      subject: sampleEmail3.subject,
      kind: 'due_soon',
      deliveryMode: 'outbox_simulated',
      status: 'sent',
      htmlBody: sampleEmail3.htmlBody,
      textSummary: sampleEmail3.textSummary,
      sentAt: daysOffsetIso(0, 8),
    },
  ];

  const events: TransactionEvent[] = [
    {
      id: 'evt-105',
      kind: 'email_reminder',
      title: 'Pengingat Jatuh Tempo Terkirim',
      detail: `Email pengingat H-1 dikirim ke ${loans[0].memberEmail} untuk "${loans[0].bookTitle}"`,
      actorName: 'Penjadwal Otomatis',
      actorRole: 'system',
      memberId: loans[0].memberId,
      bookId: loans[0].bookId,
      loanId: loans[0].id,
      createdAt: daysOffsetIso(0, 8),
    },
    {
      id: 'evt-104',
      kind: 'return',
      title: 'Pengembalian Buku Selesai',
      detail: `${loans[10].memberName} mengembalikan "${loans[10].bookTitle}" tepat waktu`,
      actorName: loans[10].memberName,
      actorRole: 'member',
      memberId: loans[10].memberId,
      bookId: loans[10].bookId,
      loanId: loans[10].id,
      createdAt: daysOffsetIso(-1, 17),
    },
    {
      id: 'evt-103',
      kind: 'borrow',
      title: 'Peminjaman Buku Online',
      detail: `${loans[1].memberName} meminjam "${loans[1].bookTitle}" (durasi 7 hari)`,
      actorName: loans[1].memberName,
      actorRole: 'member',
      memberId: loans[1].memberId,
      bookId: loans[1].bookId,
      loanId: loans[1].id,
      createdAt: daysOffsetIso(-2, 14),
    },
    {
      id: 'evt-102',
      kind: 'borrow',
      title: 'Peminjaman Buku Online',
      detail: `${loans[4].memberName} meminjam "${loans[4].bookTitle}" (durasi 14 hari)`,
      actorName: loans[4].memberName,
      actorRole: 'member',
      memberId: loans[4].memberId,
      bookId: loans[4].bookId,
      loanId: loans[4].id,
      createdAt: daysOffsetIso(-3, 10),
    },
  ];

  const state: DatabaseState = {
    users,
    books: syncedBooks,
    loans,
    events,
    emailLogs,
    reports: [],
    settings,
  };

  state.reports = [buildReportObject(state, 'sirkulasi', 'otomatis')];
  return state;
}

export function buildReportObject(
  state: DatabaseState,
  type: ReportType,
  trigger: 'otomatis' | 'manual'
): AutoReport {
  const refreshedLoans = state.loans.map((l) =>
    refreshLoanComputedFields(l, state.settings)
  );
  const active = refreshedLoans.filter((l) => !l.returnedAt);
  const overdue = refreshedLoans.filter((l) => l.status === 'overdue');
  const returned = refreshedLoans.filter((l) => Boolean(l.returnedAt));
  const totalFinesIdr = refreshedLoans.reduce((sum, l) => sum + l.fineAmount, 0);

  const categoryCounts = new Map<string, number>();
  for (const loan of refreshedLoans) {
    const bk = state.books.find((b) => b.id === loan.bookId);
    const cat = bk?.category || 'Umum';
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
  }
  const topCategory =
    Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    'Teknologi';

  const topBooks = [...state.books]
    .sort((a, b) => b.totalBorrowed - a.totalBorrowed)
    .slice(0, 5)
    .map((b) => ({
      title: b.title,
      author: b.author,
      count: b.totalBorrowed,
    }));

  const now = new Date();
  const dateLabel = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  let title = '';
  let rows: Array<Record<string, string | number>> = [];

  if (type === 'keterlambatan') {
    title = `Laporan Keterlambatan & Denda — ${dateLabel}`;
    rows = overdue.map((l) => ({
      ID_Transaksi: l.id,
      Anggota: l.memberName,
      Email: l.memberEmail,
      Buku: l.bookTitle,
      Jatuh_Tempo: new Date(l.dueAt).toLocaleDateString('id-ID'),
      Hari_Terlambat: Math.max(1, Math.abs(computeDaysRemaining(l.dueAt))),
      Denda_IDR: l.fineAmount,
      Pengingat_Email: l.reminderCount,
    }));
  } else if (type === 'koleksi') {
    title = `Laporan Utilisasi Koleksi Digital — ${dateLabel}`;
    rows = state.books.map((b) => ({
      Kode_Rak: b.shelfCode,
      Judul: b.title,
      Penulis: b.author,
      Kategori: b.category,
      Total_Eksemplar: b.totalCopies,
      Tersedia: b.availableCopies,
      Dipinjam_Saat_Ini: b.totalCopies - b.availableCopies,
      Total_Sirkulasi: b.totalBorrowed,
    }));
  } else {
    title = `Laporan Sirkulasi Perpustakaan — ${dateLabel}`;
    rows = refreshedLoans.map((l) => ({
      ID_Transaksi: l.id,
      Anggota: l.memberName,
      Kode_Anggota: l.memberCode,
      Judul_Buku: l.bookTitle,
      Tanggal_Pinjam: new Date(l.borrowedAt).toLocaleDateString('id-ID'),
      Jatuh_Tempo: new Date(l.dueAt).toLocaleDateString('id-ID'),
      Status:
        l.status === 'overdue'
          ? 'Terlambat'
          : l.status === 'due_soon'
            ? 'Segera Jatuh Tempo'
            : l.status === 'returned'
              ? 'Dikembalikan'
              : 'Aktif',
      Denda_IDR: l.fineAmount,
    }));
  }

  return {
    id: `rpt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title,
    type,
    trigger,
    periodLabel: `Periode s.d. ${dateLabel}`,
    generatedAt: now.toISOString(),
    summary: {
      totalLoansInPeriod: refreshedLoans.length,
      activeLoansCount: active.length,
      returnedLoansCount: returned.length,
      overdueLoansCount: overdue.length,
      totalFinesIdr,
      emailsSentCount: state.emailLogs.length,
      topCategory,
      topBooks,
    },
    rows,
  };
}

export function computeDashboardStats(state: DatabaseState): DashboardStats {
  const refreshedLoans = state.loans.map((l) =>
    refreshLoanComputedFields(l, state.settings)
  );

  const totalTitles = state.books.length;
  const totalCopies = state.books.reduce((sum, b) => sum + b.totalCopies, 0);
  const availableCopies = state.books.reduce((sum, b) => sum + b.availableCopies, 0);
  const activeLoans = refreshedLoans.filter((l) => !l.returnedAt).length;
  const dueSoonLoans = refreshedLoans.filter((l) => l.status === 'due_soon').length;
  const overdueLoans = refreshedLoans.filter((l) => l.status === 'overdue').length;
  const returnedLoans = refreshedLoans.filter((l) => l.status === 'returned').length;
  const totalFinesIdr = refreshedLoans.reduce((sum, l) => sum + l.fineAmount, 0);

  // Build 14-day daily series
  const dailySeries: DailySeriesPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    const borrowed = refreshedLoans.filter(
      (l) => l.borrowedAt.slice(0, 10) === key
    ).length;
    const returned = refreshedLoans.filter(
      (l) => l.returnedAt && l.returnedAt.slice(0, 10) === key
    ).length;
    dailySeries.push({ date: key, label, borrowed, returned });
  }

  // Category breakdown
  const catMap = new Map<string, CategoryStat>();
  for (const b of state.books) {
    const existing = catMap.get(b.category) || {
      category: b.category,
      booksCount: 0,
      borrowedCount: 0,
      availableCopies: 0,
      totalCopies: 0,
    };
    existing.booksCount += 1;
    existing.borrowedCount += b.totalBorrowed;
    existing.availableCopies += b.availableCopies;
    existing.totalCopies += b.totalCopies;
    catMap.set(b.category, existing);
  }
  const categoryStats = Array.from(catMap.values()).sort(
    (a, b) => b.borrowedCount - a.borrowedCount
  );

  return {
    totalTitles,
    totalCopies,
    availableCopies,
    activeLoans,
    dueSoonLoans,
    overdueLoans,
    returnedLoans,
    totalEmailsSent: state.emailLogs.length,
    totalFinesIdr,
    dailySeries,
    categoryStats,
  };
}

export function loadDatabase(): DatabaseState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    const initial = createInitialState();
    saveDatabase(initial);
    return initial;
  }

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseState;
    parsed.loans = parsed.loans.map((l) =>
      refreshLoanComputedFields(l, parsed.settings)
    );
    return parsed;
  } catch {
    const fallback = createInitialState();
    saveDatabase(fallback);
    return fallback;
  }
}

export function saveDatabase(state: DatabaseState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
}
