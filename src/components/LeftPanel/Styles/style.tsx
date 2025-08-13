// /src/components/LeftPanel/Styles/style.tsx

import { styled } from "styled-components";


export const Container = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--left-panel-width, 0);
  max-width: 80vw;
  height: 100%;
  background: #fff;
  transform: translateX(${(p) => (p.$open ? "0" : "-100%")});
  /* transition: transform 0.1s ease, padding 0.1s ease, border-right 0.1s ease; */
  z-index: 1000;
  border-right: ${(p) => (p.$open ? "2px solid black" : "0")};
  padding: ${(p) => (p.$open ? "16px" : "0")};
  overflow: hidden;
`;

export const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 0;
  bottom: 0;
  /* start just to the right of the left shelf, and stop before the right drawer */
  left: var(--left-panel-width, 0);
  right: var(--right-drawer-width, 0);

  background: rgba(0,0,0,0.4);
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity 0.3s ease;
  z-index: 999; /* below the left panel (1000) */
`;

export const PlusButton = styled.button`
  position: absolute; right: 16px; bottom: 16px; width: 48px; height: 48px;
  border: 2px solid black; border-radius: 50%; background: #fff; font-size: 28px;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
`;

export const OrdersList = styled.ul`
  list-style: none;
  margin: 45px 0 0 0;
  padding: 0 0 72px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const OrderItem = styled.li`
  padding: 8px 10px;
  border: 1px solid #000;
  border-radius: 6px;
  background: #fff;
  transition: opacity 0.2s ease;
  cursor: pointer;
  &[data-done="true"] {
    opacity: 0.6;
  }
`;

export const Row = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
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
  display: flex; gap: 6px;
`;

export const IconButton = styled.button`
  padding: 6px 10px; border: 1px solid #000; border-radius: 6px; background: #fff; cursor: pointer;
  &[data-variant="danger"] { border-color: #c00; color: #c00; }
`;

export const EmptyMsg = styled.li`
color: #666;
padding: 6px 2px;
`;
export const ErrorMsg = styled.li` color: #c00; padding: 6px 2px; `;

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
`;


// ---------- styled components for Settings modal ----------
export const SettingsOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
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
  background: var(--panel-bg, #fff);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
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

  &:hover {
    background: rgba(0, 0, 0, 0.06);
  }
`;
export const SettingsButton = styled(IconButton)`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1; /* above list items within the panel */
`;

export const ChartButton = styled(IconButton)`
  position: absolute;
  top: 8px;
  right: 48px; /* sits to the left of the Settings button */
  z-index: 1;
`;