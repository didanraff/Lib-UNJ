export type UserRole = 'admin' | 'member';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  memberCode: string;
  department: string;
  joinedAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  publisher: string;
  year: number;
  pages: number;
  shelfCode: string;
  totalCopies: number;
  availableCopies: number;
  coverUrl: string;
  coverTone: 'slate' | 'cobalt' | 'emerald' | 'amber' | 'indigo';
  description: string;
  digitalExcerpt: string;
  totalBorrowed: number;
  createdAt: string;
}

export type LoanStatus = 'active' | 'due_soon' | 'overdue' | 'returned';

export interface Loan {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookIsbn: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberCode: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  durationDays: number;
  extensionsCount: number;
  fineAmount: number;
  status: LoanStatus;
  lastReminderSentAt: string | null;
  reminderCount: number;
}

export type EventKind =
  | 'borrow'
  | 'return'
  | 'extend'
  | 'email_reminder'
  | 'book_added'
  | 'book_updated'
  | 'report_generated';

export interface TransactionEvent {
  id: string;
  kind: EventKind;
  title: string;
  detail: string;
  actorName: string;
  actorRole: UserRole | 'system';
  memberId?: string;
  bookId?: string;
  loanId?: string;
  createdAt: string;
}

export type EmailKind = 'due_soon' | 'overdue' | 'borrow_confirmation' | 'return_receipt';
export type EmailDeliveryMode = 'smtp' | 'outbox_simulated';

export interface EmailNotification {
  id: string;
  loanId: string;
  memberId: string;
  memberName: string;
  recipientEmail: string;
  subject: string;
  kind: EmailKind;
  deliveryMode: EmailDeliveryMode;
  status: 'sent' | 'failed';
  errorMessage?: string;
  htmlBody: string;
  textSummary: string;
  sentAt: string;
}

export type ReportType = 'sirkulasi' | 'keterlambatan' | 'koleksi';

export interface AutoReportSummary {
  totalLoansInPeriod: number;
  activeLoansCount: number;
  returnedLoansCount: number;
  overdueLoansCount: number;
  totalFinesIdr: number;
  emailsSentCount: number;
  topCategory: string;
  topBooks: Array<{ title: string; author: string; count: number }>;
}

export interface AutoReport {
  id: string;
  title: string;
  type: ReportType;
  trigger: 'otomatis' | 'manual';
  periodLabel: string;
  generatedAt: string;
  summary: AutoReportSummary;
  rows: Array<Record<string, string | number>>;
}

export interface LibrarySettings {
  reminderLeadDays: number;
  autoReminderEnabled: boolean;
  autoReportEnabled: boolean;
  autoReportFrequency: 'harian' | 'mingguan';
  finePerDayIdr: number;
  maxLoansPerMember: number;
  lastAutoScanAt: string | null;
  lastAutoReportAt: string | null;
}

export interface DailySeriesPoint {
  date: string;
  label: string;
  borrowed: number;
  returned: number;
}

export interface CategoryStat {
  category: string;
  booksCount: number;
  borrowedCount: number;
  availableCopies: number;
  totalCopies: number;
}

export interface DashboardStats {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  activeLoans: number;
  dueSoonLoans: number;
  overdueLoans: number;
  returnedLoans: number;
  totalEmailsSent: number;
  totalFinesIdr: number;
  dailySeries: DailySeriesPoint[];
  categoryStats: CategoryStat[];
}

export interface BootstrapPayload {
  books: Book[];
  loans: Loan[];
  users: UserProfile[];
  events: TransactionEvent[];
  emailLogs: EmailNotification[];
  reports: AutoReport[];
  settings: LibrarySettings;
  stats: DashboardStats;
  smtpConfigured: boolean;
  serverTime: string;
}
