import "styled-components";

declare module "styled-components" {
  export interface DefaultTheme {
    name: "light" | "dark";
    colors: {
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
  }
}
