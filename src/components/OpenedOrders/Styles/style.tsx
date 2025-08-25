// /src/components/OpenedOrders/Styles/style.tsx
import { styled } from "styled-components";
export const OpenedBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 1045;
  background: ${({ theme }) => theme.colors.surface};
  height: 40px;

  /* dim when left panel is open (values come from App.css) */
  opacity: var(--opened-dim-opacity, 1);
  filter: var(--opened-dim-filter, none);
  transition: opacity 140ms ease, filter 140ms ease;
`;

export const OpenedList = styled.div`
  display: flex;
  flex-wrap: wrap;
  height: 100%;

  /* Draw the trailing underline so the bar spans full width */
  &::after {
    content: "";
    flex: 1 1 auto;
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderStrong};
  }
`;

export const OpenedChip = styled.button`
  display: inline-flex;
  align-items: center;
  height: 100%;                /* align bottom border with the bar line */
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  position: relative;

  /* collapse adjoining borders */
  & + & { margin-left: -1px; }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    z-index: 1;
  }

  .title {
    max-width: 180px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export const CloseChipBtn = styled.button`
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textMuted};

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    border-radius: 6px;
  }
`;
