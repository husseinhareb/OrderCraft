// Styles/style.tsx
import styled from "styled-components";

/* ===== Card ===== */
export const CardContainer = styled.section`
  border: 1px solid #e5e5e5;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
`;

export const CardTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111;
`;

/* ===== KPI ===== */
export const KpiStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const KpiLabel = styled.div`
  font-size: 12px;
  opacity: 0.7;
`;

export const KpiValue = styled.div`
  font-weight: 700;
  font-size: 22px;
`;

export const KpiHint = styled.div`
  font-size: 12px;
  opacity: 0.6;
`;

/* ===== MiniLine (SVG) ===== */
export const ChartSvg = styled.svg<{ $height: number }>`
  width: 100%;
  height: ${({ $height }) => $height}px;
`;

export const AxisLine = styled.polyline`
  fill: none;
  stroke: #eeeeee;
  stroke-width: 1;
`;

export const LinePath = styled.path`
  fill: none;
  stroke: #111111;
  stroke-width: 2;
`;

/* set r as an SVG attribute (not CSS) */
export const Dot = styled.circle.attrs({ r: 2.5 })`
  fill: #111111;
`;

/* ===== MiniBars ===== */
export const BarsGrid = styled.div<{ $cols: number; $gap: number; $height: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols}, 1fr);
  gap: ${({ $gap }) => $gap}px;
  height: ${({ $height }) => $height}px;
`;

export const BarCol = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`;

export const BarRect = styled.div<{ $ratio: number }>`
  height: ${({ $ratio }) => Math.max(2, $ratio * 100)}%;
  background: #111111;
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

/* 👇 Add prop typing for the transient props you pass */
export const HeatmapRowLabel = styled.div<{ $cell: number }>`
  font-size: 12px;
  opacity: 0.7;
  line-height: ${({ $cell }) => $cell}px;
`;

export const HeatmapAxisLabel = styled.div<{ $headerH: number }>`
  font-size: 10px;
  line-height: ${({ $headerH }) => $headerH}px;
  text-align: center;
`;

export const HeatmapGrid = styled.div<{ $cell: number; $gap: number }>`
  display: grid;
  grid-template-columns: repeat(24, ${({ $cell }) => $cell}px);
  grid-auto-rows: ${({ $cell }) => $cell}px;
  gap: ${({ $gap }) => $gap}px;
`;

export const HeatmapCell = styled.div<{ $alpha: number; $cell: number }>`
  width: ${({ $cell }) => $cell}px;
  height: ${({ $cell }) => $cell}px;
  border-radius: 4px;
  background: ${({ $alpha }) => `rgba(17, 17, 17, ${$alpha})`};
`;

export const HeatmapZeroCell = styled(HeatmapCell)`
  background: rgba(17, 17, 17, 0.06);
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
  color: #444;
  padding: 10px 8px;
  border-bottom: 1px solid #eee;
`;

export const TD = styled.td`
  padding: 10px 8px;
  border-bottom: 1px solid #f3f3f3;
`;

export const TrMuted = styled.tr`
  background: #fafafa;
`;

export const Badge = styled.span<{ $tone?: "neutral" | "success" | "warning" | "danger" }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${({ $tone = "neutral" }) =>
    $tone === "success"
      ? "rgba(16,185,129,0.12)"
      : $tone === "warning"
      ? "rgba(245,158,11,0.12)"
      : $tone === "danger"
      ? "rgba(239,68,68,0.12)"
      : "rgba(17,17,17,0.06)"};
  color: ${({ $tone = "neutral" }) =>
    $tone === "success" ? "#065f46" : $tone === "warning" ? "#92400e" : $tone === "danger" ? "#7f1d1d" : "#333"};
`;

export const Muted = styled.div`
  opacity: 0.6;
`;

export const FinePrint = styled.div`
  font-size: 12px;
  opacity: 0.7;
  margin-top: 8px;
`;

export const FlexRow = styled.div<{ $gap?: number; $align?: string; $justify?: string }>`
  display: flex;
  gap: ${({ $gap = 8 }) => $gap}px;
  align-items: ${({ $align = "center" }) => $align};
  justify-content: ${({ $justify = "flex-start" }) => $justify};
`;

export const H2 = styled.h2`
  margin: 0;
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
    background: rgba(17, 17, 17, 0.06);
  }
`;
