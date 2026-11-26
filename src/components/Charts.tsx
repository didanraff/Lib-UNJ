import { useState } from 'react';
import type { CategoryStat, DailySeriesPoint } from '../types/library';

interface CirculationTrendChartProps {
  series: DailySeriesPoint[];
}

export function CirculationTrendChart({ series }: CirculationTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxVal = Math.max(
    4,
    ...series.map((d) => Math.max(d.borrowed, d.returned))
  );

  const chartHeight = 180;
  const chartWidth = 640;
  const padLeft = 28;
  const padRight = 12;
  const padTop = 14;
  const padBottom = 26;
  const usableW = chartWidth - padLeft - padRight;
  const usableH = chartHeight - padTop - padBottom;
  const groupW = usableW / Math.max(1, series.length);
  const barW = Math.min(12, Math.max(6, groupW * 0.28));

  const ticks = [0, Math.ceil(maxVal / 2), maxVal];

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-base font-semibold text-slate-900">
            Statistik Peminjaman & Pengembalian (14 Hari)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Perbandingan volume transaksi harian secara real-time
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600 shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-blue-700 inline-block rounded-xs" />
            Dipinjam
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-600 inline-block rounded-xs" />
            Dikembalikan
          </span>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-52 overflow-visible"
          role="img"
          aria-label="Grafik peminjaman dan pengembalian buku 14 hari terakhir"
        >
          {ticks.map((t) => {
            const y = padTop + usableH - (t / maxVal) * usableH;
            return (
              <g key={t}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={chartWidth - padRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={t === 0 ? undefined : '3 3'}
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono tabular-nums"
                >
                  {t}
                </text>
              </g>
            );
          })}

          {series.map((point, idx) => {
            const cx = padLeft + idx * groupW + groupW / 2;
            const borrowH = (point.borrowed / maxVal) * usableH;
            const returnH = (point.returned / maxVal) * usableH;
            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={point.date}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                <rect
                  x={cx - groupW / 2}
                  y={padTop}
                  width={groupW}
                  height={usableH}
                  fill={isHovered ? '#f1f5f9' : 'transparent'}
                  rx={4}
                />
                <rect
                  x={cx - barW - 1.5}
                  y={padTop + usableH - borrowH}
                  width={barW}
                  height={Math.max(2, borrowH)}
                  rx={2}
                  fill={isHovered ? '#1e40af' : '#1d4ed8'}
                />
                <rect
                  x={cx + 1.5}
                  y={padTop + usableH - returnH}
                  width={barW}
                  height={Math.max(2, returnH)}
                  rx={2}
                  fill={isHovered ? '#047857' : '#10b981'}
                />
                {(idx % 2 === 0 || idx === series.length - 1) && (
                  <text
                    x={cx}
                    y={chartHeight - 6}
                    textAnchor="middle"
                    className="fill-slate-500 text-[10px] font-mono tabular-nums"
                  >
                    {point.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hoveredIdx !== null && series[hoveredIdx] && (
          <div className="mt-2 flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
            <span className="font-medium text-slate-900">
              {series[hoveredIdx].label} ({series[hoveredIdx].date})
            </span>
            <div className="flex items-center gap-4 font-mono tabular-nums">
              <span className="text-blue-700">
                Pinjam: {series[hoveredIdx].borrowed}
              </span>
              <span className="text-emerald-700">
                Kembali: {series[hoveredIdx].returned}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface CategoryDistributionProps {
  categories: CategoryStat[];
}

export function CategoryDistribution({ categories }: CategoryDistributionProps) {
  const totalBorrowed = Math.max(
    1,
    categories.reduce((sum, c) => sum + c.borrowedCount, 0)
  );

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h3 className="font-display text-base font-semibold text-slate-900">
          Distribusi Kategori Koleksi
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Minat peminjaman & ketersediaan stok per bidang
        </p>
      </div>

      <div className="space-y-3.5 flex-1">
        {categories.map((cat) => {
          const pct = Math.round((cat.borrowedCount / totalBorrowed) * 100);
          return (
            <div key={cat.category}>
              <div className="flex items-baseline justify-between text-xs mb-1">
                <span className="font-medium text-slate-800">{cat.category}</span>
                <span className="text-slate-500 font-mono tabular-nums">
                  {cat.borrowedCount} pinjam · {cat.availableCopies}/{cat.totalCopies} stok
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-700 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(4, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
