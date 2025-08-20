// /src/components/LeftPanel/Styles/style.tsx
import { styled } from "styled-components";

export const Container = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--left-panel-width, 0);
  max-width: 80vw;
  height: 100%;
  background: ${({ theme }) => theme.colors.surface};
  transform: translateX(${(p) => (p.$open ? "0" : "-100%")});
  z-index: 1000;
  border-right: ${(p) => (p.$open ? `2px solid ${p.theme.colors.borderStrong}` : "0")};

  /* use a CSS var for padding so other elements can compensate it */
  padding: ${(p) => (p.$open ? "var(--left-panel-padding, 16px)" : "0")};
  overflow: hidden;

  /* NEW: toolbar sizing (used by buttons + list offset) */
  --toolbar-top: var(--left-panel-padding, 16px);
  --toolbar-height: 36px;
  --toolbar-gap: 12px;
`;

export const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 0;
  bottom: 0;
  /* start just to the right of the left shelf, and stop before the right drawer */
  left: var(--left-panel-width, 0);
  right: var(--right-drawer-width, 0);

  background: ${({ theme }) => theme.colors.overlay};
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity 0.3s ease;
  z-index: 999; /* below the left panel (1000) */
`;

export const PlusButton = styled.button`
  position: absolute;
  right: 16px;
  bottom: 16px;
  width: 48px;
  height: 48px;
  border: 2px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px ${({ theme }) => theme.colors.softShadow};
`;

export const OrdersList = styled.ul`
  position: absolute;
  top: calc(var(--toolbar-top) + var(--toolbar-height) + var(--toolbar-gap));
  right: 16px;
  bottom: 88px; /* clears the floating + button */
  left: 16px;

  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-gutter: stable;
`;


export const OrderItem = styled.li`
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.surface};
  transition: opacity 0.2s ease, background 0.2s ease;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }

  &[data-done="true"] {
    opacity: 0.6;
  }
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

export const RowTitle = styled.span`
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  ${OrderItem}[data-done="true"] & {
    text-decoration: line-through;
  }
`;

export const RowActions = styled.div`
  display: flex;
  gap: 6px;
`;

export const IconButton = styled.button`
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }

  &[data-variant="danger"] {
    border-color: ${({ theme }) => theme.colors.danger};
    color: ${({ theme }) => theme.colors.danger};
  }
`;

export const EmptyMsg = styled.li`
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 6px 2px;
`;

export const ErrorMsg = styled.li`
  color: ${({ theme }) => theme.colors.danger};
  padding: 6px 2px;
`;

export const CheckContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  overflow: hidden;
`;

export const CheckOrder = styled.input.attrs({ type: "checkbox" })`
  position: absolute;
  width: 50px;
  height: 50px;
  inset: 0;
  opacity: 0;
`;

export const CheckLabel = styled.label`
  display: inline-flex;
  align-items: center;
  cursor: pointer;

  svg {
    vertical-align: middle;
  }

  .path1 {
    stroke-dasharray: 400;
    stroke-dashoffset: 400;
    transition: 0.5s all;
  }

  ${CheckOrder}:checked + & svg g path {
    stroke-dashoffset: 0;
  }

  /* make checkbox marks theme-aware */
  svg rect,
  svg g path {
    stroke: ${({ theme }) => theme.colors.text} !important;
  }
`;

/* ---------- styled components for Settings modal ---------- */
export const SettingsOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.colors.overlay};
  z-index: 1300;
`;

export const SettingsModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 95vw;
  height: 95vh;
  overflow: auto;
  background: var(--panel-bg, ${({ theme }) => theme.colors.surface});
  box-shadow: 0 10px 40px ${({ theme }) => theme.colors.softShadow};
  padding: 16px;
  z-index: 1310;
`;

export const SettingsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

export const SettingsTitle = styled.h3`
  margin: 0;
`;

export const CloseBtn = styled.button`
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text};

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`;

export const SettingsButton = styled(IconButton)`
  position: absolute;
  top: var(--toolbar-top);
  right: 8px;
  height: var(--toolbar-height);
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  z-index: 2;
`;

export const ChartButton = styled(IconButton)`
  position: absolute;
  top: var(--toolbar-top);
  right: 48px;
  height: var(--toolbar-height);
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  z-index: 2;
`;