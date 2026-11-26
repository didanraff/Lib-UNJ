import { useState, type FormEvent } from 'react';
import { ShieldCheck, User, UserPlus, X } from 'lucide-react';
import type { UserProfile } from '../types/library';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  onRegisterMember: (data: {
    name: string;
    email: string;
    department: string;
  }) => Promise<void>;
}

export function AccountModal({
  isOpen,
  onClose,
  users,
  currentUser,
  onSelectUser,
  onRegisterMember,
}: AccountModalProps) {
  const [tab, setTab] = useState<'switch' | 'register'>('switch');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onRegisterMember({ name, email, department });
      setName('');
      setEmail('');
      setDepartment('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mendaftarkan anggota.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2
              id="account-modal-title"
              className="font-display text-base font-semibold text-slate-900"
            >
              Akses Peran & Akun Anggota
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Beralih antara Dasbor Admin Pustakawan dan Dasbor Member secara instan
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Tutup dialog akun"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setTab('switch')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tab === 'switch'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pilih Akun Terdaftar
            </button>
            <button
              type="button"
              onClick={() => setTab('register')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tab === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Anggota Baru
            </button>
          </div>
        </div>

        {tab === 'switch' ? (
          <div className="p-6 space-y-2.5 max-h-96 overflow-y-auto">
            {users.map((user) => {
              const isSelected = user.id === currentUser.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    onSelectUser(user);
                    onClose();
                  }}
                  className={`w-full text-left p-3.5 rounded-lg border transition-colors flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'border-blue-700 bg-blue-50/50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        user.role === 'admin'
                          ? 'bg-slate-900 text-white'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {user.role === 'admin' ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {user.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {user.email} · {user.department}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-medium text-slate-800">
                      {user.role === 'admin' ? 'Admin' : 'Member'}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                      {user.memberCode}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Anisa Kusumawati"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Alamat Email (untuk Pengingat Jatuh Tempo)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@domain.com"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Unit / Fakultas / Komunitas
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Contoh: Sistem Informasi"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {submitting ? 'Mendaftarkan...' : 'Daftar & Masuk'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
