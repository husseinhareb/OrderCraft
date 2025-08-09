import { styled } from "styled-components";

export const OpenedBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 1010;
  background: #fff;
  border-bottom: 1px solid #000;
  padding: 8px 12px;
`;

export const OpenedList = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const OpenedChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid #000;
  border-radius: 9999px;
  background: #fff;
  cursor: pointer;

  .title {
    max-width: 180px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export const CloseChipBtn = styled.button`
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
`;
