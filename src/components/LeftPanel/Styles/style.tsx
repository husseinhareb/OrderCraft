// /src/components/LeftPanel/Styles/style.tsx
import { styled } from "styled-components";

export const Container = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0 auto 0 0;
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

export const PlusButton = styled.button`
  position: absolute;
  right: 16px;
  bottom: 16px;
  width: 48px;
  height: 48px;
  border: 2px solid black;
  border-radius: 50%;
  background: #fff;
  font-size: 28px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);

  &:hover {
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
  }
`;
