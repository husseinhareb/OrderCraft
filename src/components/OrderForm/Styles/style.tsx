// /src/components/RightPanel/Styles/style.tsx
import { styled } from "styled-components";

export const Container = styled.div`
  min-height: 100%;
  position: relative;
`;

/* NEW: overlay behind the drawer */
export const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity 0.3s ease;
  z-index: 1040; /* below Drawer (1050) */
`;

/* Slide-in drawer on the right */
export const Drawer = styled.aside<{ $open: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: 420px;
  max-width: 95vw;
  background: #fff;
  border-left: 2px solid black;
  transform: translateX(${(p) => (p.$open ? "0" : "100%")});
  transition: transform 0.3s ease;
  z-index: 1050;
  box-shadow: -8px 0 24px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;

  form { height: 100%; display: flex; flex-direction: column; }
`;

export const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #000;
  h3 { font-size: 18px; }
`;

export const DrawerBody = styled.div`
  padding: 16px;
  overflow: auto;
  flex: 1;
  display: grid;
  gap: 12px;
`;

export const DrawerFooter = styled.div`
  padding: 12px 16px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  border-top: 1px solid #000;
`;

export const Field = styled.div` display: grid; gap: 6px; `;
export const Label = styled.label` font-size: 14px; `;
export const Input = styled.input`
  padding: 10px 12px; border: 1px solid #000; border-radius: 6px; font-size: 14px;
`;
export const Textarea = styled.textarea`
  padding: 10px 12px; border: 1px solid #000; border-radius: 6px; font-size: 14px; resize: vertical;
`;
export const Select = styled.select`
  padding: 10px 12px; border: 1px solid #000; border-radius: 6px; font-size: 14px;
`;
export const Button = styled.button<{ variant?: "ghost" }>`
  padding: 10px 14px; border: 1px solid #000;
  background: ${(p) => (p.variant === "ghost" ? "transparent" : "#000")};
  color: ${(p) => (p.variant === "ghost" ? "#000" : "#fff")};
  border-radius: 6px; cursor: pointer;
`;
