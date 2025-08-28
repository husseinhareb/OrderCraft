// /src/components/RightPanel/Styles/style.tsx

import { styled } from "styled-components";

export const Container = styled.div`
  position: relative;
  min-height: 100%;
  box-sizing: border-box;
  width: max(
    0px,
    calc(100% - var(--left-panel-width, 0) - var(--right-drawer-width, 0))
  );
  margin-left: var(--left-panel-width, 0);
  transition: width 0.3s ease, margin-left 0.3s ease;
`;
