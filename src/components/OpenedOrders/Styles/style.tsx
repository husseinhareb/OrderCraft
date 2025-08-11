import { styled } from "styled-components";

export const OpenedBar = styled.div`
  top: 0;
  z-index: 1045;
  background: #fff;
  height: 40px
`;

export const OpenedList = styled.div`
  display: flex;
  flex-wrap: wrap;
  height: 100%;
`;

export const OpenedChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid #000;
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
`;
