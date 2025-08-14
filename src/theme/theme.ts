import type { DefaultTheme } from "styled-components";

export const lightTheme: DefaultTheme = {
  name: "light",
  colors: {
    // basics
    bg: "#ffffff",
    surface: "#ffffff",
    text: "#111111",
    textMuted: "#555555",

    // borders & lines
    borderStrong: "#000000",
    border: "#e5e5e5",
    line: "#eeeeee",
    lineFaint: "#f3f3f3",

    // states
    overlay: "rgba(0,0,0,0.40)",
    hover: "rgba(17,17,17,0.06)",
    softShadow: "rgba(0,0,0,0.06)",

    // accents
    primary: "#111111",
    danger: "#cc0000",
    warning: "#f59e0b",
    success: "#10b981",

    // subtle surfaces
    subtleBg: "#fafafa",
  },
};

export const darkTheme: DefaultTheme = {
  name: "dark",
  colors: {
    bg: "#0f1115",
    surface: "#151822",
    text: "#f5f7fa",
    textMuted: "#c3c7cf",

    borderStrong: "#f5f7fa",
    border: "#2a2f3a",
    line: "#222634",
    lineFaint: "#1a1e29",

    overlay: "rgba(0,0,0,0.60)",
    hover: "rgba(255,255,255,0.06)",
    softShadow: "rgba(0,0,0,0.25)",

    primary: "#f5f7fa",
    danger: "#ff6b6b",
    warning: "#fbbf24",
    success: "#34d399",

    subtleBg: "#0f1115",
  },
};
