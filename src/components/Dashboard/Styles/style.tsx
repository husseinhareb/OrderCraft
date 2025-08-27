import styled from "styled-components";

/* ===== Card ===== */
export const CardContainer = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 20px ${({ theme }) => theme.colors.softShadow};

  /* Add vertical spacing between everything inside the card,
     and ensure inner content can’t visually spill outside */
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
`;

export const CardTitle = styled.h3`
  margin: 0; /* gap on CardContainer takes care of spacing */
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

/* ===== KPI ===== */
export const KpiStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const KpiLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const KpiValue = styled.div`
  font-weight: 700;
  font-size: 22px;
  color: ${({ theme }) => theme.colors.text};
`;

export const KpiHint = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

/* ===== MiniLine (SVG) ===== */
export const ChartSvg = styled.svg<{ $height: number }>`
  width: 100%;
  height: ${({ $height }) => $height}px;
`;

export const AxisLine = styled.polyline`
  fill: none;
  stroke: ${({ theme }) => theme.colors.line};
  stroke-width: 1;
`;

export const LinePath = styled.path`
  fill: none;
  stroke: ${({ theme }) => theme.colors.text};
  stroke-width: 2;
`;

export const Dot = styled.circle.attrs({ r: 2.5 })`
  fill: ${({ theme }) => theme.colors.text};
`;

/* ===== MiniBars ===== */
export const BarsGrid = styled.div<{ $cols: number; $gap: number; $height: number }>`
  display: grid;
  /* Let columns shrink properly inside containers and never exceed width */
  grid-template-columns: repeat(${({ $cols }) => $cols}, minmax(0, 1fr));
  gap: ${({ $gap }) => $gap}px;
  height: ${({ $height }) => $height}px;
  width: 100%;
  max-width: 100%;
`;

export const BarCol = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-width: 0; /* allow labels to ellipsize */
`;

export const BarRect = styled.div<{ $ratio: number }>`
  height: ${({ $ratio }) => Math.max(2, $ratio * 100)}%;
  background: ${({ theme }) => theme.colors.text};
  border-radius: 6px;
  min-height: 2px;
`;

export const BarLabel = styled.div`
  text-align: center;
  font-size: 10px;
  margin-top: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

/* ===== Heatmap ===== */
export const ScrollX = styled.div`
  width: 100%;
  overflow-x: auto;
  display: flex;
  justify-content: center;

  /* prevent child from pushing outside when very wide */
  max-width: 100%;
`;

export const HeatmapOuter = styled.div`
  display: grid;
  grid-template-columns: auto auto;
  gap: 8px 12px;
  align-items: start;
  width: max-content;
  margin: 0 auto;
`;

export const HeatmapHeaderRow = styled.div<{ $cell: number; $gap: number }>`
  display: grid;
  grid-template-columns: repeat(24, ${({ $cell }) => $cell}px);
  gap: ${({ $gap }) => $gap}px;
  align-items: center;
`;

export const HeatmapLabelsCol = styled.div`
  display: grid;
  grid-auto-rows: minmax(0, 1fr);
  gap: 4px;
  align-content: start;
`;

export const HeatmapRowLabel = styled.div<{ $cell: number }>`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: ${({ $cell }) => $cell}px;
`;

export const HeatmapAxisLabel = styled.div<{ $headerH: number }>`
  font-size: 10px;
  line-height: ${({ $headerH }) => $headerH}px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const HeatmapGrid = styled.div<{ $cell: number; $gap: number }>`
  display: grid;
  grid-template-columns: repeat(24, ${({ $cell }) => $cell}px);
  grid-auto-rows: ${({ $cell }) => $cell}px;
  gap: ${({ $gap }) => $gap}px;
`;

const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
const withAlpha = (color: string, alpha: number) => {
  const a = clamp01(alpha);
  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3 || hex.length === 4) hex = hex.split("").map((c) => c + c).join("");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  const m = color.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\)/i);
  if (m) {
    const [, r, g, b, baseA] = m;
    const ba = baseA ? clamp01(parseFloat(baseA)) : 1;
    return `rgba(${r}, ${g}, ${b}, ${clamp01(a * ba)})`;
  }
  return color;
};

/* ===== Heatmap cells ===== */
export const HeatmapCell = styled.div<{ $alpha: number; $cell: number }>`
  width: ${({ $cell }) => $cell}px;
  height: ${({ $cell }) => $cell}px;
  border-radius: 4px;
  background: ${({ theme, $alpha }) => withAlpha(theme.colors.text, Math.min(0.9, Math.max(0, $alpha)))};
`;

export const HeatmapZeroCell = styled(HeatmapCell)`
  background: ${({ theme }) => withAlpha(theme.colors.text, 0.06)};
`;

/* ===== Misc layout/util ===== */
export const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
`;

export const Grid = styled.div<{ $cols?: number; $gap?: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols = 4 }) => $cols}, minmax(0, 1fr));
  /* Same gap for rows and columns to ensure vertical spacing between cards */
  gap: ${({ $gap = 12 }) => $gap}px;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

export const TH = styled.th`
  text-align: left;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 10px 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};
`;

export const TD = styled.td`
  padding: 10px 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.lineFaint};
`;

export const TrMuted = styled.tr`
  background: ${({ theme }) => theme.colors.subtleBg};
`;

export const Badge = styled.span<{ $tone?: "neutral" | "success" | "warning" | "danger" }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${({ $tone = "neutral", theme }) =>
    $tone === "success"
      ? "rgba(16,185,129,0.12)"
      : $tone === "warning"
      ? "rgba(245,158,11,0.12)"
      : $tone === "danger"
      ? "rgba(239,68,68,0.12)"
      : theme.name === "dark"
      ? "rgba(255,255,255,0.06)"
      : "rgba(17,17,17,0.06)"};
  color: ${({ $tone = "neutral", theme }) =>
    $tone === "success"
      ? theme.name === "dark"
        ? "#34d399"
        : "#065f46"
      : $tone === "warning"
      ? theme.name === "dark"
        ? "#fbbf24"
        : "#92400e"
      : $tone === "danger"
      ? theme.name === "dark"
        ? "#ff6b6b"
        : "#7f1d1d"
      : theme.colors.text};
`;

export const Muted = styled.div`
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const FinePrint = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 8px;
`;

export const FlexRow = styled.div<{ $gap?: number; $align?: string; $justify?: string }>`
  display: flex;
  gap: ${({ $gap = 8 }) => $gap}px;
  align-items: ${({ $align = "center" }) => $align};
  justify-content: ${({ $justify = "flex-start" }) => $justify};
`;

export const H2 = styled.h2`
  margin-top: 20px;
  margin-bottom: 20px;
`;
export const IconButton = styled.button`
  appearance: none;
  border: 0;
  background: transparent;
  font-size: 18px;
  line-height: 1;
  padding: 4px;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`;
