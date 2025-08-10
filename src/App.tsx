// /src/App.tsx
import { useState } from "react";
import "./App.css";
import LeftPanel from "./components/LeftPanel/LeftPanel";
import RightPanel from "./components/RightPanel/RightPanel";
import { useStore } from "./store/store";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const isDrawerOpen = useStore((s) => s.isOrderFormOpen);

  // tweak as you like
  const LEFT_WIDTH = "20%";
  const RIGHT_DRAWER_OPEN_WIDTH = "420px";

  return (
    <div
      className="app-container"
      style={{
        // left panel
        ["--left-panel-width" as any]: menuOpen ? LEFT_WIDTH : "0",
        // right drawer (two vars: the "open width" and the "current reserved width")
        ["--right-drawer-open-width" as any]: RIGHT_DRAWER_OPEN_WIDTH,
        ["--right-drawer-width" as any]: isDrawerOpen ? RIGHT_DRAWER_OPEN_WIDTH : "0",
      }}
    >
      <LeftPanel open={menuOpen} onClose={() => setMenuOpen(false)} />
      <RightPanel />

      <button
        className="hamburger"
        aria-label="Toggle menu"
        aria-controls="left-menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>
    </div>
  );
}
