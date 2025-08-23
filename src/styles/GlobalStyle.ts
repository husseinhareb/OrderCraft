import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  :root {
    /* Let UA widgets work in both modes; avoids invalid value when theme.name === "custom" */
    color-scheme: light dark;

    /* Shared design tokens */
    --panel-bg: ${({ theme }) => theme.colors.surface};
    --toolbar-top: 16px;         /* single source of truth for top alignment */
    --left-panel-padding: 16px;  /* exposed so calc() can compensate it */
  }

  html, body, #root { height: 100%; }

  *, *::before, *::after { box-sizing: border-box; }

  body {
    margin: 0;
    background: ${({ theme }) => theme.colors.bg};
    color: ${({ theme }) => theme.colors.text};
    transition: background 0.2s ease, color 0.2s ease;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Bridge theme → plain CSS files (e.g., App.css) via CSS variables */
  .app-container {
    --rail-border-color: ${({ theme }) => theme.colors.borderStrong};
    --panel-bg: ${({ theme }) => theme.colors.surface};
  }
`;
