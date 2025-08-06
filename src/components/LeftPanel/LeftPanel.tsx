// /src/components/LeftPanel/LeftPanel.tsx
import type { FC } from "react";
import { Container, Overlay } from "./Styles/style";

type LeftPanelProps = {
  open: boolean;
  onClose: () => void;
};

const LeftPanel: FC<LeftPanelProps> = ({ open, onClose }) => {
  return (
    <>
      <Container id="left-menu" className="left-panel" $open={open}>
        {/* Left Panel Content */}
      </Container>
      <Overlay $open={open} onClick={onClose} aria-hidden={!open} />
    </>
  );
};

export default LeftPanel;
