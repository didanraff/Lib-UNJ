import { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Mail,
  RotateCcw,
} from 'lucide-react';
import type {
  EmailNotification,
  LibrarySettings,
  Loan,
  TransactionEvent,
  UserProfile,
} from '../types/library';
import {
  describeLoanDeadline,
  formatDateShort,
  formatDateTime,
  formatRupiah,
} from '../utils/format';

interface MemberDashboardProps {
  currentUser: UserProfile;
  loans: Loan[];
  events: TransactionEvent[];
  emailLogs: EmailNotification[];
  settings: LibrarySettings;
  onReturnBook: (loanId: string) => Promise<void>;
  onExtendLoan: (loanId: string) => Promise<void>;
  onNavigateCatalog: () => void;
}

export function MemberDashboard({
  currentUser,
  loans,
  events,
  emailLogs,
  settings,
  onReturnBook,
  onExtendLoan,
  onNavigateCatalog,
}: MemberDashboardProps) {
  const [busyLoanId, setBusyLoanId] = useState<string | null>(null);
  const [previewEmail, setPreviewEmail] = useState<EmailNotification | null>(null);

  const myLoans = useMemo(
    () => loans.filter((l) => l.memberId === currentUser.id),
    [loans, currentUser.id]
  );

  const activeLoans = useMemo(
    () => myLoans.filter((l) => !l.returnedAt),
    [myLoans]
  );

  const returnedLoans = useMemo(
    () => myLoans.filter((l) => Boolean(l.returnedAt)),
    [myLoans]
  );

  const myEmails = useMemo(
    () => emailLogs.filter((e) => e.memberId === currentUser.id),
    [emailLogs, currentUser.id]
  );

  const myEvents = useMemo(
    () => events.filter((e) => e.memberId === currentUser.id).slice(0, 8),
    [events, currentUser.id]
  );

  const nearestDueLoan = useMemo(() => {
    if (activeLoans.length === 0) return null;
    return [...activeLoans].sort(
      (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
    )[0];
  }, [activeLoans]);

  const totalFines = myLoans.reduce((sum, l) => sum + l.fineAmount, 0);

  const handleAction = async (
    loanId: string,
    fn: (id: string) => Promise<void>
  ) => {
    setBusyLoanId(loanId);
    try {
      await fn(loanId);
    } finally {
      setBusyLoanId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Member KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Sedang Dipinjam</span>
            <BookOpen className="w-4 h-4 text-blue-700" />
          </div>
          <div className="mt-2.5 font-display text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {activeLoans.length} / {settings.maxLoansPerMember} Buku
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Kuota peminjaman aktif Anda
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Jatuh Tempo Terdekat</span>
            <CalendarClock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2.5 font-display text-xl font-bold text-slate-900 truncate">
            {nearestDueLoan
              ? describeLoanDeadline(nearestDueLoan.dueAt, null)
              : 'Tidak ada'}
          </div>
          <div className="mt-1 text-xs text-slate-500 truncate">
            {nearestDueLoan
              ? nearestDueLoan.bookTitle
              : 'Belum ada pinjaman aktif'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Riwayat Selesai</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5 font-display text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {returnedLoans.length} Buku
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Total transaksi selesai dibaca
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Denda Berjalan</span>
            <AlertCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2.5 font-display text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {formatRupiah(totalFines)}
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            Tarif {formatRupiah(settings.finePerDayIdr)}/hari terlambat
          </div>
        </div>
      </div>

      {/* Active Loans */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Peminjaman Aktif Anda
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau tenggat waktu, perpanjang masa pinjam, atau kembalikan buku secara online
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateCatalog}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Jelajahi Katalog
          </button>
        </div>

        {activeLoans.length === 0 ? (
          <div className="py-10 text-center border-t border-slate-100">
            <p className="text-sm text-slate-600">
              Anda tidak memiliki peminjaman buku aktif saat ini.
            </p>
            <button
              type="button"
              onClick={onNavigateCatalog}
              className="mt-3 px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
            >
              Pinjam Buku Pertama
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {activeLoans.map((loan) => {
              const isOverdue = loan.status === 'overdue';
              const isDueSoon = loan.status === 'due_soon';
              return (
                <div
                  key={loan.id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-slate-500 tabular-nums">
                        {loan.id}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span
                        className={`font-semibold ${
                          isOverdue
                            ? 'text-red-700'
                            : isDueSoon
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                        }`}
                      >
                        {describeLoanDeadline(loan.dueAt, null)}
                      </span>
                      {loan.fineAmount > 0 && (
                        <>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="font-mono text-red-700 font-semibold tabular-nums">
                            Denda {formatRupiah(loan.fineAmount)}
                          </span>
                        </>
                      )}
                    </div>
                    <h4 className="font-display text-sm font-semibold text-slate-900">
                      {loan.bookTitle}
                    </h4>
                    <div className="text-xs text-slate-500">
                      {loan.bookAuthor} · Dipinjam {formatDateShort(loan.borrowedAt)} · Jatuh tempo{' '}
                      <span className="font-medium text-slate-700">
                        {formatDateShort(loan.dueAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      disabled={busyLoanId === loan.id || loan.extensionsCount >= 2}
                      onClick={() => handleAction(loan.id, onExtendLoan)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-45 whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Perpanjang +3 Hari ({2 - loan.extensionsCount}×)
                    </button>
                    <button
                      type="button"
                      disabled={busyLoanId === loan.id}
                      onClick={() => handleAction(loan.id, onReturnBook)}
                      className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {busyLoanId === loan.id ? 'Memproses...' : 'Kembalikan Buku'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Personal Email Reminders & Transaction Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Kotak Masuk Pengingat Email ({currentUser.email})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Notifikasi pengingat jatuh tempo & konfirmasi transaksi real-time
              </p>
            </div>
            <Mail className="w-4 h-4 text-slate-400" />
          </div>

          {myEmails.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Belum ada notifikasi email dikirim untuk akun ini.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {myEmails.map((eml) => (
                <div
                  key={eml.id}
                  className="py-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {eml.subject}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {eml.textSummary}
                    </p>
                    <div className="text-[11px] font-mono text-slate-400 mt-1 tabular-nums">
                      {formatDateTime(eml.sentAt)} ·{' '}
                      {eml.deliveryMode === 'smtp' ? 'SMTP Live' : 'Outbox Server'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewEmail(eml)}
                    className="px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md whitespace-nowrap shrink-0"
                  >
                    Buka Email
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Riwayat Aktivitas Pribadi
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Jejak transaksi peminjaman & pengembalian Anda
            </p>
          </div>

          {myEvents.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Belum ada aktivitas transaksi tercatat.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {myEvents.map((evt) => (
                <div key={evt.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-900">
                      {evt.title}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums shrink-0">
                      {formatDateTime(evt.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{evt.detail}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Email HTML Preview Modal */}
      {previewEmail && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="min-w-0 pr-4">
                <div className="text-xs text-slate-500">
                  Kepada: {previewEmail.recipientEmail}
                </div>
                <h4 className="font-display text-sm font-semibold text-slate-900 truncate">
                  {previewEmail.subject}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewEmail(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Tutup
              </button>
            </div>
            <div
              className="p-6 max-h-[70vh] overflow-y-auto bg-slate-50"
              dangerouslySetInnerHTML={{ __html: previewEmail.htmlBody }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
