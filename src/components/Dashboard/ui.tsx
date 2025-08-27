// src/components/Dashboard/ui.tsx
import type { FC, PropsWithChildren } from "react";
import React, { useMemo, useRef, useEffect, useState } from "react";
import {
    CardContainer,
    CardTitle,
    KpiStack,
    KpiLabel,
    KpiValue,
    KpiHint,
    ChartSvg,
    AxisLine,
    LinePath,
    Dot,
    BarsGrid,
    BarCol,
    BarRect,
    BarLabel,
    ScrollX,
    HeatmapOuter,
    HeatmapHeaderRow,
    HeatmapLabelsCol,
    HeatmapRowLabel,
    HeatmapAxisLabel,
    HeatmapGrid,
    HeatmapCell as SCell,
    HeatmapZeroCell as SZeroCell,
} from "./Styles/style";

/* ========== Card ========== */
export const Card: FC<PropsWithChildren<{ title?: string }>> = ({ title, children }) => (
    <CardContainer>
        {title ? <CardTitle>{title}</CardTitle> : null}
        {children}
    </CardContainer>
);

/* ========== KPI ========== */
export const Kpi: FC<{ label: string; value: string | number; hint?: string }> = ({
    label,
    value,
    hint,
}) => (
    <KpiStack>
        <KpiLabel>{label}</KpiLabel>
        <KpiValue>
            {typeof value === "number" ? new Intl.NumberFormat().format(value) : value}
        </KpiValue>
        {hint ? <KpiHint>{hint}</KpiHint> : null}
    </KpiStack>
);

/* ========== MiniLine ========== */
export const MiniLine: FC<{ data: { x: string; y: number }[]; height?: number }> = ({
    data,
    height = 80,
}) => {
    if (!data.length) return <ChartSvg $height={height} role="img" />;

    const pad = 8;
    const w = Math.max(180, data.length * 24);
    const h = height;
    const ys = data.map((d) => d.y);
    const minY = 0;
    const maxY = Math.max(...ys, 1);
    const sx = (i: number) => pad + (i * (w - pad * 2)) / Math.max(data.length - 1, 1);
    const sy = (y: number) => pad + (h - pad * 2) * (1 - (y - minY) / (maxY - minY));
    const dStr = data.map((p, i) => `${i ? "L" : "M"} ${sx(i).toFixed(2)} ${sy(p.y).toFixed(2)}`).join(" ");

    return (
        <ChartSvg $height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img">
            <AxisLine points={`${pad},${h - pad} ${w - pad},${h - pad}`} />
            <LinePath d={dStr} />
            {data.map((p, i) => (
                <Dot key={i} cx={sx(i)} cy={sy(p.y)} />
            ))}
        </ChartSvg>
    );
};

/* ========== MiniBars ========== */
export const MiniBars: FC<{
  data: { label: string; value: number }[];
  height?: number;
  /** allow horizontal scroll when needed (will auto-fit if it can) */
  scroll?: boolean;
  /** pixel width per column when scroll kicks in */
  minColPx?: number;
}> = ({ data, height = 120, scroll = false, minColPx = 28 }) => {
  if (!data.length) return <BarsGrid $cols={0} $gap={8} $height={height} />;

  const gap = 8;
  const nf = useMemo(() => new Intl.NumberFormat(), []);
  const max = Math.max(...data.map((d) => d.value), 1);

  // When scroll=true, decide at runtime if we actually need to scroll or can fit the bars
  const outerRef = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(true); // default: stretch to width

  useEffect(() => {
    if (!scroll) return;
    const el = outerRef.current;
    if (!el) return;

    const compute = () => {
      const container = el.clientWidth || 0;
      const desired = data.length * minColPx + gap * Math.max(0, data.length - 1);
      setFits(desired <= container);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scroll, data.length, minColPx]);

  const Grid = (
    <BarsGrid
      $cols={data.length}
      $gap={gap}
      $height={height}
      /* If we don't fit, use fixed px columns and natural width to enable smooth horizontal scroll.
         If we fit (or scroll=false), let CSS grid stretch columns to fill available space. */
      style={
        scroll && !fits
          ? {
              width: "max-content",
              gridTemplateColumns: `repeat(${data.length}, ${minColPx}px)`,
            }
          : undefined
      }
    >
      {data.map((d) => (
        <BarCol key={d.label} title={`${d.label}: ${nf.format(d.value)}`}>
          <BarRect $ratio={d.value / max} />
          <BarLabel>{d.label}</BarLabel>
        </BarCol>
      ))}
    </BarsGrid>
  );

  if (scroll) {
    return (
      <ScrollX
        ref={outerRef}
        /* align left when scrolling; when it fits, BarsGrid is 100% width so it fills nicely */
        style={{ justifyContent: fits ? "stretch" as const : "flex-start" }}
      >
        {Grid}
      </ScrollX>
    );
  }

  return Grid;
};

/* ========== Heatmap ========== */
export const Heatmap: React.FC<{
    cells: { weekday: number; hour: number; count: number }[];
    width?: number;        // total grid width in px (default 720)
    height?: number;       // total grid height in px (default 240)
    labelCol?: number;     // px used only for cell-size computation (layout uses auto)
    gap?: number;          // px gap between cells
    headerHeight?: number; // px height for the hour header row
}> = ({
    cells,
    width = 720,
    height = 240,
    labelCol = 48,
    gap = 4,
    headerHeight = 18,
}) => {
        // compute fixed cell size that fits both width and height (similar to original)
        const cols = 25; // 1 label + 24 hours
        const rows = 1 + 7; // header + 7 weekdays
        const cellW = Math.max(8, Math.floor((width - labelCol - gap * (cols - 1)) / 24));
        const cellH = Math.max(8, Math.floor((height - headerHeight - gap * (rows - 1)) / 7));
        const cell = Math.min(cellW, cellH);

        // aggregate counts + max
        const map = new Map<string, number>();
        let max = 1;
        for (const c of cells) {
            const k = `${c.weekday}-${c.hour}`;
            const v = (map.get(k) || 0) + c.count;
            map.set(k, v);
            if (v > max) max = v;
        }
        const labelDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        return (
            <ScrollX>
                <HeatmapOuter>
                    {/* header row */}
                    <div />
                    <HeatmapHeaderRow $cell={cell} $gap={gap}>
                        {Array.from({ length: 24 }).map((_, h) => (
                            <HeatmapAxisLabel key={`h${h}`} $headerH={headerHeight}>
                                {h}
                            </HeatmapAxisLabel>

                        ))}
                    </HeatmapHeaderRow>

                    {/* weekday labels */}
                    <HeatmapLabelsCol>
                        {Array.from({ length: 7 }).map((_, d) => (
                            <HeatmapRowLabel key={`lbl${d}`} $cell={cell}>
                                {labelDay[d]}
                            </HeatmapRowLabel>
                        ))}
                    </HeatmapLabelsCol>

                    {/* grid */}
                    <HeatmapGrid $cell={cell} $gap={gap}>
                        {Array.from({ length: 7 }).map((_, d) =>
                            Array.from({ length: 24 }).map((_, h) => {
                                const v = map.get(`${d}-${h}`) || 0;
                                const alpha = v === 0 ? 0.06 : 0.15 + 0.85 * (v / max);
                                const CellComp = v === 0 ? SZeroCell : SCell;
                                return <CellComp key={`${d}-${h}`} $alpha={alpha} $cell={cell} title={`${labelDay[d]} ${h}:00 → ${v}`} />;
                            })
                        )}
                    </HeatmapGrid>
                </HeatmapOuter>
            </ScrollX>
        );
    };
