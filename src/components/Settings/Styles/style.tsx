// /src/components/Settings/Styles/style.tsx
import { styled } from "styled-components";

// ---------- Styles ----------
export const Wrap = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100dvh;
  padding: 10px;
  gap: 15px;
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const Sidebar = styled.nav`
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 720px) {
    flex-direction: row;
    overflow: auto;
  }
`;

export const TabButton = styled.button`
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }

  &[aria-selected="true"] {
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => (theme.name === "dark" ? "#111" : "#fff")};
  }

  @media (max-width: 720px) {
    white-space: nowrap;
  }
`;

export const Content = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 12px;
  padding: 12px;
  background: ${({ theme }) => theme.colors.surface};
  min-height: 60vh;
  box-shadow: 0 4px 20px ${({ theme }) => theme.colors.softShadow};
`;

export const Section = styled.section`
  display: grid;
  gap: 16px;
`;

export const SectionTitle = styled.h3`
  margin: 0 0 4px 0;
`;

export const Field = styled.div`
  display: grid;
  gap: 6px;
  max-width: 520px;
`;
export const PaletteGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  align-items: start;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

/* NEW: a Field variant without the 520px cap */
export const FieldWide = styled(Field)`
  max-width: none;
`;
export const Label = styled.label`
  font-weight: 600;
`;

export const Input = styled.input`
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 8px;
  padding: 8px 10px;
  width: 100%;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
`;

export const Select = styled.select`
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 8px;
  padding: 8px 10px;
  width: 100%;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
`;

export const CheckboxLabel = styled.label`
  display: inline-flex;
  gap: 8px;
  align-items: center;

  input {
    transform: translateY(1px);
  }
`;

export const Actions = styled.div`
  display: flex;
  gap: 8px;
`;

export const PrimaryButton = styled.button`
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => (theme.name === "dark" ? "#111" : "#fff")};
  cursor: pointer;

  &:hover {
    opacity: 0.92;
  }
`;

export const SmallButton = styled.button`
  padding: 6px 8px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }

  &[data-variant="ghost"] {
    border-color: transparent;
    background: transparent;
  }
`;

export const Muted = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 6px 0;
`;

export const Error = styled.p`
  color: ${({ theme }) => theme.colors.danger};
  margin: 6px 0 12px 0;
`;

export const AddRow = styled.form`
  display: flex;
  gap: 8px;
  max-width: 520px;

  @media (max-width: 520px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const List = styled.div`
  display: grid;
  gap: 8px;
`;

export const CompanyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 8px;
  padding: 8px;
  background: ${({ theme }) => theme.colors.surface};
`;

export const InlineWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

export const Name = styled.span`
  font-weight: 600;
`;

export const Spacer = styled.div`
  flex: 1;
`;

export const Tag = styled.span`
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 12px;

  &[data-variant="muted"] {
    opacity: 0.6;
  }
  &[data-variant="ok"] {
  }
`;

export const RadioRow = styled.div`
  display: flex;
  gap: 16px;
`;

export const RadioItem = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

export const Small = styled.div``;
