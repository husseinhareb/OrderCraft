// src/components/Dashboard/ui.tsx
import type { FC } from "react";
import React from "react";

export const Card: FC<React.PropsWithChildren<{ title?: string; style?: React.CSSProperties }>> = ({
  title,
  style,
  children,
}) => (
  <section
    style={{
      border: "1px solid #E5E5E5",
      background: "#fff",
      borderRadius: 12,
      padding: 16,
      ...style,
    }}
  >
    {title ? <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>{title}</h3> : null}
    {children}
  </section>
);

export const Kpi: FC<{ label: string; value: string | number; hint?: string }> = ({ label, value, hint }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: 22 }}>{typeof value === "number" ? new Intl.NumberFormat().format(value) : value}</div>
    {hint ? <div style={{ fontSize: 12, opacity: 0.6 }}>{hint}</div> : null}
  </div>
);

export const MiniLine: FC<{ data: { x: string; y: number }[]; height?: number }> = ({
  data,
  height = 80,
}) => {
  if (!data.length) return <div style={{ height }} />;
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
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img">
      <polyline points={`${pad},${h - pad} ${w - pad},${h - pad}`} fill="none" stroke="#eee" strokeWidth={1} />
      <path d={dStr} fill="none" stroke="#111" strokeWidth={2} />
      {data.map((p, i) => <circle key={i} cx={sx(i)} cy={sy(p.y)} r={2.5} />)}
    </svg>
  );
};

export const MiniBars: FC<{ data: { label: string; value: number }[]; height?: number }> = ({
  data,
  height = 120,
}) => {
  if (!data.length) return <div style={{ height }} />;
  const max = Math.max(...data.map((d) => d.value), 1);
  const fmt = new Intl.NumberFormat();
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${data.length}, 1fr)`, gap: 8, height }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div
            title={`${d.label}: ${fmt.format(d.value)}`}
            style={{ height: `${(d.value / max) * 100}%`, background: "#111", borderRadius: 6, minHeight: 2 }}
          />
          <div style={{ textAlign: "center", fontSize: 10, marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {d.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export const Heatmap: React.FC<{
  cells: { weekday: number; hour: number; count: number }[];
  width?: number;        // total grid width in px (default 720)
  height?: number;       // total grid height in px (default 240)
  labelCol?: number;     // px for weekday labels
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
  // compute fixed cell size that fits both width and height
  const cols = 25;      // 1 label + 24 hours
  const rows = 1 + 7;   // header + 7 weekdays
  const cellW = Math.max(8, Math.floor((width - labelCol - gap * (cols - 1)) / 24));
  const cellH = Math.max(8, Math.floor((height - headerHeight - gap * (rows - 1)) / 7));
  const cell = Math.min(cellW, cellH);

  const gridWidthPx  = labelCol + 24 * cell + gap * (cols - 1);
  const gridHeightPx = headerHeight + 7 * cell + gap * (rows - 1);

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
    <div style={{ width: "100%", overflowX: "auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${labelCol}px repeat(24, ${cell}px)`,
          gridTemplateRows: `${headerHeight}px repeat(7, ${cell}px)`,
          gap,
          width: gridWidthPx,
          height: gridHeightPx,
        }}
      >
        {/* header row */}
        <div />
        {Array.from({ length: 24 }).map((_, h) => (
          <div key={`h${h}`} style={{ textAlign: "center", fontSize: 10, lineHeight: `${headerHeight}px` }}>
            {h}
          </div>
        ))}

        {/* weekday rows */}
        {Array.from({ length: 7 }).map((_, d) => (
          <React.Fragment key={`r${d}`}>
            <div style={{ fontSize: 12, opacity: 0.7, lineHeight: `${cell}px` }}>{labelDay[d]}</div>
            {Array.from({ length: 24 }).map((_, h) => {
              const v = map.get(`${d}-${h}`) || 0;
              const alpha = v === 0 ? 0.06 : 0.15 + 0.85 * (v / max);
              return (
                <div
                  key={`${d}-${h}`}
                  title={`${labelDay[d]} ${h}:00 → ${v}`}
                  style={{
                    width: cell,
                    height: cell,
                    borderRadius: 4,
                    background: `rgba(17,17,17,${alpha.toFixed(3)})`,
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};