// /src/components/LeftPanel/LeftPanel.tsx
import type { FC } from "react";
import { Container, Overlay, PlusButton } from "./Styles/style";
import { useUIStore } from "../../store/store";

type LeftPanelProps = {
  open: boolean;
  onClose: () => void;
};

const LeftPanel: FC<LeftPanelProps> = ({ open, onClose }) => {
  const openOrderForm = useUIStore((s) => s.openOrderForm);

  return (
    <>
      <Container id="left-menu" className="left-panel" $open={open}>
        {/* Left Panel Content */}

        <PlusButton
          type="button"
          aria-label="Add order"
          title="Add order"
          onClick={openOrderForm}
        >
          +
        </PlusButton>
      </Container>
      <Overlay $open={open} onClick={onClose} aria-hidden={!open} />
    </>
  );
};

export default LeftPanel;
