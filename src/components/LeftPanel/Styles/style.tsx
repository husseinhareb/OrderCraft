// /src/components/LeftPanel/Styles/style.tsx

import { styled } from "styled-components";
export const Container = styled.div<{ $open: boolean }>`
  position: fixed; 
  inset: 0 auto 0 0;
   width: 280px;
    max-width: 80vw;
     height: 100%;
  background: #fff; border-right: 2px solid black;
  transform: translateX(${(p) => (p.$open ? "0" : "-100%")});
  transition: transform 0.3s ease; z-index: 1000; padding: 16px;
`;

export const Overlay = styled.div<{ $open: boolean }>`
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity 0.3s ease; z-index: 999;
`;

export const PlusButton = styled.button`
  position: absolute; right: 16px; bottom: 16px; width: 48px; height: 48px;
  border: 2px solid black; border-radius: 50%; background: #fff; font-size: 28px;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
`;

export const OrdersList = styled.ul`
  list-style: none;
  margin: 45px 0 0 0;
  padding: 0 0 72px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const OrderItem = styled.li`
  padding: 8px 10px;
   border: 1px solid #000;
    border-radius: 6px;
  background: #fff;
    cursor: pointer;

`;

export const Row = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
`;

export const RowTitle = styled.span`
  flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

export const RowActions = styled.div`
  display: flex; gap: 6px;
`;

export const IconButton = styled.button`
  padding: 6px 10px; border: 1px solid #000; border-radius: 6px; background: #fff; cursor: pointer;
  &[data-variant="danger"] { border-color: #c00; color: #c00; }
`;

export const EmptyMsg = styled.li`
color: #666;
padding: 6px 2px;
`;
export const ErrorMsg = styled.li` color: #c00; padding: 6px 2px; `;

export const CheckOrder = styled.input.attrs({type: "checkbox"})`
  
`;