// src/components/DialogueLengthSelector.js
import React from "react";
import styled from "styled-components";

const StyledLabel = styled.label`
  color: var(--color-text-muted);
  font-size: 0.875rem;
`;

const StyledSelect = styled.select`
  width: 100%;
  padding: 1rem;
  background-color: var(--color-dark-bg);
  border: 1px solid var(--color-dark-border);
  border-radius: var(--border-radius-lg);
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23A0AEC0%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13.2-6.5H18.6c-5.4%200-10.7%202-14.1%205.9-4.7%204.6-4.7%2012.3%200%2017.2l132.6%20132.3c4.7%204.7%2012.4%204.7%2017.1%200l132.6-132.3c4.7-5%204.7-12.7%200-17.6z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 1em;
`;

function DialogueLengthSelector({ value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <StyledLabel htmlFor="dialogue-length">Dialogue Length</StyledLabel>
      <StyledSelect id="dialogue-length" value={value} onChange={onChange}>
        <option value="Short">Short (2-5 exchanges)</option>
        <option value="Medium">Medium (6-10 exchanges)</option>
        <option value="Long">Long (11-20+ exchanges)</option>
      </StyledSelect>
    </div>
  );
}

export default DialogueLengthSelector;
