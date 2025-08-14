// /src/App.tsx
import { useState } from "react";
import { ThemeProvider } from "styled-components";
import { GlobalStyle } from "./styles/GlobalStyle";
import { lightTheme, darkTheme } from "./theme/theme";
import { useStore } from "./store/store";
import "./App.css";

import LeftPanel from "./components/LeftPanel/LeftPanel";
import RightPanel from "./components/RightPanel/RightPanel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const themeName = useStore((s) => s.theme); // "light" | "dark" from store
  const theme = themeName === "dark" ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <div className="app-container" data-theme={theme.name}>
        <LeftPanel open={menuOpen} onClose={() => setMenuOpen(false)} />
        <RightPanel />
        <button
          className="hamburger"
          aria-label="Toggle menu"
          aria-controls="left-menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <FontAwesomeIcon icon={faBars} style={{ fontSize: 24, margin: 0 }} />
        </button>
      </div>
    </ThemeProvider>
  );
}
