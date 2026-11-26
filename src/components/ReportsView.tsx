import { useState } from 'react';
import {
  CalendarClock,
  Download,
  FileSpreadsheet,
  Printer,
  Sparkles,
} from 'lucide-react';
import type { AutoReport, LibrarySettings, ReportType } from '../types/library';
import { formatDateTime, formatRupiah } from '../utils/format';

interface ReportsViewProps {
  reports: AutoReport[];
  settings: LibrarySettings;
  onGenerateReport: (type: ReportType) => Promise<AutoReport>;
  onUpdateSettings: (partial: Partial<LibrarySettings>) => Promise<void>;
}

export function ReportsView({
  reports,
  settings,
  onGenerateReport,
  onUpdateSettings,
}: ReportsViewProps) {
  const [selectedId, setSelectedId] = useState<string>(reports[0]?.id || '');
  const [generating, setGenerating] = useState<ReportType | null>(null);

  const activeReport =
    reports.find((r) => r.id === selectedId) || reports[0] || null;

  const handleCreate = async (type: ReportType) => {
    setGenerating(type);
    try {
      const created = await onGenerateReport(type);
      setSelectedId(created.id);
    } finally {
      setGenerating(null);
    }
  };

  const columns =
    activeReport && activeReport.rows.length > 0
      ? Object.keys(activeReport.rows[0])
      : [];

  return (
    <div className="space-y-6">
      {/* Automated Schedule & Quick Generator */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5 no-print">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <CalendarClock className="w-4 h-4 text-blue-700" />
            <span>Penjadwal Pelaporan Otomatis</span>
          </div>
          <h3 className="font-display text-base font-semibold text-slate-900">
            Terbitkan Laporan Sirkulasi, Keterlambatan, & Utilisasi Koleksi
          </h3>
          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-600">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoReportEnabled}
                onChange={(e) =>
                  onUpdateSettings({ autoReportEnabled: e.target.checked })
                }
                className="w-4 h-4 accent-blue-700 rounded"
              />
              Aktifkan Laporan Terjadwal
            </label>
            <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
              {(['harian', 'mingguan'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => onUpdateSettings({ autoReportFrequency: freq })}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors capitalize ${
                    settings.autoReportFrequency === freq
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
            <span className="font-mono text-slate-400 tabular-nums">
              Terakhir: {formatDateTime(settings.lastAutoReportAt)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={generating !== null}
            onClick={() => handleCreate('sirkulasi')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {generating === 'sirkulasi' ? 'Membuat...' : 'Buat Laporan Sirkulasi'}
          </button>
          <button
            type="button"
            disabled={generating !== null}
            onClick={() => handleCreate('keterlambatan')}
            className="px-3.5 py-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {generating === 'keterlambatan' ? 'Membuat...' : 'Laporan Keterlambatan'}
          </button>
          <button
            type="button"
            disabled={generating !== null}
            onClick={() => handleCreate('koleksi')}
            className="px-3.5 py-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {generating === 'koleksi' ? 'Membuat...' : 'Laporan Koleksi'}
          </button>
        </div>
      </div>

      {/* Report Archive + Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Archive List */}
        <aside className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 no-print max-h-[680px] overflow-y-auto">
          <div className="px-2 py-1 text-xs font-semibold text-slate-500">
            Arsip Laporan ({reports.length})
          </div>
          {reports.map((rpt) => {
            const isSelected = activeReport?.id === rpt.id;
            return (
              <button
                key={rpt.id}
                type="button"
                onClick={() => setSelectedId(rpt.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-blue-700 bg-blue-50/50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                  <span className="uppercase">{rpt.type}</span>
                  <span>{rpt.trigger === 'otomatis' ? 'Otomatis' : 'Manual'}</span>
                </div>
                <div className="text-xs font-semibold text-slate-900 mt-1 line-clamp-2">
                  {rpt.title}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                  {formatDateTime(rpt.generatedAt)}
                </div>
              </button>
            );
          })}
        </aside>

        {/* Active Report Detail */}
        <div className="xl:col-span-3 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          {!activeReport ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Belum ada laporan yang diterbitkan. Klik tombol di atas untuk membuat laporan.
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{activeReport.periodLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">Pemicu: {activeReport.trigger}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {formatDateTime(activeReport.generatedAt)}
                    </span>
                  </div>
                  <h2 className="font-display text-lg font-bold text-slate-900 mt-1">
                    {activeReport.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2 no-print shrink-0">
                  <a
                    href={`/api/reports/${activeReport.id}/csv`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh CSV
                  </a>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak Laporan
                  </button>
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-500">Total Sirkulasi</div>
                  <div className="font-display text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                    {activeReport.summary.totalLoansInPeriod}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-500">Sedang Dipinjam</div>
                  <div className="font-display text-xl font-bold text-blue-700 font-mono tabular-nums mt-1">
                    {activeReport.summary.activeLoansCount}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-500">Terlambat</div>
                  <div className="font-display text-xl font-bold text-red-700 font-mono tabular-nums mt-1">
                    {activeReport.summary.overdueLoansCount}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-500">Akumulasi Denda</div>
                  <div className="font-display text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                    {formatRupiah(activeReport.summary.totalFinesIdr)}
                  </div>
                </div>
              </div>

              {/* Top Books */}
              <div>
                <h4 className="text-xs font-semibold text-slate-600 mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                  5 Koleksi Paling Sering Dipinjam (Kategori Unggulan: {activeReport.summary.topCategory})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {activeReport.summary.topBooks.map((tb, i) => (
                    <div
                      key={tb.title}
                      className="p-3 border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">
                          {i + 1}. {tb.title}
                        </div>
                        <div className="text-slate-500 truncate">{tb.author}</div>
                      </div>
                      <span className="font-mono font-semibold text-slate-700 tabular-nums shrink-0">
                        {tb.count}×
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabular Report Rows */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                {activeReport.rows.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Tidak ada baris data pada jenis laporan ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                          {columns.map((col) => (
                            <th key={col} className="py-2.5 px-3 whitespace-nowrap">
                              {col.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {activeReport.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {columns.map((col) => (
                              <td
                                key={col}
                                className="py-2.5 px-3 text-slate-700 font-mono tabular-nums whitespace-nowrap"
                              >
                                {typeof row[col] === 'number' && col.includes('IDR')
                                  ? formatRupiah(Number(row[col]))
                                  : String(row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
