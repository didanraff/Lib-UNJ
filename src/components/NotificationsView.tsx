import { useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Mail, RefreshCw, Send, Settings2, X } from 'lucide-react';
import type {
  EmailNotification,
  LibrarySettings,
  UserProfile,
} from '../types/library';
import { formatDateTime } from '../utils/format';

interface NotificationsViewProps {
  emailLogs: EmailNotification[];
  settings: LibrarySettings;
  smtpConfigured: boolean;
  currentUser: UserProfile;
  onScanReminders: (force: boolean) => Promise<void>;
  onUpdateSettings: (partial: Partial<LibrarySettings>) => Promise<void>;
}

export function NotificationsView({
  emailLogs,
  settings,
  smtpConfigured,
  currentUser,
  onScanReminders,
  onUpdateSettings,
}: NotificationsViewProps) {
  const [scanning, setScanning] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [previewEmail, setPreviewEmail] = useState<EmailNotification | null>(null);
  const [leadDays, setLeadDays] = useState(settings.reminderLeadDays);
  const [autoReminder, setAutoReminder] = useState(settings.autoReminderEnabled);
  const [finePerDay, setFinePerDay] = useState(settings.finePerDayIdr);
  const [maxLoans, setMaxLoans] = useState(settings.maxLoansPerMember);

  const visibleEmails = useMemo(() => {
    if (currentUser.role === 'admin') return emailLogs;
    return emailLogs.filter((e) => e.memberId === currentUser.id);
  }, [emailLogs, currentUser]);

  const handleScan = async (force: boolean) => {
    setScanning(true);
    try {
      await onScanReminders(force);
    } finally {
      setScanning(false);
    }
  };

  const handleSavePolicy = async (e: FormEvent) => {
    e.preventDefault();
    setSavingPolicy(true);
    try {
      await onUpdateSettings({
        reminderLeadDays: leadDays,
        autoReminderEnabled: autoReminder,
        finePerDayIdr: finePerDay,
        maxLoansPerMember: maxLoans,
      });
    } finally {
      setSavingPolicy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Engine Status & Policy Bar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Status Pengiriman Email
              </span>
              <Mail className="w-4 h-4 text-blue-700" />
            </div>
            <h3 className="font-display text-lg font-semibold text-slate-900 mt-2">
              {smtpConfigured ? 'SMTP Live Aktif' : 'Outbox Server Real-Time'}
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              {smtpConfigured
                ? 'Kredensial SMTP terdeteksi di server. Seluruh pengingat jatuh tempo dikirim langsung ke kotak masuk email anggota.'
                : 'Sistem memantau jatuh tempo secara otomatis setiap 45 detik dan mencatat salinan email HTML lengkap di log pengiriman server. Tambahkan variabel SMTP_HOST, SMTP_USER, dan SMTP_PASS di environment untuk pengiriman eksternal.'}
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-500 font-mono tabular-nums">
            Pemindaian terakhir: {formatDateTime(settings.lastAutoScanAt)}
          </div>
        </div>

        {currentUser.role === 'admin' ? (
          <form
            onSubmit={handleSavePolicy}
            className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-500" />
                <h3 className="font-display text-base font-semibold text-slate-900">
                  Aturan Pengingat Jatuh Tempo Otomatis
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={scanning}
                  onClick={() => handleScan(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  {scanning ? 'Memindai...' : 'Pindai & Kirim Sekarang'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Pengingat H-N Hari
                </label>
                <input
                  type="number"
                  min={0}
                  max={7}
                  value={leadDays}
                  onChange={(e) => setLeadDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Denda per Hari (IDR)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={finePerDay}
                  onChange={(e) => setFinePerDay(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Maks Pinjaman / Member
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={maxLoans}
                  onChange={(e) => setMaxLoans(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
              <div className="flex flex-col justify-between">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Penjadwal Otomatis
                </label>
                <label className="inline-flex items-center gap-2 py-2 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoReminder}
                    onChange={(e) => setAutoReminder(e.target.checked)}
                    className="w-4 h-4 accent-blue-700 rounded"
                  />
                  Aktifkan Pengiriman Otomatis
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={savingPolicy}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {savingPolicy ? 'Menyimpan...' : 'Simpan Kebijakan'}
              </button>
            </div>
          </form>
        ) : (
          <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-center">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Preferensi Pengingat Akun Anda
            </h3>
            <p className="text-sm text-slate-600 mt-1.5">
              Setiap peminjaman yang mendekati tenggat{' '}
              <span className="font-semibold text-slate-900">
                H-{settings.reminderLeadDays}
              </span>{' '}
              atau melewati jatuh tempo akan secara otomatis mengirimkan pengingat ke alamat email{' '}
              <span className="font-mono text-slate-900">{currentUser.email}</span>.
            </p>
          </div>
        )}
      </div>

      {/* Email Dispatch Log */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Riwayat Notifikasi Email Real-Time ({visibleEmails.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik pratinjau untuk melihat isi pesan HTML yang dikirim ke anggota
            </p>
          </div>
        </div>

        {visibleEmails.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Belum ada notifikasi email yang tercatat.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Waktu Kirim</th>
                  <th className="py-3 px-4">Penerima</th>
                  <th className="py-3 px-4">Subjek & Ringkasan</th>
                  <th className="py-3 px-4">Jenis</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {visibleEmails.map((eml) => (
                  <tr key={eml.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {formatDateTime(eml.sentAt)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">
                        {eml.memberName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {eml.recipientEmail}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="font-medium text-slate-900 truncate">
                        {eml.subject}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {eml.textSummary}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700 whitespace-nowrap">
                      {eml.kind === 'overdue'
                        ? 'Peringatan Terlambat'
                        : eml.kind === 'due_soon'
                          ? 'Pengingat Jatuh Tempo'
                          : eml.kind === 'return_receipt'
                            ? 'Bukti Pengembalian'
                            : 'Konfirmasi Pinjam'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          eml.status === 'sent'
                            ? 'text-emerald-700'
                            : 'text-red-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {eml.status === 'sent'
                          ? eml.deliveryMode === 'smtp'
                            ? 'Terkirim (SMTP)'
                            : 'Terkirim (Outbox)'
                          : 'Gagal'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setPreviewEmail(eml)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        Pratinjau
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Email Preview Modal */}
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
                  Kepada: {previewEmail.recipientEmail} · {formatDateTime(previewEmail.sentAt)}
                </div>
                <h4 className="font-display text-sm font-semibold text-slate-900 truncate">
                  {previewEmail.subject}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewEmail(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
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
