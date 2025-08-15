import type { DefaultTheme } from "styled-components";

export type ThemeName = "light" | "dark" | "custom";

/** All color tokens your UI uses */
export type ThemeColors = {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  borderStrong: string;
  border: string;
  line: string;
  lineFaint: string;
  overlay: string;
  hover: string;
  softShadow: string;
  primary: string;
  danger: string;
  warning: string;
  success: string;
  subtleBg: string;
};

/** A list to render inputs in Settings and to validate */
export const THEME_KEYS: Array<keyof ThemeColors> = [
  "bg","surface","text","textMuted",
  "borderStrong","border","line","lineFaint",
  "overlay","hover","softShadow",
  "primary","danger","warning","success",
  "subtleBg",
];

export type CustomThemeDTO = {
  base: "light" | "dark";
  colors: Partial<ThemeColors>; // user can provide only what they want
};

export const lightTheme: DefaultTheme = {
  name: "light",
  colors: {
    bg: "#ffffff",
    surface: "#ffffff",
    text: "#111111",
    textMuted: "#555555",
    borderStrong: "#000000",
    border: "#e5e5e5",
    line: "#eeeeee",
    lineFaint: "#f3f3f3",
    overlay: "rgba(0,0,0,0.40)",
    hover: "rgba(17,17,17,0.06)",
    softShadow: "rgba(0,0,0,0.06)",
    primary: "#111111",
    danger: "#cc0000",
    warning: "#f59e0b",
    success: "#10b981",
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

/** Build a DefaultTheme from a name + optional custom overrides */
export function buildTheme(
  name: ThemeName,
  custom?: CustomThemeDTO | null
): DefaultTheme {
  if (name !== "custom" || !custom) {
    return name === "dark" ? darkTheme : lightTheme;
  }
  const base = custom.base === "dark" ? darkTheme : lightTheme;
  // overlay user-provided colors onto the base
  const merged: ThemeColors = { ...base.colors, ...custom.colors };
  return { name: "custom", colors: merged };
}
