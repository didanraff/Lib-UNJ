import { useMemo, useState, type FormEvent } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Edit3,
  Eye,
  LayoutGrid,
  List,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { Book, UserProfile } from '../types/library';
import { BookCover } from './BookCover';

interface CatalogViewProps {
  books: Book[];
  users: UserProfile[];
  currentUser: UserProfile;
  onBorrowBook: (data: {
    bookId: string;
    memberId: string;
    durationDays: number;
  }) => Promise<void>;
  onSaveBook: (data: Partial<Book>, existingId?: string) => Promise<void>;
  onDeleteBook: (bookId: string) => Promise<void>;
}

const CATEGORIES = [
  'Semua',
  'Teknologi',
  'Arsitektur',
  'Ekonomi',
  'Sastra',
  'Sejarah',
  'Desain',
  'Sains & Riset',
];

export function CatalogView({
  books,
  users,
  currentUser,
  onBorrowBook,
  onSaveBook,
  onDeleteBook,
}: CatalogViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [borrowTarget, setBorrowTarget] = useState<Book | null>(null);
  const [borrowDuration, setBorrowDuration] = useState<number>(7);
  const [borrowMemberId, setBorrowMemberId] = useState<string>(
    currentUser.role === 'member'
      ? currentUser.id
      : users.find((u) => u.role === 'member')?.id || currentUser.id
  );
  const [borrowing, setBorrowing] = useState(false);

  const [previewBook, setPreviewBook] = useState<Book | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formState, setFormState] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'Teknologi',
    publisher: '',
    year: new Date().getFullYear(),
    pages: 280,
    shelfCode: 'TEK-101',
    totalCopies: 5,
    coverTone: 'cobalt' as Book['coverTone'],
    description: '',
    digitalExcerpt: '',
  });
  const [savingBook, setSavingBook] = useState(false);
  const [actionError, setActionError] = useState('');

  const memberOptions = useMemo(
    () => users.filter((u) => u.role === 'member'),
    [users]
  );

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((b) => {
      if (selectedCategory !== 'Semua' && b.category !== selectedCategory) {
        return false;
      }
      if (availabilityFilter === 'available' && b.availableCopies <= 0) {
        return false;
      }
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q) ||
        b.shelfCode.toLowerCase().includes(q)
      );
    });
  }, [books, search, selectedCategory, availabilityFilter]);

  const openCreateModal = () => {
    setEditingBook(null);
    setActionError('');
    setFormState({
      title: '',
      author: '',
      isbn: '',
      category: 'Teknologi',
      publisher: 'PustakaNusa Press',
      year: new Date().getFullYear(),
      pages: 280,
      shelfCode: 'TEK-301',
      totalCopies: 5,
      coverTone: 'cobalt',
      description: '',
      digitalExcerpt: '',
    });
    setEditorOpen(true);
  };

  const openEditModal = (book: Book) => {
    setEditingBook(book);
    setActionError('');
    setFormState({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      publisher: book.publisher,
      year: book.year,
      pages: book.pages,
      shelfCode: book.shelfCode,
      totalCopies: book.totalCopies,
      coverTone: book.coverTone,
      description: book.description,
      digitalExcerpt: book.digitalExcerpt,
    });
    setEditorOpen(true);
  };

  const handleBorrowSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!borrowTarget) return;
    setActionError('');
    setBorrowing(true);
    try {
      const targetMemberId =
        currentUser.role === 'member' ? currentUser.id : borrowMemberId;
      await onBorrowBook({
        bookId: borrowTarget.id,
        memberId: targetMemberId,
        durationDays: borrowDuration,
      });
      setBorrowTarget(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal memproses peminjaman.');
    } finally {
      setBorrowing(false);
    }
  };

  const handleSaveSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setActionError('');
    setSavingBook(true);
    try {
      await onSaveBook(formState, editingBook?.id);
      setEditorOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal menyimpan koleksi.');
    } finally {
      setSavingBook(false);
    }
  };

  const expectedDueDateLabel = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + borrowDuration);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [borrowDuration]);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul buku, penulis, ISBN, atau kode rak..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setAvailabilityFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  availabilityFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({books.length})
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter('available')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  availabilityFilter === 'available'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tersedia ({books.filter((b) => b.availableCopies > 0).length})
              </button>
            </div>

            {currentUser.role === 'admin' && (
              <>
                <div className="inline-flex p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    aria-label="Tampilan grid"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === 'table'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    aria-label="Tampilan tabel"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Koleksi
                </button>
              </>
            )}
          </div>
        </div>

        {/* Category Filter Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="font-display text-base font-semibold text-slate-900">
            Koleksi tidak ditemukan
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Tidak ada buku yang cocok dengan kata kunci atau filter kategori saat ini.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedCategory('Semua');
              setAvailabilityFilter('all');
            }}
            className="mt-4 px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            Atur Ulang Filter
          </button>
        </div>
      ) : viewMode === 'table' && currentUser.role === 'admin' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Kode Rak</th>
                  <th className="py-3 px-4">Judul & Penulis</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">ISBN</th>
                  <th className="py-3 px-4 text-right">Stok Tersedia</th>
                  <th className="py-3 px-4 text-right">Total Pinjam</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {book.shelfCode}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{book.title}</div>
                      <div className="text-xs text-slate-500">
                        {book.author} · {book.year}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                      {book.category}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {book.isbn}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                      <span
                        className={
                          book.availableCopies > 0
                            ? 'text-emerald-700 font-semibold'
                            : 'text-red-600 font-semibold'
                        }
                      >
                        {book.availableCopies}
                      </span>
                      <span className="text-slate-400"> / {book.totalCopies}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {book.totalBorrowed}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActionError('');
                            setBorrowTarget(book);
                          }}
                          disabled={book.availableCopies <= 0}
                          className="px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md disabled:opacity-40 transition-colors"
                        >
                          Pinjamkan
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(book)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          aria-label={`Edit ${book.title}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteBook(book.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          aria-label={`Hapus ${book.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {filteredBooks.map((book) => {
            const isAvailable = book.availableCopies > 0;
            return (
              <article
                key={book.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="aspect-[3/4] w-full mb-4 rounded-lg overflow-hidden">
                    <BookCover book={book} className="w-full h-full rounded-lg" />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                    <span>{book.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{book.year}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{book.shelfCode}</span>
                  </div>

                  <h3 className="font-display text-base font-semibold text-slate-900 leading-snug line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">{book.author}</p>
                  <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
                    {book.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`inline-flex items-center gap-1.5 font-medium ${
                        isAvailable ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      {isAvailable
                        ? `Tersedia ${book.availableCopies}/${book.totalCopies}`
                        : 'Stok Dipinjam Semua'}
                    </span>
                    <span className="text-slate-400 font-mono tabular-nums">
                      {book.totalBorrowed}× dipinjam
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        setActionError('');
                        setBorrowMemberId(
                          currentUser.role === 'member'
                            ? currentUser.id
                            : memberOptions[0]?.id || currentUser.id
                        );
                        setBorrowTarget(book);
                      }}
                      className="flex-1 px-3 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:bg-slate-200 disabled:text-slate-500 whitespace-nowrap"
                    >
                      {isAvailable ? 'Pinjam Online' : 'Habis Dipinjam'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewBook(book)}
                      className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Baca pratinjau digital"
                      aria-label={`Baca pratinjau ${book.title}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {currentUser.role === 'admin' && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(book)}
                          className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          title="Edit koleksi"
                          aria-label={`Edit ${book.title}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteBook(book.id)}
                          className="p-2 text-slate-600 hover:text-red-700 bg-slate-100 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus koleksi"
                          aria-label={`Hapus ${book.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Borrow Online Modal */}
      {borrowTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Konfirmasi Peminjaman Buku Online
              </h3>
              <button
                type="button"
                onClick={() => setBorrowTarget(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBorrowSubmit} className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {actionError}
                </div>
              )}

              <div className="pb-4 border-b border-slate-100">
                <div className="text-xs text-slate-500">
                  {borrowTarget.category} · {borrowTarget.isbn}
                </div>
                <div className="font-display text-sm font-semibold text-slate-900 mt-0.5">
                  {borrowTarget.title}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {borrowTarget.author} · Tersedia {borrowTarget.availableCopies} eksemplar
                </div>
              </div>

              {currentUser.role === 'admin' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Pilih Anggota Peminjam
                  </label>
                  <select
                    value={borrowMemberId}
                    onChange={(e) => setBorrowMemberId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
                  >
                    {memberOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.memberCode}) — {m.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Durasi Peminjaman
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 7, 14].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setBorrowDuration(d)}
                      className={`py-2.5 px-3 text-xs font-medium rounded-lg border transition-colors ${
                        borrowDuration === d
                          ? 'border-blue-700 bg-blue-50 text-blue-800'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {d} Hari
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Jatuh tempo pengembalian:</span>
                  <span className="font-semibold text-slate-900">
                    {expectedDueDateLabel}
                  </span>
                </div>
                <p className="text-slate-500">
                  Notifikasi konfirmasi & pengingat jatuh tempo otomatis dikirim ke email anggota.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setBorrowTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={borrowing}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-60"
                >
                  {borrowing ? 'Memproses...' : 'Konfirmasi Pinjam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Digital Excerpt Preview Modal */}
      {previewBook && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <div className="text-xs text-slate-500">
                  Pratinjau Salinan Digital · {previewBook.pages} halaman
                </div>
                <h3 className="font-display text-base font-semibold text-slate-900">
                  {previewBook.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewBook(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4">
              <div className="text-xs text-slate-500 pb-3 border-b border-slate-100">
                {previewBook.author} · {previewBook.publisher} ({previewBook.year}) · ISBN{' '}
                <span className="font-mono">{previewBook.isbn}</span>
              </div>
              <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {previewBook.digitalExcerpt}
              </div>
            </div>
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Kode Rak: <span className="font-mono">{previewBook.shelfCode}</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewBook(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg"
              >
                Tutup Pembaca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Add / Edit Book Modal */}
      {editorOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-display text-base font-semibold text-slate-900">
                {editingBook ? 'Edit Koleksi Buku' : 'Tambah Koleksi Buku Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveSubmit}
              className="p-6 space-y-4 max-h-[75vh] overflow-y-auto"
            >
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {actionError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Judul Buku
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.title}
                    onChange={(e) =>
                      setFormState({ ...formState, title: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Penulis
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.author}
                    onChange={(e) =>
                      setFormState({ ...formState, author: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ISBN
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.isbn}
                    onChange={(e) =>
                      setFormState({ ...formState, isbn: e.target.value })
                    }
                    placeholder="978-602-XXXX-XX-X"
                    className="w-full px-3.5 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={formState.category}
                    onChange={(e) =>
                      setFormState({ ...formState, category: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-700"
                  >
                    {CATEGORIES.filter((c) => c !== 'Semua').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Penerbit
                  </label>
                  <input
                    type="text"
                    value={formState.publisher}
                    onChange={(e) =>
                      setFormState({ ...formState, publisher: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tahun Terbit
                  </label>
                  <input
                    type="number"
                    value={formState.year}
                    onChange={(e) =>
                      setFormState({ ...formState, year: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kode Rak & Total Eksemplar
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={formState.shelfCode}
                      onChange={(e) =>
                        setFormState({ ...formState, shelfCode: e.target.value })
                      }
                      placeholder="TEK-101"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                    />
                    <input
                      type="number"
                      min={1}
                      value={formState.totalCopies}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          totalCopies: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sinopsis Singkat
                  </label>
                  <textarea
                    rows={2}
                    value={formState.description}
                    onChange={(e) =>
                      setFormState({ ...formState, description: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Pratinjau Naskah Digital
                  </label>
                  <textarea
                    rows={3}
                    value={formState.digitalExcerpt}
                    onChange={(e) =>
                      setFormState({ ...formState, digitalExcerpt: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingBook}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-60"
                >
                  {savingBook
                    ? 'Menyimpan...'
                    : editingBook
                      ? 'Simpan Perubahan'
                      : 'Tambahkan Buku'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
