// /src/App.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeProvider } from "styled-components";
import { GlobalStyle } from "./styles/GlobalStyle";
import { buildTheme } from "./theme/theme";
import { useStore } from "./store/store";
import "./App.css";

import LeftPanel from "./components/LeftPanel/LeftPanel";
import RightPanel from "./components/RightPanel/RightPanel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

const MENU_ID = "left-menu";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  const themeName = useStore((s) => s.theme);        // "light" | "dark" | "custom"
  const customTheme = useStore((s) => s.customTheme); // { base, colors } | null
  const loadCustomTheme = useStore((s) => s.loadCustomTheme);

  // Ensure custom palette is available on mount (safe no-op for light/dark)
  useEffect(() => {
    loadCustomTheme();
  }, [loadCustomTheme]);

  const theme = useMemo(() => buildTheme(themeName, customTheme), [themeName, customTheme]);

  // Close the menu with Escape for better UX
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <div className="app-container" data-theme={theme.name}>
        {/* Full-height rail with red right border */}
        <aside className="left-rail" aria-label="Primary">
          <button
            type="button"
            className="hamburger"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-controls={MENU_ID}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={toggleMenu}
          >
            <FontAwesomeIcon icon={faBars} style={{ fontSize: 24, margin: 0 }} />
          </button>
        </aside>

        {/* Main area shifts to the right of the rail */}
        <main className="main-area">
          {/* Ensure LeftPanel forwards id to its root DOM element */}
          <LeftPanel id={MENU_ID} open={menuOpen} onClose={() => setMenuOpen(false)} />
          <RightPanel />
        </main>
      </div>
    </ThemeProvider>
  );
}
