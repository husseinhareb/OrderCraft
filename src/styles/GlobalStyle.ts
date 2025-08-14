import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  :root {
    color-scheme: ${({ theme }) => theme.name};
    --panel-bg: ${({ theme }) => theme.colors.surface};
  }
  html, body, #root {
    height: 100%;
  }
  body {
    margin: 0;
    background: ${({ theme }) => theme.colors.bg};
    color: ${({ theme }) => theme.colors.text};
    transition: background 0.2s ease, color 0.2s ease;
  }
`;
