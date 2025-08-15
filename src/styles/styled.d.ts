// /src/styles/styled.d.ts
import "styled-components";

declare module "styled-components" {
  export interface DefaultTheme {
    /** "light" | "dark" | "custom" */
    name: "light" | "dark" | "custom";
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
