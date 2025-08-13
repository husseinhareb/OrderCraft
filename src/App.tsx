// /src/App.tsx
import { useState } from "react";
import "./App.css";
import LeftPanel from "./components/LeftPanel/LeftPanel";
import RightPanel from "./components/RightPanel/RightPanel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-container">
      <LeftPanel open={menuOpen} onClose={() => setMenuOpen(false)} />
      <RightPanel />
      <button
        className="hamburger"
        aria-label="Toggle menu"
        aria-controls="left-menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <FontAwesomeIcon icon={faBars}/>
      </button>
    </div>
  );
}
