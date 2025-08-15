// /src/components/OrderForm/Styles/style.tsx
import { styled } from "styled-components";

export const Container = styled.div`
  min-height: 100%;
  position: relative;
`;

export const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 0;
  bottom: 0;
  /* don't cover the left shelf or the drawer itself */
  left: var(--left-panel-width, 0);
  right: var(--right-drawer-width, 0);

  background: ${({ theme }) => theme.colors.overlay};
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity 0.3s ease;
  z-index: 1040; /* below Drawer(1050), below OpenedBar(1045) */
`;

/* Slide-in drawer on the right */
export const Drawer = styled.aside<{ $open: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: min(420px, 95vw);
  background: ${({ theme }) => theme.colors.surface};
  border-left: 2px solid ${({ theme }) => theme.colors.borderStrong};
  transform: translateX(${(p) => (p.$open ? "0" : "100%")});
  transition: transform 0.3s ease;
  z-index: 1050;
  box-shadow: -8px 0 24px ${({ theme }) => theme.colors.softShadow};
  display: flex;
  flex-direction: column;

  form {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
`;

export const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderStrong};

  h3 {
    font-size: 18px;
    margin: 0;
    color: ${({ theme }) => theme.colors.text};
  }
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
  border-top: 1px solid ${({ theme }) => theme.colors.borderStrong};
`;

export const Field = styled.div`
  display: grid;
  gap: 6px;
`;

export const Label = styled.label`
  font-size: 14px;
`;

export const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 6px;
  font-size: 14px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
`;

export const Textarea = styled.textarea`
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
`;

export const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 6px;
  font-size: 14px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
`;

export const Button = styled.button<{ variant?: "ghost" }>`
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${(p) =>
    p.variant === "ghost" ? "transparent" : p.theme.colors.primary};
  color: ${(p) =>
    p.variant === "ghost"
      ? p.theme.colors.text
      : p.theme.name === "dark"
      ? "#111"
      : "#fff"};
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background: ${(p) =>
      p.variant === "ghost" ? p.theme.colors.hover : p.theme.colors.primary};
    opacity: ${(p) => (p.variant === "ghost" ? 1 : 0.92)};
  }
`;
