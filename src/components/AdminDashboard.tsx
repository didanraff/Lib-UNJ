import { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookCopy,
  Clock,
  Mail,
  Send,
} from 'lucide-react';
import type {
  DashboardStats,
  Loan,
  TransactionEvent,
} from '../types/library';
import { describeLoanDeadline, formatRelativeTime, formatRupiah } from '../utils/format';
import { CategoryDistribution, CirculationTrendChart } from './Charts';

interface AdminDashboardProps {
  stats: DashboardStats;
  loans: Loan[];
  events: TransactionEvent[];
  sseConnected: boolean;
  onSendReminder: (loanId: string) => Promise<void>;
  onScanReminders: () => Promise<void>;
  onNavigate: (tab: 'catalog' | 'transactions' | 'notifications' | 'reports') => void;
}

export function AdminDashboard({
  stats,
  loans,
  events,
  sseConnected,
  onSendReminder,
  onScanReminders,
  onNavigate,
}: AdminDashboardProps) {
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const attentionLoans = loans
    .filter((l) => !l.returnedAt && (l.status === 'overdue' || l.status === 'due_soon'))
    .slice(0, 6);

  const handleSendOne = async (loanId: string) => {
    setSendingId(loanId);
    try {
      await onSendReminder(loanId);
    } finally {
      setSendingId(null);
    }
  };

  const handleScanAll = async () => {
    setScanning(true);
    try {
      await onScanReminders();
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Koleksi & Stok</span>
            <BookCopy className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2.5 font-display text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.totalTitles} Judul
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            {stats.availableCopies} tersedia dari {stats.totalCopies} eksemplar
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Peminjaman Aktif</span>
            <Clock className="w-4 h-4 text-blue-700" />
          </div>
          <div className="mt-2.5 font-display text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.activeLoans} Transaksi
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            {stats.returnedLoans} selesai dikembalikan
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Jatuh Tempo & Terlambat</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2.5 font-display text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.overdueLoans + stats.dueSoonLoans} Pinjaman
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            {stats.overdueLoans} terlambat · denda {formatRupiah(stats.totalFinesIdr)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Email Pengingat Terkirim</span>
            <Mail className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5 font-display text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.totalEmailsSent} Email
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Pemantauan otomatis real-time aktif
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
          <CirculationTrendChart series={stats.dailySeries} />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <CategoryDistribution categories={stats.categoryStats} />
        </div>
      </div>

      {/* Live Transaction Stream & Urgent Email Queue */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Urgent Due-Date & Overdue Queue */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Antrean Pengingat Jatuh Tempo
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Peminjaman mendekati tenggat atau melewati jatuh tempo
              </p>
            </div>
            <button
              type="button"
              onClick={handleScanAll}
              disabled={scanning}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              {scanning ? 'Mengirim...' : 'Kirim Pengingat Massal'}
            </button>
          </div>

          {attentionLoans.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Seluruh peminjaman aktif berada dalam batas waktu aman.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 flex-1">
              {attentionLoans.map((loan) => {
                const isOverdue = loan.status === 'overdue';
                return (
                  <div
                    key={loan.id}
                    className="py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {loan.bookTitle}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {loan.memberName} · {loan.memberEmail}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs font-mono tabular-nums">
                        <span
                          className={
                            isOverdue
                              ? 'text-red-700 font-semibold'
                              : 'text-amber-700 font-semibold'
                          }
                        >
                          {describeLoanDeadline(loan.dueAt, loan.returnedAt)}
                        </span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-500">
                          {loan.reminderCount}× pengingat dikirim
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={sendingId === loan.id}
                      onClick={() => handleSendOne(loan.id)}
                      className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      {sendingId === loan.id ? 'Mengirim...' : 'Kirim Email'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-3 mt-2 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => onNavigate('transactions')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              Kelola Semua Transaksi
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Real-Time Activity Stream */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Aktivitas Transaksi Real-Time
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Aliran peminjaman, pengembalian, dan notifikasi email langsung
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 shrink-0">
              <span
                className={`w-2 h-2 rounded-full ${
                  sseConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              {sseConnected ? 'Stream Terhubung' : 'Menghubungkan'}
            </div>
          </div>

          <div className="divide-y divide-slate-100 flex-1 max-h-80 overflow-y-auto pr-1">
            {events.slice(0, 12).map((evt) => (
              <div key={evt.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">
                    {evt.title}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {evt.detail}
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums whitespace-nowrap shrink-0 mt-0.5">
                  {formatRelativeTime(evt.createdAt)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              Buka Log Email Lengkap
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
