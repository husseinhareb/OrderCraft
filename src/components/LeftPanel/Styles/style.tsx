// /src/components/LeftPanel/Styles/style.tsx
import { styled } from "styled-components";

export const Container = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0 auto 0 0; /* top:0, right:auto, bottom:0, left:0 */
  width: 280px;
  max-width: 80vw;
  height: 100%;
  background: #fff;
  border-right: 2px solid black;
  transform: translateX(${(p) => (p.$open ? "0" : "-100%")});
  transition: transform 0.3s ease;
  z-index: 1000;
  padding: 16px;
`;

export const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity 0.3s ease;
  z-index: 999;
`;
