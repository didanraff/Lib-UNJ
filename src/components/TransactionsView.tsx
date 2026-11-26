import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  RotateCcw,
  Search,
} from 'lucide-react';
import type { Loan, LoanStatus, UserProfile } from '../types/library';
import {
  describeLoanDeadline,
  formatDateShort,
  formatRupiah,
} from '../utils/format';

interface TransactionsViewProps {
  loans: Loan[];
  currentUser: UserProfile;
  onReturnBook: (loanId: string) => Promise<void>;
  onExtendLoan: (loanId: string) => Promise<void>;
  onSendReminder: (loanId: string) => Promise<void>;
}

const STATUS_TABS: Array<{ id: 'all' | LoanStatus; label: string }> = [
  { id: 'all', label: 'Semua' },
  { id: 'active', label: 'Aktif' },
  { id: 'due_soon', label: 'Segera Jatuh Tempo' },
  { id: 'overdue', label: 'Terlambat' },
  { id: 'returned', label: 'Dikembalikan' },
];

export function TransactionsView({
  loans,
  currentUser,
  onReturnBook,
  onExtendLoan,
  onSendReminder,
}: TransactionsViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | LoanStatus>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const scopedLoans = useMemo(() => {
    if (currentUser.role === 'admin') return loans;
    return loans.filter((l) => l.memberId === currentUser.id);
  }, [loans, currentUser]);

  const filteredLoans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedLoans.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        l.bookTitle.toLowerCase().includes(q) ||
        l.memberName.toLowerCase().includes(q) ||
        l.memberEmail.toLowerCase().includes(q) ||
        l.memberCode.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
      );
    });
  }, [scopedLoans, statusFilter, search]);

  const runAction = async (loanId: string, fn: (id: string) => Promise<void>) => {
    setBusyId(loanId);
    try {
      await fn(loanId);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul buku, nama anggota, atau ID transaksi..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-700"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.id === 'all'
                ? scopedLoans.length
                : scopedLoans.filter((l) => l.status === tab.id).length;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredLoans.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Tidak ada transaksi peminjaman yang sesuai dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">ID & Tanggal</th>
                  <th className="py-3 px-4">Buku</th>
                  {currentUser.role === 'admin' && (
                    <th className="py-3 px-4">Peminjam</th>
                  )}
                  <th className="py-3 px-4">Jatuh Tempo</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Denda</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredLoans.map((loan) => {
                  const isBusy = busyId === loan.id;
                  return (
                    <tr
                      key={loan.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs text-slate-700 tabular-nums">
                          {loan.id}
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums">
                          {formatDateShort(loan.borrowedAt)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-slate-900 truncate">
                          {loan.bookTitle}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {loan.bookAuthor} · {loan.bookIsbn}
                        </div>
                      </td>

                      {currentUser.role === 'admin' && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">
                            {loan.memberName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {loan.memberCode} · {loan.memberEmail}
                          </div>
                        </td>
                      )}

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs font-medium text-slate-800 tabular-nums">
                          {formatDateShort(loan.dueAt)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {describeLoanDeadline(loan.dueAt, loan.returnedAt)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {loan.status === 'returned' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Dikembalikan
                          </span>
                        ) : loan.status === 'overdue' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Terlambat
                          </span>
                        ) : loan.status === 'due_soon' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                            <Clock className="w-3.5 h-3.5" />
                            Segera Jatuh Tempo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
                            <Clock className="w-3.5 h-3.5" />
                            Aktif
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                        <span
                          className={
                            loan.fineAmount > 0
                              ? 'text-red-700 font-semibold'
                              : 'text-slate-500'
                          }
                        >
                          {formatRupiah(loan.fineAmount)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {loan.returnedAt ? (
                          <span className="text-xs text-slate-400">Selesai</span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy || loan.extensionsCount >= 2}
                              onClick={() => runAction(loan.id, onExtendLoan)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md disabled:opacity-40 transition-colors"
                              title="Perpanjang +3 hari"
                            >
                              <RotateCcw className="w-3 h-3" />
                              +3 Hari
                            </button>

                            {currentUser.role === 'admin' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => runAction(loan.id, onSendReminder)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md disabled:opacity-40 transition-colors"
                                title="Kirim pengingat email sekarang"
                              >
                                <Mail className="w-3 h-3" />
                                Ingatkan
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => runAction(loan.id, onReturnBook)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md disabled:opacity-40 transition-colors"
                            >
                              Kembalikan
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
