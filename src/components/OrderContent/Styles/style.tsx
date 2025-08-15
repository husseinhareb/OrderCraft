// (rewrite) /src/components/OrderContent/Styles/style.tsx
import { styled } from "styled-components";

export const Wrapper = styled.div`
  padding: 16px 16px 32px;
`;

export const Card = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 20px ${({ theme }) => theme.colors.softShadow};
`;

export const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

export const Title = styled.h2`
  font-size: 20px;
  line-height: 1.2;
  margin: 0;
`;

export const SubTitle = styled.div`
  margin-top: 4px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const Actions = styled.div`
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const ActionBtn = styled.button<{
  "data-variant"?: "primary" | "danger" | "outline" | "ghost";
}>`
  padding: 8px 12px;
  border-radius: 10px;
  border: 1.5px solid ${({ theme }) => theme.colors.borderStrong};
  cursor: pointer;
  background: ${({ theme }) => theme.colors.surface};
  line-height: 1;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};

  &[data-variant="primary"] {
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => (theme.name === "dark" ? "#111" : "#fff")};
  }

  &[data-variant="danger"] {
    border-color: ${({ theme }) => theme.colors.danger};
    color: ${({ theme }) => theme.colors.danger};
    background: ${({ theme }) => theme.colors.surface};
  }

  &[data-variant="outline"] {
    background: ${({ theme }) => theme.colors.surface};
  }

  &[data-variant="ghost"] {
    border-color: transparent;
    padding: 6px 8px;
    background: transparent;
  }
`;

export const BadgeRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
`;

export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px dashed ${({ theme }) => theme.colors.borderStrong};
  border-radius: 9999px;
  font-size: 12px;
  background: ${({ theme }) => theme.colors.subtleBg};
  color: ${({ theme }) => theme.colors.text};
`;

export const Separator = styled.hr`
  border: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.borderStrong};
  margin: 16px 0;
`;

export const MetaGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 12px 16px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const MetaItem = styled.div`
  display: grid;
  grid-template-columns: 110px 1fr;
  align-items: center;
  gap: 8px;

  @media (max-width: 480px) {
    grid-template-columns: 90px 1fr;
  }
`;

export const MetaLabel = styled.dt`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
`;

export const MetaValue = styled.dd`
  margin: 0;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text};

  a {
    color: inherit;
    text-decoration: underline;
  }
`;

export const Description = styled.section`
  p {
    margin: 8px 0 0 0;
    white-space: pre-wrap;
    line-height: 1.5;
  }
`;

export const EmptyState = styled.div`
  border: 1.5px dashed ${({ theme }) => theme.colors.line};
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  background: ${({ theme }) => theme.colors.surface};

  strong {
    display: block;
    margin-bottom: 4px;
  }
  span {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 14px;
  }
`;

export const ErrorBox = styled.div`
  border: 1.5px solid ${({ theme }) => theme.colors.danger};
  background: ${({ theme }) =>
    theme.name === "dark" ? "rgba(255, 107, 107, 0.08)" : "#fff5f5"};
  color: ${({ theme }) => (theme.name === "dark" ? "#ff9b9b" : "#900")};
  border-radius: 12px;
  padding: 12px 14px;
`;
