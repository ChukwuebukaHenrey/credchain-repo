// Dependency-free SVG bar chart with an interactive hover tooltip, themed to
// the project's [data-theme] tokens. Hand-built as a lightweight stand-in for
// @bklit/bar-chart (which would pull in shadcn + recharts) — same shape of API:
// pass `data` + one or more `bars` (dataKey/label/color), get grouped columns,
// gridlines, an x-axis, and a cursor-tracked tooltip.
import { useState } from "react";

export interface BarSeries {
  /** Key into each data row. */
  dataKey: string;
  /** Legend/tooltip label (defaults to dataKey). */
  label?: string;
  /** CSS color — pass a token var, e.g. "var(--brand-purple)". */
  color?: string;
}

interface BarChartProps {
  data: Array<Record<string, string | number>>;
  /** The row field used for x-axis labels. */
  xKey: string;
  bars: BarSeries[];
  height?: number;
  /** Number of horizontal gridlines (default 4). */
  gridLines?: number;
  /** Format a value for the tooltip (e.g. currency). */
  formatValue?: (value: number) => string;
  className?: string;
}

const DEFAULT_COLORS = ["var(--brand-purple)", "var(--role-candidate)", "var(--role-issuer)"];

export default function BarChart({
  data,
  xKey,
  bars,
  height = 200,
  gridLines = 4,
  formatValue = (v) => String(v),
  className,
}: BarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const series = bars.map((b, i) => ({ ...b, color: b.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] }));

  // Max across every series value, rounded up so the tallest bar leaves headroom.
  const rawMax = Math.max(
    1,
    ...data.flatMap((row) => series.map((s) => Number(row[s.dataKey]) || 0))
  );
  const niceMax = niceCeil(rawMax);

  return (
    <div className={className}>
      {/* Legend (only when more than one series) */}
      {series.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-4">
          {series.map((s) => (
            <span key={s.dataKey} className="inline-flex items-center gap-1.5 text-[11px] font-mono text-txt-muted">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label || s.dataKey}
            </span>
          ))}
        </div>
      )}

      <div className="relative" style={{ height }}>
        {/* Gridlines + y-axis ticks */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {Array.from({ length: gridLines + 1 }).map((_, i) => {
            const value = niceMax - (niceMax / gridLines) * i;
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-right font-mono text-[9px] text-txt-muted tabular-nums">
                  {compact(value)}
                </span>
                <span className="h-px flex-1 bg-border-subtle" />
              </div>
            );
          })}
        </div>

        {/* Columns */}
        <div className="absolute inset-0 flex items-end gap-2 pl-10">
          {data.map((row, i) => {
            const isHovered = hovered === i;
            return (
              <div
                key={i}
                className="group relative flex flex-1 items-end justify-center gap-1"
                style={{ height: "100%" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {series.map((s) => {
                  const value = Number(row[s.dataKey]) || 0;
                  const pct = (value / niceMax) * 100;
                  return (
                    <div
                      key={s.dataKey}
                      className="relative flex-1 rounded-t-md transition-all duration-300"
                      style={{
                        height: `${pct}%`,
                        background: s.color,
                        opacity: hovered === null || isHovered ? 1 : 0.35,
                        minWidth: 6,
                      }}
                      title={`${s.label || s.dataKey}: ${formatValue(value)}`}
                    />
                  );
                })}

                {/* Tooltip */}
                {isHovered && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border-strong bg-bg-elevated px-2.5 py-1.5 shadow-lg shadow-black/30">
                    <div className="mb-0.5 font-mono text-[10px] uppercase tracking-wider text-txt-muted">
                      {String(row[xKey])}
                    </div>
                    {series.map((s) => (
                      <div key={s.dataKey} className="flex items-center gap-1.5 text-[11px] text-txt-primary">
                        <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                        <span className="font-semibold tabular-nums">{formatValue(Number(row[s.dataKey]) || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="mt-2 flex gap-2 pl-10">
        {data.map((row, i) => (
          <div key={i} className="flex-1 text-center font-mono text-[10px] text-txt-muted">
            {String(row[xKey])}
          </div>
        ))}
      </div>
    </div>
  );
}

// Round a max value up to a "nice" number so gridline labels read cleanly.
function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= n) ?? 10;
  return step * pow;
}

// Compact large numbers for axis ticks (1200 → 1.2k).
function compact(n: number): string {
  if (n >= 1000) return `${Number.parseFloat((n / 1000).toFixed(1))}k`;
  return String(Math.round(n));
}
