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

  const themeName = useStore((s) => s.theme);
  const customTheme = useStore((s) => s.customTheme);
  const loadCustomTheme = useStore((s) => s.loadCustomTheme);

  useEffect(() => {
    loadCustomTheme();
  }, [loadCustomTheme]);

  const theme = useMemo(() => buildTheme(themeName, customTheme), [themeName, customTheme]);

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
        {/* Full-height rail; border hides when menu is open */}
        <aside className={`left-rail ${menuOpen ? "is-open" : ""}`} aria-label="Primary">
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

        <main className="main-area">
          <LeftPanel open={menuOpen} onClose={() => setMenuOpen(false)} />
          <RightPanel />
        </main>
      </div>
    </ThemeProvider>
  );
}
