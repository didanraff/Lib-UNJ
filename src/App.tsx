import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  FileSpreadsheet,
  LayoutDashboard,
  Mail,
  Menu,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  AutoReport,
  Book,
  BootstrapPayload,
  LibrarySettings,
  ReportType,
  UserProfile,
} from './types/library';
import { AccountModal } from './components/AccountModal';
import { AdminDashboard } from './components/AdminDashboard';
import { CatalogView } from './components/CatalogView';
import { MemberDashboard } from './components/MemberDashboard';
import { NotificationsView } from './components/NotificationsView';
import { ReportsView } from './components/ReportsView';
import { TransactionsView } from './components/TransactionsView';

type NavTab = 'dashboard' | 'catalog' | 'transactions' | 'notifications' | 'reports';

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dasbor Utama', icon: LayoutDashboard },
  { id: 'catalog', label: 'Katalog Koleksi', icon: BookOpen },
  { id: 'transactions', label: 'Transaksi Pinjam', icon: ArrowLeftRight },
  { id: 'notifications', label: 'Notifikasi Email', icon: Mail },
  { id: 'reports', label: 'Laporan Otomatis', icon: FileSpreadsheet },
];

export default function App() {
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [currentUserId, setCurrentUserId] = useState<string>('usr-admin-1');
  const [sseConnected, setSseConnected] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ title: string; tone: 'info' | 'error' } | null>(
    null
  );

  const showToast = useCallback((title: string, tone: 'info' | 'error' = 'info') => {
    setToast({ title, tone });
    window.setTimeout(() => {
      setToast((prev) => (prev?.title === title ? null : prev));
    }, 4000);
  }, []);

  const fetchBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error('Gagal memuat data perpustakaan.');
      const payload = (await res.json()) as BootstrapPayload;
      setData(payload);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBootstrap();

    const eventSource = new EventSource('/api/events');
    eventSource.addEventListener('connected', () => {
      setSseConnected(true);
    });
    eventSource.addEventListener('bootstrap_sync', (event) => {
      try {
        const nextPayload = JSON.parse((event as MessageEvent).data) as BootstrapPayload;
        setData(nextPayload);
      } catch {
        // Ignore malformed SSE payload
      }
    });
    eventSource.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [fetchBootstrap]);

  const currentUser: UserProfile | null =
    data?.users.find((u) => u.id === currentUserId) || data?.users[0] || null;

  const handleBorrowBook = async (input: {
    bookId: string;
    memberId: string;
    durationDays: number;
  }) => {
    const res = await fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal meminjam buku.');
    setData(json.payload);
    showToast('Peminjaman buku online berhasil dicatat & email konfirmasi dikirim.');
  };

  const handleReturnBook = async (loanId: string) => {
    const res = await fetch(`/api/loans/${loanId}/return`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal mengembalikan buku.');
    setData(json.payload);
    showToast('Pengembalian buku selesai dan bukti email telah dikirim.');
  };

  const handleExtendLoan = async (loanId: string) => {
    const res = await fetch(`/api/loans/${loanId}/extend`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || 'Gagal memperpanjang masa pinjam.', 'error');
      throw new Error(json.error || 'Gagal memperpanjang masa pinjam.');
    }
    setData(json.payload);
    showToast('Masa peminjaman berhasil diperpanjang +3 hari.');
  };

  const handleSaveBook = async (bookData: Partial<Book>, existingId?: string) => {
    const url = existingId ? `/api/books/${existingId}` : '/api/books';
    const method = existingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal menyimpan data buku.');
    setData(json.payload);
    showToast(
      existingId ? 'Data koleksi berhasil diperbarui.' : 'Koleksi buku baru ditambahkan.'
    );
  };

  const handleDeleteBook = async (bookId: string) => {
    const res = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || 'Gagal menghapus buku.', 'error');
      return;
    }
    setData(json.payload);
    showToast('Koleksi buku telah dihapus dari katalog.');
  };

  const handleSendReminder = async (loanId: string) => {
    const res = await fetch(`/api/reminders/send/${loanId}`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || 'Gagal mengirim pengingat email.', 'error');
      return;
    }
    setData(json.payload);
    showToast(`Email pengingat dikirim ke ${json.notification.recipientEmail}.`);
  };

  const handleScanReminders = async (force = true) => {
    const res = await fetch('/api/reminders/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast('Gagal memindai jatuh tempo.', 'error');
      return;
    }
    setData(json.payload);
    showToast(
      json.sentCount > 0
        ? `${json.sentCount} email pengingat jatuh tempo berhasil dikirim.`
        : 'Tidak ada pinjaman baru yang memerlukan pengingat saat ini.'
    );
  };

  const handleGenerateReport = async (type: ReportType): Promise<AutoReport> => {
    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal membuat laporan.');
    setData(json.payload);
    showToast(`Laporan ${type} berhasil diterbitkan.`);
    return json.report;
  };

  const handleUpdateSettings = async (partial: Partial<LibrarySettings>) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal memperbarui pengaturan.');
    setData(json.payload);
    showToast('Kebijakan sistem perpustakaan diperbarui.');
  };

  const handleRegisterMember = async (input: {
    name: string;
    email: string;
    department: string;
  }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal mendaftar anggota.');
    setData(json.payload);
    setCurrentUserId(json.user.id);
    showToast(`Selamat datang, ${json.user.name}. Akun anggota siap digunakan.`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-sm w-full space-y-3">
          <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
          <div className="h-24 w-full bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md w-full text-center space-y-3">
          <h1 className="font-display text-lg font-semibold text-slate-900">
            Koneksi Server Perpustakaan Terputus
          </h1>
          <p className="text-sm text-slate-600">{error || 'Data belum tersedia.'}</p>
          <button
            type="button"
            onClick={fetchBootstrap}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  const currentNavLabel =
    NAV_ITEMS.find((item) => item.id === activeTab)?.label || 'Dasbor Utama';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-white border-r border-slate-200 shrink-0 no-print">
        <div className="h-16 px-6 border-b border-slate-200 flex items-center">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            PustakaNusa
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.filter(
            (item) => currentUser.role === 'admin' || item.id !== 'reports'
          ).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="text-xs text-slate-500">
            <div className="font-medium text-slate-900 truncate">
              {currentUser.name}
            </div>
            <div className="truncate">{currentUser.email}</div>
            <div className="font-mono text-[11px] text-slate-400 mt-0.5">
              {currentUser.role === 'admin' ? 'Admin Pustakawan' : 'Anggota'} ·{' '}
              {currentUser.memberCode}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAccountModalOpen(true)}
            className="w-full px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            Ganti Peran / Akun
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 bg-white h-full border-r border-slate-200 flex flex-col z-10">
            <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
              <span className="font-display text-lg font-bold text-slate-900">
                PustakaNusa
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {NAV_ITEMS.filter(
                (item) => currentUser.role === 'admin' || item.id !== 'reports'
              ).map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg ${
                      isActive
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Strict 3-Zone Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display text-base font-semibold text-slate-900 truncate">
              {currentNavLabel} ·{' '}
              <span className="font-normal text-slate-500">
                {currentUser.role === 'admin' ? 'Mode Admin' : 'Mode Member'}
              </span>
            </h1>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'dashboard' ? 'text-blue-700' : ''
              }`}
            >
              Statistik
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'catalog' ? 'text-blue-700' : ''
              }`}
            >
              Katalog
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'transactions' ? 'text-blue-700' : ''
              }`}
            >
              Sirkulasi
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'notifications' ? 'text-blue-700' : ''
              }`}
            >
              Pengingat
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setAccountModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <UserCheck className="w-3.5 h-3.5" />
              {currentUser.role === 'admin' ? 'Admin' : 'Member'}:{' '}
              {currentUser.name.split(' ')[0]}
            </button>
          </div>
        </header>

        {/* Viewport */}
        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto">
          {activeTab === 'dashboard' &&
            (currentUser.role === 'admin' ? (
              <AdminDashboard
                stats={data.stats}
                loans={data.loans}
                events={data.events}
                sseConnected={sseConnected}
                onSendReminder={handleSendReminder}
                onScanReminders={() => handleScanReminders(true)}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            ) : (
              <MemberDashboard
                currentUser={currentUser}
                loans={data.loans}
                events={data.events}
                emailLogs={data.emailLogs}
                settings={data.settings}
                onReturnBook={handleReturnBook}
                onExtendLoan={handleExtendLoan}
                onNavigateCatalog={() => setActiveTab('catalog')}
              />
            ))}

          {activeTab === 'catalog' && (
            <CatalogView
              books={data.books}
              users={data.users}
              currentUser={currentUser}
              onBorrowBook={handleBorrowBook}
              onSaveBook={handleSaveBook}
              onDeleteBook={handleDeleteBook}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              loans={data.loans}
              currentUser={currentUser}
              onReturnBook={handleReturnBook}
              onExtendLoan={handleExtendLoan}
              onSendReminder={handleSendReminder}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsView
              emailLogs={data.emailLogs}
              settings={data.settings}
              smtpConfigured={data.smtpConfigured}
              currentUser={currentUser}
              onScanReminders={handleScanReminders}
              onUpdateSettings={handleUpdateSettings}
            />
          )}

          {activeTab === 'reports' && currentUser.role === 'admin' && (
            <ReportsView
              reports={data.reports}
              settings={data.settings}
              onGenerateReport={handleGenerateReport}
              onUpdateSettings={handleUpdateSettings}
            />
          )}

          {activeTab === 'reports' && currentUser.role !== 'admin' && (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
              <BarChart3 className="w-8 h-8 text-slate-400 mx-auto" />
              <h2 className="font-display text-base font-semibold text-slate-900">
                Khusus Administrator Pustakawan
              </h2>
              <p className="text-sm text-slate-600">
                Laporan operasional otomatis hanya dapat diakses menggunakan akun Admin.
              </p>
              <button
                type="button"
                onClick={() => setAccountModalOpen(true)}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                Beralih ke Akun Admin
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Account Switcher & Member Registration Modal */}
      <AccountModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        users={data.users}
        currentUser={currentUser}
        onSelectUser={(user) => {
          setCurrentUserId(user.id);
          if (user.role === 'member' && activeTab === 'reports') {
            setActiveTab('dashboard');
          }
          showToast(`Masuk sebagai ${user.name} (${user.role === 'admin' ? 'Admin' : 'Member'}).`);
        }}
        onRegisterMember={handleRegisterMember}
      />

      {/* Real-time Action Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-xl border shadow-lg text-xs font-medium flex items-center justify-between gap-3 ${
            toast.tone === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-slate-900 border-slate-800 text-white'
          }`}
        >
          <span>{toast.title}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="opacity-70 hover:opacity-100"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
